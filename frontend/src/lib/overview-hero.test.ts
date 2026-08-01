import { beforeEach, describe, expect, it } from "vitest";

import { AuthenticatorGetInfoResponse } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  AuthenticatorStatus,
  LookupResult,
  MetadataStatement,
  PayloadEntry,
  StatusReport,
} from "../../bindings/github.com/go-ctap/mds/model";
import {
  DeviceIdentityReport,
  DeviceReport,
  DeviceVendor,
} from "../../bindings/github.com/go-ctap/kit/model/report";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";
import { buildOverviewHero } from "$lib/overview-hero";

describe("buildOverviewHero", () => {
  beforeEach(() => setAppLocale("en"));

  it("shows FIDO and FIPS validation from their separate MDS status reports", () => {
    const mds = new LookupResult({
      found: true,
      entry: new PayloadEntry({
        metadataStatement: new MetadataStatement({
          authenticatorGetInfo: new AuthenticatorGetInfoResponse({
            versions: [],
            aaguid: "",
            certifications: {
              "FIPS-CMVP-3": 2,
              "FIPS-CMVP-3-PHY": 3,
            },
          }),
        }),
        statusReports: [
          new StatusReport({
            status: AuthenticatorStatus.AuthenticatorStatusFIDOCertifiedL2,
            effectiveDate: "2026-01-01",
          }),
        ],
      }),
    });

    const facts = buildOverviewHero({ mds }).mdsStatusFacts;

    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "FIDO validation",
          value: "FIDO_CERTIFIED_L2",
          tone: "success",
        }),
        expect.objectContaining({
          label: "FIPS validation",
          value: "FIPS-CMVP-3: L2\nFIPS-CMVP-3-PHY: L3",
          tone: "success",
        }),
      ]),
    );
  });

  it("uses vendor identity for the title and serial while retaining the MDS name", () => {
    const device = new DeviceReport({
      attachment: {
        id: "token-1",
        transport: Mode.ModeHID,
        usb: { product: "Yubico Security Key", vendorId: 0x1050, productId: 0x0407 },
      },
      identity: new DeviceIdentityReport({
        vendor: DeviceVendor.DeviceVendorYubico,
        name: "YubiKey 5C Nano",
        serialNumber: "12345678",
      }),
    });
    const mds = new LookupResult({
      found: true,
      entry: new PayloadEntry({
        metadataStatement: new MetadataStatement({ description: "YubiKey 5 Series" }),
      }),
    });
    const hero = buildOverviewHero({ device, mds });

    expect(hero.title).toBe("YubiKey 5C Nano");
    expect(hero.serialNumber).toBe("12345678");
    expect(hero.subtitle).toBe("YubiKey 5 Series");
  });

  it("leaves the removed vendor firmware badge empty", () => {
    expect(buildOverviewHero({ device: new DeviceReport() }).versionBadge).toBe("");
  });
});
