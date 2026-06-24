import { describe, expect, it, beforeEach } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { CredentialsEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { setAppLocale } from "$lib/i18n";
import { idleLoadState, readyLoadState } from "$lib/load-state";

import { buildPasskeysPresentation } from "./passkeys-presentation";

function envelope(groups: NonNullable<CredentialsEnvelope["result"]>["report"]["groups"] = []): CredentialsEnvelope {
  const totalCredentials = groups.reduce((count, group) => count + (group.credentials?.length ?? 0), 0);
  return {
    operationId: "operation-1",
    sessionId: "session-1",
    kind: OperationKind.OperationListCredentials,
    result: {
      report: {
        device: {
          deviceId: "token-1",
          stableId: true,
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

describe("buildPasskeysPresentation", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  it("summarizes an empty credential inventory", () => {
    const credentials = envelope([]);
    const presentation = buildPasskeysPresentation({
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      envelope: credentials,
      inventoryState: readyLoadState(credentials),
      loading: false,
    });

    expect(presentation.hasReport).toBe(true);
    expect(presentation.emptyInventory).toBe(true);
    expect(presentation.rows).toHaveLength(0);
    expect(presentation.summaryItems.map((item) => item.value)).toContain("0 credentials");
  });

  it("builds grouped credential rows and support badges", () => {
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
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      envelope: credentials,
      inventoryState: idleLoadState(),
      loading: false,
      selectedRowId: "0:0:cafe",
    });

    expect(presentation.rows).toHaveLength(1);
    expect(presentation.rows[0].rpName).toBe("Example (example.com)");
    expect(presentation.rows[0].credentialTransports).toBe("usb, nfc");
    expect(presentation.selectedRow?.credentialIDHex).toBe("cafe");
    expect(presentation.supportItems).toEqual([
      { label: "Credential management", value: true },
      { label: "Preview credential management", value: true },
      { label: "Read-only permission", value: true },
    ]);
  });
});
