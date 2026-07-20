import { act, cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Info as InspectInfo, Result as InspectResult } from "../../bindings/github.com/go-ctap/kit/model/inspect";
import { Finding, Profile, Report, RuleID, SpecificationID, Target } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { InspectEnvelope } from "../../bindings/fidobench/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";
import { errorLoadState } from "$lib/features/overview/state";
import { authenticatorInspection } from "$lib/features/authenticator/state";
import { failureForCode } from "$lib/test-failure";
import { testOverviewAssessment } from "$lib/test-support/overview-facts";
import {
  resetAppStateForTest,
  seedOverviewEnvelopeForTest,
  seedOverviewMDSForTest,
  seedSelectionForTest,
} from "$lib/store-test-utils";

import Overview from "./Overview.svelte";

const controllerMocks = vi.hoisted(() => ({
  reloadOverview: vi.fn(() => Promise.resolve()),
  loadOverviewMDS: vi.fn(() => Promise.resolve(true)),
}));
const toastMocks = vi.hoisted(() => ({ success: vi.fn() }));

vi.mock("$lib/features/overview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/features/overview")>()),
  reloadOverview: controllerMocks.reloadOverview,
  loadOverviewMDS: controllerMocks.loadOverviewMDS,
}));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

const device = new DeviceReport({
  fingerprint: "token-1",
  ordinalAlias: "token-1",
  transport: Mode.ModeHID,
  path: "token-1",
  vendorId: 1,
  productId: 2,
  product: "Test authenticator",
});

function inspectEnvelope(operationId: string, aaguid: string, withFinding = false) {
  return new InspectEnvelope({
    operationId,
    selectionId: "authenticator-1",
    kind: OperationKind.Inspect,
    result: new InspectResult({
      device,
      info: new InspectInfo({
          versions: [Version.FIDO_2_3],
          aaguid,
          options: {},
          assessment: testOverviewAssessment(),
          conformance: new Report({
            target: new Target({
              profile: Profile.ProfileFIDO23,
              specification: SpecificationID.SpecificationCTAP23,
            }),
            advertisedProfiles: [Profile.ProfileFIDO23],
            findings: withFinding
              ? [new Finding({
                  ruleId: RuleID.RuleVersionsRequired,
                  profile: Profile.ProfileFIDO23,
                })]
              : [],
          }),
      }),
    }),
  });
}

describe("Overview", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.reloadOverview.mockClear();
    controllerMocks.loadOverviewMDS.mockClear();
    toastMocks.success.mockClear();
    resetAppStateForTest();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps a typed Inspect error out of the empty state", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedOverviewEnvelopeForTest(new InspectEnvelope({
      operationId: "inspect-error",
      selectionId: "authenticator-1",
      kind: OperationKind.Inspect,
      error: failureForCode(Code.CodePINInvalid),
    }));

    render(Overview);

    expect(screen.getByText("Inspect the authenticator to populate its capability matrix.")).toBeInTheDocument();
    expect(screen.queryByText("The PIN is invalid.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload overview" })).toBeInTheDocument();
  });

  it("keeps a thrown Wails failure out of the empty state", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    authenticatorInspection.set(errorLoadState(failureForCode(Code.CodeTransportFailure)));

    render(Overview);

    expect(screen.getByText("Inspect the authenticator to populate its capability matrix.")).toBeInTheDocument();
    expect(screen.queryByText("Communication with the authenticator failed.")).not.toBeInTheDocument();
  });

  it("forces an MDS refresh and confirms completion", async () => {
    const user = userEvent.setup();
    const aaguid = "00000000-0000-0000-0000-000000000001";
    seedSelectionForTest("token-1", device, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedOverviewEnvelopeForTest(inspectEnvelope("inspect-1", aaguid));

    render(Overview);
    expect(screen.getByRole("button", { name: "Raw JSON" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Reload overview" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh MDS" }));

    await waitFor(() => {
      expect(controllerMocks.loadOverviewMDS).toHaveBeenCalledWith(aaguid, true);
      expect(toastMocks.success).toHaveBeenCalledWith("MDS data refreshed");
    });
  });

  it("keeps degraded Overview errors out of the page", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedOverviewMDSForTest(null, failureForCode(Code.CodeMDSFetchFailed));

    render(Overview);

    expect(screen.getByText("Inspect the authenticator to populate its capability matrix.")).toBeInTheDocument();
    expect(screen.queryByText("Authenticator metadata could not be downloaded.")).not.toBeInTheDocument();
  });

  it("preserves a manual conformance toggle across MDS updates and resets it for a new inspection", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", device, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedOverviewEnvelopeForTest(inspectEnvelope("inspect-1", "00000000-0000-0000-0000-000000000001"));

    render(Overview);

    const expand = screen.getByRole("button", { name: "Expand conformance details" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    await user.click(expand);
    expect(screen.getByRole("button", { name: "Collapse conformance details" })).toHaveAttribute("aria-expanded", "true");

    await act(() => {
      seedOverviewMDSForTest(null, failureForCode(Code.CodeMDSFetchFailed));
    });
    expect(screen.getByRole("button", { name: "Collapse conformance details" })).toHaveAttribute("aria-expanded", "true");

    await act(() => {
      seedOverviewEnvelopeForTest(inspectEnvelope("inspect-2", "00000000-0000-0000-0000-000000000002"));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expand conformance details" })).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("restores the expanded default for findings in a new inspection", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", device, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedOverviewEnvelopeForTest(inspectEnvelope("inspect-1", "00000000-0000-0000-0000-000000000001", true));

    render(Overview);

    const collapse = screen.getByRole("button", { name: "Collapse conformance details" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    await user.click(collapse);
    expect(screen.getByRole("button", { name: "Expand conformance details" })).toHaveAttribute("aria-expanded", "false");

    await act(() => {
      seedOverviewEnvelopeForTest(inspectEnvelope("inspect-2", "00000000-0000-0000-0000-000000000002", true));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Collapse conformance details" })).toHaveAttribute("aria-expanded", "true");
    });
  });
});
