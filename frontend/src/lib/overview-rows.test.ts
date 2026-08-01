import { describe, expect, it } from "vitest";

import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  FactID,
  FactOrigin,
  FactState,
  FactUnit,
  FactValue,
  FactValueKind,
  Info as InspectInfo,
} from "../../bindings/github.com/go-ctap/kit/model/inspect";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import {
  DeviceIdentityReport,
  DeviceReport,
  DeviceVendor,
  DeviceVendorMetadata,
} from "../../bindings/github.com/go-ctap/kit/model/report";
import {
  DeviceInfo as Token2DeviceInfo,
  FIDOVersion as Token2FIDOVersion,
} from "../../bindings/github.com/go-ctap/token2";
import {
  Capability as YubicoCapability,
  DeviceInfo as YubicoDeviceInfo,
  FirmwareVersion as YubicoFirmwareVersion,
  FormFactor as YubicoFormFactor,
} from "../../bindings/github.com/go-ctap/yubico";

import { setAppLocale } from "$lib/i18n";
import { buildOverviewRows } from "$lib/overview-rows";
import { groupOverviewRows } from "$lib/overview-shared";
import { testOverviewAssessment, testOverviewFact } from "$lib/test-support/overview-facts";
import type { OverviewRow } from "$lib/overview-types";

function info(input: Partial<InspectInfo> = {}): InspectInfo {
  return new InspectInfo({
    versions: ["FIDO_2_1" as Version],
    aaguid: "00000000-0000-0000-0000-000000000000",
    assessment: testOverviewAssessment(),
    conformance: new Report(),
    ...input,
  });
}

function booleanFact(
  id: FactID,
  source: string,
  state: FactState,
  origin: FactOrigin,
  boolean: boolean,
) {
  return testOverviewFact(
    id,
    source,
    state,
    origin,
    new FactValue({
      kind: FactValueKind.FactValueBoolean,
      boolean,
    }),
  );
}

function integerFact(
  id: FactID,
  source: string,
  integer: number,
  unit?: FactUnit,
  origin = FactOrigin.FactOriginReported,
) {
  return testOverviewFact(
    id,
    source,
    FactState.FactStateObserved,
    origin,
    new FactValue({
      kind: FactValueKind.FactValueInteger,
      integer,
      unit,
    }),
  );
}

function listFact(id: FactID, source: string, list: string[], state = FactState.FactStateObserved) {
  return testOverviewFact(
    id,
    source,
    state,
    FactOrigin.FactOriginReported,
    new FactValue({
      kind: FactValueKind.FactValueList,
      list,
    }),
  );
}

function rowBySource(rows: OverviewRow[], source: string) {
  const item = rows.find((row) => row.source === source);

  expect(item).toBeDefined();

  return item as OverviewRow;
}

describe("buildOverviewRows", () => {
  it("reads generated option fields through typed option keys", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          booleanFact(
            FactID.FactIDLargeBlobs,
            "options.largeBlobs",
            FactState.FactStateSupported,
            FactOrigin.FactOriginReported,
            true,
          ),
          booleanFact(
            FactID.FactIDSetMinPINLength,
            "options.setMinPINLength",
            FactState.FactStateSupported,
            FactOrigin.FactOriginReported,
            true,
          ),
          booleanFact(
            FactID.FactIDExtensionLargeBlobKey,
            "extensions.largeBlobKey",
            FactState.FactStateSupported,
            FactOrigin.FactOriginDerived,
            true,
          ),
          integerFact(
            FactID.FactIDMaxSerializedLargeBlobArray,
            "maxSerializedLargeBlobArray",
            2048,
            FactUnit.FactUnitBytes,
          ),
        ]),
      }),
    });

    expect(rowBySource(rows, "options.setMinPINLength").status).toBe("supported");
    expect(rowBySource(rows, "extensions.largeBlobKey").status).toBe("supported");
    expect(rowBySource(rows, "options.largeBlobs").value).toContain("2048");
  });

  it("preserves absent versus false option semantics", () => {
    setAppLocale("en");

    const falseRows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          booleanFact(
            FactID.FactIDClientPIN,
            "options.clientPin",
            FactState.FactStateNotConfigured,
            FactOrigin.FactOriginReported,
            false,
          ),
        ]),
      }),
    });
    const absentRows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          booleanFact(
            FactID.FactIDClientPIN,
            "options.clientPin",
            FactState.FactStateUnsupported,
            FactOrigin.FactOriginSpecDefault,
            false,
          ),
        ]),
      }),
    });

    expect(rowBySource(falseRows, "options.clientPin").status).toBe("not configured");
    expect(rowBySource(falseRows, "options.clientPin").value).toBe("PIN not set");
    expect(rowBySource(absentRows, "options.clientPin").status).toBe("unsupported");
    expect(rowBySource(absentRows, "options.clientPin").value).toBe("Default false");
  });

  it("keeps numeric limits informational in the presentation matrix", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          integerFact(
            FactID.FactIDEffectiveMaxMessageSize,
            "maxMsgSize",
            512,
            FactUnit.FactUnitBytes,
          ),
          integerFact(
            FactID.FactIDEffectiveMinPINLength,
            "minPINLength",
            3,
            FactUnit.FactUnitCodePoints,
          ),
          integerFact(
            FactID.FactIDEffectiveMaxPINLength,
            "maxPINLength",
            7,
            FactUnit.FactUnitCodePoints,
          ),
        ]),
      }),
    });

    expect(rowBySource(rows, "maxMsgSize").status).toBe("informational");
    expect(rowBySource(rows, "maxMsgSize").value).toContain("512");
    expect(rowBySource(rows, "minPINLength").status).toBe("informational");
    expect(rowBySource(rows, "minPINLength").value).toContain("3");
    expect(rowBySource(rows, "maxPINLength").status).toBe("informational");
    expect(rowBySource(rows, "maxPINLength").value).toContain("7");

    const defaultRows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          integerFact(
            FactID.FactIDEffectiveMaxMessageSize,
            "maxMsgSize",
            1024,
            FactUnit.FactUnitBytes,
            FactOrigin.FactOriginSpecDefault,
          ),
          integerFact(
            FactID.FactIDEffectiveMaxPINLength,
            "maxPINLength",
            63,
            FactUnit.FactUnitCodePoints,
            FactOrigin.FactOriginSpecDefault,
          ),
        ]),
      }),
    });

    expect(rowBySource(defaultRows, "maxMsgSize").status).toBe("informational");
    expect(rowBySource(defaultRows, "maxPINLength").status).toBe("informational");
  });

  it("keeps extension and certification localization", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          booleanFact(
            FactID.FactIDExtensionCredBlob,
            "extensions.credBlob",
            FactState.FactStateSupported,
            FactOrigin.FactOriginDerived,
            true,
          ),
          listFact(FactID.FactIDCertifications, "certifications", ["FIDO=2"]),
        ]),
      }),
    });

    expect(rowBySource(rows, "extensions.credBlob").status).toBe("supported");
    expect(rowBySource(rows, "certifications").value).toContain("FIDO L1+");
  });

  it("renders every available Yubico provider field from the direct DeviceInfo type", () => {
    setAppLocale("en");
    const device = new DeviceReport({
      identity: new DeviceIdentityReport({
        vendor: DeviceVendor.DeviceVendorYubico,
        name: "YubiKey 5C Nano",
        serialNumber: "12345678",
      }),
      vendorMetadata: new DeviceVendorMetadata({
        yubico: new YubicoDeviceInfo({
          supportedUSBCapabilities:
            YubicoCapability.CapabilityU2F | YubicoCapability.CapabilityCTAP2,
          serial: 12345678,
          enabledUSBCapabilities: YubicoCapability.CapabilityCTAP2,
          formFactor: YubicoFormFactor.FormFactorUSBCNano,
          firmwareVersion: new YubicoFirmwareVersion({ major: 5, minor: 7, build: 1 }),
          autoEjectTimeout: 10,
          challengeResponseTimeout: 20,
          deviceFlags: 0x80,
          fipsCapable: YubicoCapability.CapabilityCTAP2,
          fipsApproved: YubicoCapability.$zero,
          resetBlocked: YubicoCapability.CapabilityU2F,
          unknownFields: { "153": "AQID" },
        }),
      }),
    });

    const rows = buildOverviewRows({ info: info(), device });

    expect(rowBySource(rows, "device.identity.name").value).toBe("YubiKey 5C Nano");
    expect(rowBySource(rows, "device.vendorMetadata.yubico.supportedUSBCapabilities").value).toBe(
      "U2F, CTAP2 (0x0202)",
    );
    expect(rowBySource(rows, "device.vendorMetadata.yubico.formFactor").value).toBe(
      "USB-C Nano (0x04)",
    );
    expect(rowBySource(rows, "device.vendorMetadata.yubico.firmwareVersion").value).toBe("5.7.1");
    expect(rowBySource(rows, "device.vendorMetadata.yubico.deviceFlags").value).toBe("0x80");
    expect(rowBySource(rows, "device.vendorMetadata.yubico.unknownFields.0x99").value).toBe(
      "0x010203",
    );
    expect(groupOverviewRows(rows).some((group) => group.name === "Vendor details")).toBe(true);
  });

  it("renders every available field from the direct Token2 DeviceInfo type", () => {
    setAppLocale("en");
    const device = new DeviceReport({
      identity: new DeviceIdentityReport({
        vendor: DeviceVendor.DeviceVendorToken2,
        name: "Token2 Bio3 Dual A+C PIN+",
        serialNumber: "72103654095303",
      }),
      vendorMetadata: new DeviceVendorMetadata({
        token2: new Token2DeviceInfo({
          serialNumber: "72103654095303",
          release: "R3.2",
          formFactor: "Bio3 Dual A+C PIN+",
          branding: "Token2",
          productId: 0x0102,
          appearance: [1, 2, 3, 4],
          fidoVersion: new Token2FIDOVersion({ major: 2, minor: 1, patch: 0 }),
          interfaceStateKnown: true,
          fidoEnabled: true,
          hotpKeystrokeEnabled: false,
          ccidEnabled: true,
          capabilitiesKnown: true,
          fidoPINSet: true,
          fidoPINLocked: false,
          supportsHOTP: true,
          supportsTOTP: true,
          supportsNFC: true,
          supportsCCID: true,
          supportsFIDO21: true,
          hasFingerprintSensor: true,
          supportsFingerprintRegistration: true,
          supportsMandatoryFingerprint: true,
          otpRequiresFingerprint: true,
          supportsButtonHOTP: true,
          buttonHOTPConfigured: true,
          buttonHOTPSendsEnter: true,
          buttonHOTPRequiresLongPress: true,
          buttonHOTPUsesNumericKeypad: true,
        }),
      }),
    });

    const rows = buildOverviewRows({ info: info(), device });
    const metadataSources = rows
      .map((row) => row.source)
      .filter((source) => source?.startsWith("device.vendorMetadata.token2."));

    expect(metadataSources).toEqual([
      "device.vendorMetadata.token2.serialNumber",
      "device.vendorMetadata.token2.release",
      "device.vendorMetadata.token2.formFactor",
      "device.vendorMetadata.token2.branding",
      "device.vendorMetadata.token2.productId",
      "device.vendorMetadata.token2.appearance",
      "device.vendorMetadata.token2.fidoVersion",
      "device.vendorMetadata.token2.interfaceStateKnown",
      "device.vendorMetadata.token2.fidoEnabled",
      "device.vendorMetadata.token2.hotpKeystrokeEnabled",
      "device.vendorMetadata.token2.ccidEnabled",
      "device.vendorMetadata.token2.capabilitiesKnown",
      "device.vendorMetadata.token2.fidoPINSet",
      "device.vendorMetadata.token2.fidoPINLocked",
      "device.vendorMetadata.token2.supportsHOTP",
      "device.vendorMetadata.token2.supportsTOTP",
      "device.vendorMetadata.token2.supportsNFC",
      "device.vendorMetadata.token2.supportsCCID",
      "device.vendorMetadata.token2.supportsFIDO21",
      "device.vendorMetadata.token2.hasFingerprintSensor",
      "device.vendorMetadata.token2.supportsFingerprintRegistration",
      "device.vendorMetadata.token2.supportsMandatoryFingerprint",
      "device.vendorMetadata.token2.otpRequiresFingerprint",
      "device.vendorMetadata.token2.supportsButtonHOTP",
      "device.vendorMetadata.token2.buttonHOTPConfigured",
      "device.vendorMetadata.token2.buttonHOTPSendsEnter",
      "device.vendorMetadata.token2.buttonHOTPRequiresLongPress",
      "device.vendorMetadata.token2.buttonHOTPUsesNumericKeypad",
    ]);

    expect(rowBySource(rows, "device.vendorMetadata.token2.release").value).toBe("R3.2");
    expect(rowBySource(rows, "device.vendorMetadata.token2.productId").value).toBe("0x0102");
    expect(rowBySource(rows, "device.vendorMetadata.token2.appearance").value).toBe("0x01020304");
    expect(rowBySource(rows, "device.vendorMetadata.token2.fidoVersion").value).toBe("2.1.0");
    expect(rowBySource(rows, "device.vendorMetadata.token2.fidoEnabled").value).toBe("Enabled");
    expect(rowBySource(rows, "device.vendorMetadata.token2.hotpKeystrokeEnabled").value).toBe(
      "Disabled",
    );
    expect(rowBySource(rows, "device.vendorMetadata.token2.fidoPINSet").value).toBe("PIN set");
    expect(rowBySource(rows, "device.vendorMetadata.token2.supportsHOTP").value).toBe("Supported");
    expect(rowBySource(rows, "device.vendorMetadata.token2.hasFingerprintSensor").value).toBe(
      "Supported",
    );
    expect(rowBySource(rows, "device.vendorMetadata.token2.buttonHOTPConfigured").value).toBe(
      "Configured",
    );
  });

  it("does not interpret unknown Token2 state flags as disabled capabilities", () => {
    setAppLocale("en");
    const device = new DeviceReport({
      vendorMetadata: new DeviceVendorMetadata({
        token2: new Token2DeviceInfo({
          serialNumber: "66202208969539",
          release: "R3.3",
          formFactor: "FIDO Card NFC with ISO 7816 PIN+ PIV+",
          branding: "Token2",
        }),
      }),
    });

    const rows = buildOverviewRows({ info: info(), device });

    expect(rowBySource(rows, "device.vendorMetadata.token2.interfaceStateKnown").value).toBe(
      "Not reported",
    );
    expect(rowBySource(rows, "device.vendorMetadata.token2.fidoEnabled").value).toBe(
      "Not reported",
    );
    expect(rowBySource(rows, "device.vendorMetadata.token2.capabilitiesKnown").value).toBe(
      "Not reported",
    );
    expect(rowBySource(rows, "device.vendorMetadata.token2.supportsHOTP").value).toBe(
      "Not reported",
    );
  });
});
