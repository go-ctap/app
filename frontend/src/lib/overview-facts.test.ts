import { describe, expect, it } from "vitest";

import {
  Assessment,
  FactID,
  FactOrigin,
  FactState,
  FactValue,
  FactValueKind,
  Info,
} from "../../bindings/github.com/go-ctap/kit/model/inspect";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";

import { setAppLocale } from "./i18n";
import { buildOverviewFactLookup } from "./overview-facts";
import { buildOverviewRows } from "./overview-rows";
import { buildOverviewHeroSignalGroups } from "./overview-signals";
import { testOverviewAssessment, testOverviewFact } from "./test-support/overview-facts";

describe("Overview fact projection", () => {
  it("uses one Fact state for the matrix and hero regardless of fact order", () => {
    setAppLocale("en");
    const clientPIN = testOverviewFact(
      FactID.FactIDClientPIN,
      "options.clientPin",
      FactState.FactStateNotConfigured,
      FactOrigin.FactOriginReported,
      new FactValue({ kind: FactValueKind.FactValueBoolean, boolean: false }),
    );
    const ordered = testOverviewAssessment([clientPIN]);
    const reversed = new Assessment({ facts: [...ordered.facts].reverse() });
    const info = new Info({
      options: { clientPin: true },
      assessment: reversed,
      conformance: new Report(),
    });
    const facts = buildOverviewFactLookup(info.assessment);

    const matrixRow = buildOverviewRows({ info }, facts).find((row) => row.source === "options.clientPin");
    const heroSignal = buildOverviewHeroSignalGroups(facts)
      .flatMap((group) => group.signals)
      .find((signal) => signal.id === "clientPin");

    expect(matrixRow).toMatchObject({ status: "not configured", value: "PIN not set" });
    expect(heroSignal).toMatchObject({ status: "not configured", statusLabel: "Not configured", value: "false" });

    const orderedSources = buildOverviewRows({ info: new Info({ assessment: ordered, conformance: new Report() }) })
      .map((row) => row.source);
    const reversedSources = buildOverviewRows({ info }, facts).map((row) => row.source);
    expect(reversedSources).toEqual(orderedSources);
  });
});
