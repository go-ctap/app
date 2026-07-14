import { act, cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { InspectInfo, InspectOutput, InspectResult, OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Finding, Profile, Report, RuleID, SpecificationID, Target } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { InspectEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/failure";
import {
  resetAppStateForTest,
  seedOverviewEnvelopeForTest,
  seedOverviewMDSForTest,
  seedSelectionForTest,
} from "$lib/store-test-utils";

import Overview from "./Overview.svelte";

const controllerMocks = vi.hoisted(() => ({
  loadOverview: vi.fn(() => Promise.resolve()),
  loadOverviewMDS: vi.fn(() => Promise.resolve(true)),
}));
const toastMocks = vi.hoisted(() => ({ success: vi.fn() }));

vi.mock("$lib/controller", () => ({
  loadOverview: controllerMocks.loadOverview,
  loadOverviewMDS: controllerMocks.loadOverviewMDS,
}));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

const device = new DeviceReport({
  deviceId: "token-1",
  ordinalAlias: "token-1",
  stableId: true,
  transport: Mode.ModeHID,
  path: "token-1",
  vendorId: 1,
  productId: 2,
  product: "Test authenticator",
});

function inspectEnvelope(operationId: string, aaguid: string, withFinding = false) {
  return new InspectEnvelope({
    operationId,
    sessionId: "session-1",
    kind: OperationKind.OperationInspect,
    result: new InspectOutput({
      result: new InspectResult({
        device,
        info: new InspectInfo({
          versions: [Version.FIDO_2_3],
          aaguid,
          options: {},
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
    }),
  });
}

describe("Overview", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.loadOverview.mockClear();
    controllerMocks.loadOverviewMDS.mockClear();
    toastMocks.success.mockClear();
    resetAppStateForTest();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not own overview autoload lifecycle", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      sessionId: "session-1",
    });

    render(Overview);

    expect(controllerMocks.loadOverview).not.toHaveBeenCalled();
  });

  it("forces an MDS refresh and confirms completion", async () => {
    const user = userEvent.setup();
    const aaguid = "00000000-0000-0000-0000-000000000001";
    seedSelectionForTest("token-1", device, {
      state: "ready",
      sessionId: "session-1",
    });
    seedOverviewEnvelopeForTest(inspectEnvelope("inspect-1", aaguid));

    render(Overview);
    await user.click(screen.getByRole("button", { name: "Refresh MDS" }));

    await waitFor(() => {
      expect(controllerMocks.loadOverviewMDS).toHaveBeenCalledWith(aaguid, true);
      expect(toastMocks.success).toHaveBeenCalledWith("MDS data refreshed");
    });
  });

  it("renders degraded Overview warnings without owning global errors", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      sessionId: "session-1",
    });
    seedOverviewMDSForTest(null, failureForCode(Code.CodeMDSFetchFailed));

    render(Overview);

    expect(screen.getByRole("status")).toHaveTextContent("Authenticator metadata could not be downloaded.");
  });

  it("preserves a manual conformance toggle across MDS updates and resets it for a new inspection", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", device, {
      state: "ready",
      sessionId: "session-1",
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
      sessionId: "session-1",
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
