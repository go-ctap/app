import { act, cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import {
  FactID,
  FactOrigin,
  FactState,
  FactValue,
  FactValueKind,
  Info as InspectInfo,
  Result as InspectResult,
  type Assessment,
} from "../../bindings/github.com/go-ctap/kit/model/inspect";
import { Finding, Profile, Report, RuleID, SpecificationID, Target } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { DeviceIdentity, DeviceReport, Vendor } from "../../bindings/github.com/go-ctap/kit/model/report";
import { InspectEnvelope } from "../../bindings/telesma/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";
import { setAdvancedMode } from "$lib/preferences";
import { errorLoadState } from "$lib/features/overview/state";
import { authenticatorInspection, selectedDevice } from "$lib/features/authenticator/state";
import { failureForCode } from "$lib/test-failure";
import { testOverviewAssessment, testOverviewFact } from "$lib/test-support/overview-facts";
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
  attachment: {
    id: "token-1",
    transport: Mode.ModeHID,
    usb: { product: "Test authenticator", vendorId: 1, productId: 2 },
  },
});

function inspectEnvelope(operationId: string, aaguid: string, withFinding = false, assessment: Assessment = testOverviewAssessment()) {
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
          assessment,
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
    setAdvancedMode(true);
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

  it("uses the practical Overview variant outside advanced mode", () => {
    setAdvancedMode(false);
    seedSelectionForTest("token-1", device, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    const assessment = testOverviewAssessment([
      testOverviewFact(
        FactID.FactIDVersionFIDO23,
        "versions.FIDO_2_3",
        FactState.FactStateSupported,
        FactOrigin.FactOriginDerived,
        new FactValue({ kind: FactValueKind.FactValueBoolean, boolean: true }),
      ),
    ]);
    seedOverviewEnvelopeForTest(inspectEnvelope(
      "inspect-standard",
      "00000000-0000-0000-0000-000000000001",
      false,
      assessment,
    ));

    render(Overview);

    expect(screen.getByRole("heading", { name: "Supports modern FIDO2 sign-in." })).toBeInTheDocument();
    expect(screen.getByText("Key capabilities")).toBeInTheDocument();
    expect(screen.queryByText("CTAP options")).not.toBeInTheDocument();
    expect(screen.queryByText("Capability matrix")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Raw JSON" })).not.toBeInTheDocument();
  });

  it("updates the capability matrix when discovery enrichment arrives after inspection", async () => {
    seedSelectionForTest("token-1", device, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedOverviewEnvelopeForTest(inspectEnvelope("inspect-1", "00000000-0000-0000-0000-000000000001"));
    render(Overview);

    expect(screen.queryByText("72103654095303")).not.toBeInTheDocument();

    await act(() => {
      selectedDevice.set(new DeviceReport({
        ...device,
        identity: new DeviceIdentity({
          vendor: Vendor.VendorToken2,
          model: "Token2 Bio3 Dual A+C PIN+",
          serial: "72103654095303",
          firmware: "R3.2",
        }),
      }));
    });

    expect(screen.getByText("72103654095303")).toBeInTheDocument();
    expect(screen.getByText("R3.2")).toBeInTheDocument();
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
