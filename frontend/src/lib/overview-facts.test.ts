import { describe, expect, it } from "vitest";

import {
  Assessment as InspectAssessment,
  FactID,
  FactOrigin,
  FactState,
  FactValue,
  FactValueKind,
  Info,
} from "../../bindings/github.com/telesma-app/kit/model/inspect";
import { Assessment as ConformanceAssessment } from "../../bindings/github.com/telesma-app/kit/conformance";

import { setAppLocale } from "$lib/i18n";
import { buildOverviewFactLookup } from "$lib/overview-facts";
import { buildOverviewRows } from "$lib/overview-rows";
import { buildOverviewHeroSignalGroups } from "$lib/overview-signals";
import { testOverviewAssessment, testOverviewFact } from "$lib/test-support/overview-facts";

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
    const reversed = new InspectAssessment({ facts: [...ordered.facts].reverse() });
    const info = new Info({
      options: { clientPin: true },
      assessment: reversed,
      conformance: new ConformanceAssessment(),
    });
    const facts = buildOverviewFactLookup(info.assessment);

    const matrixRow = buildOverviewRows({ info }, facts).find(
      (row) => row.source === "options.clientPin",
    );
    const heroSignal = buildOverviewHeroSignalGroups(facts)
      .flatMap((group) => group.signals)
      .find((signal) => signal.id === "clientPin");

    expect(matrixRow).toMatchObject({ status: "not configured", value: "PIN not set" });
    expect(heroSignal).toMatchObject({
      status: "not configured",
      statusLabel: "Not configured",
      value: "false",
    });

    const orderedSources = buildOverviewRows({
      info: new Info({ assessment: ordered, conformance: new ConformanceAssessment() }),
    }).map((row) => row.source);
    const reversedSources = buildOverviewRows({ info }, facts).map((row) => row.source);

    expect(reversedSources).toEqual(orderedSources);
  });
});
