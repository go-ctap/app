import { beforeEach, describe, expect, it } from "vitest";

import { AuthenticatorGetInfoResponse } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  AuthenticatorStatus,
  LookupResult,
  MetadataStatement,
  PayloadEntry,
  StatusReport,
} from "../../bindings/github.com/go-ctap/mds/model";
import { DeviceMetadata, DeviceReport, Vendor } from "../../bindings/github.com/go-ctap/kit/model/report";

import { setAppLocale } from "./i18n";
import { buildOverviewHero } from "./overview-hero";

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

    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "FIDO validation", value: "FIDO_CERTIFIED_L2", tone: "success" }),
      expect.objectContaining({ label: "FIPS validation", value: "FIPS-CMVP-3: L2\nFIPS-CMVP-3-PHY: L3", tone: "success" }),
    ]));
  });

  it("prefers the normalized vendor model over the discovery product", () => {
    const device = new DeviceReport({
      fingerprint: "token-1",
      product: "Yubico Security Key",
      vendor: Vendor.VendorYubico,
      metadata: new DeviceMetadata({ model: "YubiKey 5C NFC" }),
    });

    expect(buildOverviewHero({ device }).title).toBe("YubiKey 5C NFC");
  });

  it("shows vendor firmware instead of a generic authenticator-ready badge", () => {
    const yubico = new DeviceReport({
      vendor: Vendor.VendorYubico,
      metadata: new DeviceMetadata({ firmware: "5.7.1" }),
    });
    const token2 = new DeviceReport({
      vendor: Vendor.VendorToken2,
      metadata: new DeviceMetadata({ model: "Token2 Bio3 Dual A+C PIN+ R3.2", firmware: "R3.2" }),
    });
    const other = new DeviceReport({
      vendor: Vendor.VendorUnknown,
      metadata: new DeviceMetadata({ firmware: "1.0" }),
    });

    expect(buildOverviewHero({ device: yubico }).versionBadge).toBe("Firmware 5.7.1");
    expect(buildOverviewHero({ device: token2 }).title).toBe("Token2 Bio3 Dual A+C PIN+");
    expect(buildOverviewHero({ device: token2 }).versionBadge).toBe("Revision R3.2");
    expect(buildOverviewHero({ device: other }).versionBadge).toBe("");
  });
});
