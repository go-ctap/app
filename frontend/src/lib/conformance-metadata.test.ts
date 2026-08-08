import { describe, expect, it } from "vitest";

import {
  AuthenticatorGetInfoResponse,
  UserVerify,
  Version,
} from "../../bindings/github.com/telesma-app/ctap/protocol";
import {
  LookupResult,
  MetadataStatement,
  PayloadEntry,
} from "../../bindings/github.com/telesma-app/mds/model";

import { buildCTAP23Metadata } from "$lib/conformance-metadata";

describe("CTAP 2.3 conformance metadata", () => {
  it("requires a verified MDS statement with authenticator GetInfo", () => {
    expect(buildCTAP23Metadata(null)).toBeNull();
    expect(buildCTAP23Metadata(new LookupResult({ found: false }))).toBeNull();
    expect(
      buildCTAP23Metadata(new LookupResult({ found: true, entry: new PayloadEntry() })),
    ).toBeNull();
  });

  it("preserves exact GetInfo field presence and combines MDS verification methods", () => {
    const getInfo = new AuthenticatorGetInfoResponse({
      versions: [Version.FIDO_2_3],
      extensions: [],
      aaguid: "00000000-0000-0000-0000-000000000001",
      options: {},
      forcePINChange: false,
      encIdentifier: "identifier",
    });
    const lookup = new LookupResult({
      found: true,
      source: "FIDO MDS",
      entry: new PayloadEntry({
        metadataStatement: new MetadataStatement({
          authenticatorGetInfo: getInfo,
          userVerificationDetails: [
            [{ userVerificationMethod: "presence_internal" }],
            [{ userVerificationMethod: "passcode_external" }],
          ],
        }),
      }),
    });

    const metadata = buildCTAP23Metadata(lookup);

    expect(metadata?.getInfo).toBe(getInfo);
    expect(metadata?.getInfoFields).toEqual([1, 2, 3, 4, 12, 25]);
    expect(metadata?.userVerificationMethods).toBe(
      UserVerify.UserVerifyPresenceInternal | UserVerify.UserVerifyPasscodeExternal,
    );
  });
});
