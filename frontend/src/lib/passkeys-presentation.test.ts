import { describe, expect, it, beforeEach } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { CredentialsEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-failure";
import { emptyPasskeysInventoryState, type PasskeysInventoryState } from "$lib/features/passkeys/state";

import { buildPasskeyRows, buildPasskeysPresentation } from "./passkeys-presentation";

function envelope(groups: NonNullable<CredentialsEnvelope["result"]>["report"]["groups"] = []): CredentialsEnvelope {
  const totalCredentials = groups.reduce((count, group) => count + (group.credentials?.length ?? 0), 0);
  return {
    operationId: "operation-1",
    selectionId: "authenticator-1",
    kind: OperationKind.OperationListCredentials,
    result: {
      report: {
        device: {
          fingerprint: "token-1",
        },
        support: {
          credentialManagement: true,
          previewOnly: true,
          readOnlyPermission: true,
        },
        summary: {
          existingResidentCredentialsCount: totalCredentials,
          maxPossibleRemainingResidentCredentialsCount: 7,
          totalRPs: groups.length,
          totalCredentials,
        },
        groups,
      },
    },
  } as CredentialsEnvelope;
}

function inventoryState(credentials: CredentialsEnvelope): PasskeysInventoryState {
  return {
    ...emptyPasskeysInventoryState(),
    phase: "ready",
    lastSuccessfulEnvelope: credentials,
    responseEnvelope: credentials,
    lastSuccessfulAt: "2026-06-22T00:00:00.000Z",
  };
}

const defaultView = {
  query: "",
  statusFilter: "all" as const,
  selectedCredentialID: "",
};

describe("buildPasskeysPresentation", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  it("summarizes an empty credential inventory", () => {
    const credentials = envelope([]);
    const presentation = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
    });

    expect(presentation.hasReport).toBe(true);
    expect(presentation.emptyInventory).toBe(true);
    expect(presentation.rows).toHaveLength(0);
  });

  it("builds flat credential rows", () => {
    const credentials = envelope([{
      rpID: "example.com",
      rpName: "Example",
      rpIDHashHex: "abcd",
      credentials: [{
        credentialIDHex: "cafe",
        credentialType: "public-key",
        credentialTransports: ["usb", "nfc"],
        userIDHex: "01",
        userName: "user@example.com",
        displayName: "Example User",
        largeBlobKeyState: "available",
        credProtect: 2,
        thirdPartyPayment: true,
      }],
    }]);
    const presentation = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
      selectedCredentialID: "cafe",
    });

    expect(presentation.rows).toHaveLength(1);
    expect(presentation.rows[0].rpName).toBe("Example");
    expect(presentation.rows[0].rpID).toBe("example.com");
    expect(presentation.rows[0].credentialTransports).toBe("usb, nfc");
    expect(presentation.rows[0].credProtect).toBe("Level 2 · UV optional with credential list");
    expect(presentation.rows[0].raw.relyingParty).toEqual({
      rpID: "example.com",
      rpName: "Example",
      rpIDHashHex: "abcd",
    });
    expect(presentation.rows[0].raw.relyingParty).not.toHaveProperty("credentials");
    expect(presentation.selectedCredentialID).toBe("cafe");
  });

  it("searches every RP and credential identity field and applies status filters", () => {
    const credentials = envelope([{
      rpID: "payments.example",
      rpName: "Payments",
      rpIDHashHex: "AABB",
      credentials: [{
        credentialIDHex: "CAFE",
        userIDHex: "0102",
        userName: "billing@example.com",
        displayName: "Billing Admin",
        largeBlobKeyState: "available",
        credProtect: 3,
        thirdPartyPayment: true,
      }],
    }]);

    for (const query of [
      "payments",
      "payments.example",
      "aabb",
      "cafe",
      "0102",
      "billing@example.com",
      "billing admin",
    ]) {
      const match = buildPasskeysPresentation({
        ...defaultView,
        selectedSelector: "token-1",
        selectedDevice: null,
        authenticatorBusy: false,
        authenticatorReady: true,
        inventoryState: inventoryState(credentials),
        query,
        statusFilter: "cred-protect-3",
      });
      expect(match.rows.map((row) => row.id), query).toEqual(["CAFE"]);
    }

    const missingBlob = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
      statusFilter: "large-blob-missing",
    });
    expect(missingBlob.emptyFilteredResult).toBe(true);
  });

  it("calculates capacity as an explicitly estimated upper bound", () => {
    const credentials = envelope([]);
    credentials.result!.report.summary.existingResidentCredentialsCount = 3;
    credentials.result!.report.summary.maxPossibleRemainingResidentCredentialsCount = 9;
    const presentation = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
    });
    expect(presentation.capacity).toEqual({
      stored: 3,
      remainingUpperBound: 9,
      estimatedTotal: 12,
      percentage: 25,
    });
  });

  it("implements every status filter against generated credential fields", () => {
    const credentials = envelope([{
      rpID: "example.test",
      credentials: [
        { credentialIDHex: "one", largeBlobKeyState: "available", credProtect: 1 },
        { credentialIDHex: "two", largeBlobKeyState: "missing", credProtect: 2 },
        { credentialIDHex: "three", credProtect: 3, thirdPartyPayment: true },
        { credentialIDHex: "none" },
      ],
    }]);
    const report = credentials.result!.report;
    const ids = (filter: Parameters<typeof buildPasskeyRows>[2]) => buildPasskeyRows(report, "", filter)
      .map((row) => row.id);

    expect(ids("all")).toEqual(["one", "two", "three", "none"]);
    expect(ids("large-blob-available")).toEqual(["one"]);
    expect(ids("large-blob-missing")).toEqual(["two"]);
    expect(ids("third-party-payment")).toEqual(["three"]);
    expect(ids("cred-protect-1")).toEqual(["one"]);
    expect(ids("cred-protect-2")).toEqual(["two"]);
    expect(ids("cred-protect-3")).toEqual(["three"]);
    expect(ids("cred-protect-not-reported")).toEqual(["none"]);
  });

  it("keeps the selected credential while filters temporarily hide its row", () => {
    const credentials = envelope([{
      rpID: "example.test",
      credentials: [{ credentialIDHex: "one", displayName: "Selected User" }],
    }]);
    const filtered = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
      query: "no match",
      selectedCredentialID: "one",
    });

    expect(filtered.rows).toHaveLength(0);
    expect(filtered.selectedCredentialID).toBe("one");

    const restored = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
      selectedCredentialID: filtered.selectedCredentialID,
    });

    expect(restored.rows.map((row) => row.id)).toEqual(["one"]);
  });

  it("gates preview-only updates without treating read-only listing permission as mutation blocking", () => {
    const credentials = envelope([{
      rpID: "example.test",
      credentials: [{ credentialIDHex: "one" }],
    }]);
    const previewOnly = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
    });

    expect(previewOnly.updateDisabled).toBe(true);
    expect(previewOnly.deleteDisabled).toBe(false);

    credentials.result!.report.support.previewOnly = false;
    credentials.result!.report.support.readOnlyPermission = true;
    const readOnlyListing = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: inventoryState(credentials),
    });
    expect(readOnlyListing.updateDisabled).toBe(false);
    expect(readOnlyListing.deleteDisabled).toBe(false);
  });

  it("keeps reload available for authenticator recovery while blocking mutations", () => {
    const credentials = envelope([{
      rpID: "example.test",
      credentials: [{ credentialIDHex: "one" }],
    }]);
    credentials.result!.report.support.previewOnly = false;

    const presentation = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: false,
      inventoryState: inventoryState(credentials),
      selectedCredentialID: "one",
    });

    expect(presentation.reloadDisabled).toBe(false);
    expect(presentation.updateDisabled).toBe(true);
    expect(presentation.deleteDisabled).toBe(true);
  });

  it("keeps last-known-good rows and actions available after a failed refresh", () => {
    const credentials = envelope([{
      rpID: "example.test",
      credentials: [{ credentialIDHex: "one" }],
    }]);
    credentials.result!.report.support.previewOnly = false;
    const state: PasskeysInventoryState = {
      ...inventoryState(credentials),
      phase: "error",
      responseEnvelope: null,
      runtimeError: failureForCode(Code.CodeTransportFailure),
    };
    const presentation = buildPasskeysPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: state,
    });

    expect(presentation.stale).toBe(true);
    expect(presentation.unsupported).toBe(false);
    expect(presentation.rows.map((row) => row.id)).toEqual(["one"]);
    expect(presentation.updateDisabled).toBe(false);
    expect(presentation.deleteDisabled).toBe(false);
    expect(presentation.reloadDisabled).toBe(false);
  });
});
