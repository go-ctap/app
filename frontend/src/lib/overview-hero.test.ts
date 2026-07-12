import { beforeEach, describe, expect, it } from "vitest";

import { AuthenticatorGetInfoResponse } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  AuthenticatorStatus,
  LookupResult,
  MetadataStatement,
  PayloadEntry,
  StatusReport,
} from "../../bindings/github.com/go-ctap/kit/model/mds";

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
});
