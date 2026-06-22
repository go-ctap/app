import { describe, expect, it } from "vitest";
import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { CommonValueID, FindingID, FindingValueKind } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { buildOverviewConformanceWarnings } from "./overview-conformance";
import { CTAP_CONFORMANCE_FINDING_IDS, localizeCtapWarning } from "./overview-i18n";

describe("buildOverviewConformanceWarnings", () => {
  it("localizes backend-provided conformance findings", () => {
    const warnings = buildOverviewConformanceWarnings({
      info: {
        versions: ["FIDO_2_1" as Version],
        aaguid: "00000000-0000-0000-0000-000000000000",
        conformanceFindings: [
          {
            id: FindingID.FindingCTAP23PinProtocolTwo,
            source: "pinUvAuthProtocols",
            value: {
              kind: FindingValueKind.FindingValueList,
              items: [1],
            },
            args: { field: "pinUvAuthProtocols", protocol: 2 },
          },
          {
            id: FindingID.FindingVersionsRequired,
            source: "versions",
            value: {
              kind: FindingValueKind.FindingValueCommon,
              id: CommonValueID.CommonValueNotReported,
            },
            args: { field: "versions" },
          },
        ],
      },
    });

    expect(warnings.map((warning) => warning.id)).toEqual(["ctap23_pin_protocol_two", "versions_required"]);
    expect(warnings[0].source).toBe("pinUvAuthProtocols");
  });

  it("localizes every backend conformance finding id", () => {
    for (const id of CTAP_CONFORMANCE_FINDING_IDS) {
      const warning = localizeCtapWarning({
        id: id as FindingID,
        source: "source",
        value: { kind: FindingValueKind.FindingValueLiteral, value: "reported" },
        args: {
          command: "setMinPINLength",
          extension: "minPinLength",
          field: "field",
          minimum: 1,
          option: "authnrCfg",
          protocol: 2,
          version: "FIDO_2_2",
        },
      });

      expect(warning.id).toBe(id);
      expect(warning.name).not.toBe("");
      expect(warning.description).not.toBe("");
      expect(warning.value).not.toBe("");
    }
  });
});
