import { describe, expect, it } from "vitest";

import { ExtensionIdentifier } from "../../bindings/github.com/go-ctap/ctap/extension";
import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { InspectInfo } from "../../bindings/github.com/go-ctap/kit/model";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";

import { setAppLocale } from "./i18n";
import { buildOverviewRows } from "./overview-rows";
import type { OverviewRow } from "./overview-types";

function info(input: Partial<InspectInfo> = {}): InspectInfo {
  return {
    versions: ["FIDO_2_1" as Version],
    aaguid: "00000000-0000-0000-0000-000000000000",
    conformance: new Report(),
    ...input,
  };
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
        options: {
          largeBlobs: true,
          setMinPINLength: true,
        },
        extensions: [ExtensionIdentifier.ExtensionIdentifierLargeBlobKey],
        maxSerializedLargeBlobArray: 2048,
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
        options: {
          clientPin: false,
        },
      }),
    });
    const absentRows = buildOverviewRows({
      info: info({
        options: {},
      }),
    });

    expect(rowBySource(falseRows, "options.clientPin").status).toBe("not configured");
    expect(rowBySource(falseRows, "options.clientPin").value).toBe("PIN not set");
    expect(rowBySource(absentRows, "options.clientPin").status).toBe("unsupported");
    expect(rowBySource(absentRows, "options.clientPin").value).toBe("Absent");
  });

  it("keeps numeric limits informational in the presentation matrix", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        options: {
          clientPin: true,
        },
        maxMsgSize: 512,
        minPINLength: 3,
        maxPINLength: 7,
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
        options: {
          clientPin: true,
        },
      }),
    });

    expect(rowBySource(defaultRows, "maxMsgSize").status).toBe("informational");
    expect(rowBySource(defaultRows, "maxPINLength").status).toBe("informational");
  });

  it("keeps extension and certification localization", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        extensions: [ExtensionIdentifier.ExtensionIdentifierCredentialBlob],
        certifications: {
          FIDO: 2,
        },
      }),
    });

    expect(rowBySource(rows, "extensions.credBlob").status).toBe("supported");
    expect(rowBySource(rows, "certifications").value).toContain("FIDO L1+");
  });
});
