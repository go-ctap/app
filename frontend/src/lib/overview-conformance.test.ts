import { describe, expect, it } from "vitest";

import { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  Evidence,
  EvidenceGapID,
  EvidenceState,
  Expectation,
  ExpectationKind,
  ExpectationQuantifier,
  Finding,
  Inconclusive,
  Profile,
  Report,
  RequirementLevel,
  RequirementRef,
  RuleID,
  SpecificationID,
  Target,
} from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Assessment } from "../../bindings/github.com/go-ctap/kit/model/inspect";

import { buildOverviewConformancePresentation } from "$lib/overview-conformance";
import { localizeCtapAssessment } from "$lib/overview-i18n";

const fido21Target = new Target({
  specification: SpecificationID.SpecificationCTAP21,
  profile: Profile.ProfileFIDO21,
});

function infoWith(report: Report, versions: Version[] = [Version.FIDO_2_1]) {
  return {
    versions,
    aaguid: "00000000-0000-0000-0000-000000000000",
    assessment: new Assessment(),
    conformance: report,
  };
}

function localizedFinding(ruleId = RuleID.RuleProfilePinUVProtocolTwoRequired) {
  return new Finding({
    ruleId,
    profile: Profile.ProfileFIDO21,
    expectations: [
      new Expectation({
        subjects: ["pinUvAuthProtocols"],
        quantifier: ExpectationQuantifier.ExpectationAll,
        kind: ExpectationKind.ExpectationContains,
        values: ["2"],
      }),
    ],
    evidence: [
      new Evidence({
        path: "pinUvAuthProtocols",
        state: EvidenceState.EvidenceValue,
        values: ["1"],
      }),
    ],
    references: [
      new RequirementRef({
        id: "ctap-2.1-profile-pin-protocol-two",
        specification: SpecificationID.SpecificationCTAP21,
        section: "9",
        clause: "FIDO_2_1",
        url: "https://fidoalliance.org/specs/fido-v2.1-ps-20210615/fido-client-to-authenticator-protocol-v2.1-ps-20210615.html",
        level: RequirementLevel.RequirementMust,
      }),
    ],
  });
}

function localizedInconclusive() {
  return new Inconclusive({
    ruleId: RuleID.RuleProfileRKCredentialManagementRequired,
    profile: Profile.ProfileFIDO21,
    reason: EvidenceGapID.EvidenceGapAuthenticatorUIUnknown,
    expectations: [
      new Expectation({
        subjects: ["options.credMgmt", "options.credentialMgmtPreview"],
        quantifier: ExpectationQuantifier.ExpectationAny,
        kind: ExpectationKind.ExpectationTrue,
      }),
    ],
    evidence: [
      new Evidence({
        path: "options.credMgmt",
        state: EvidenceState.EvidenceAbsent,
      }),
      new Evidence({
        path: "options.credentialMgmtPreview",
        state: EvidenceState.EvidenceAbsent,
      }),
    ],
    references: [],
  });
}

describe("buildOverviewConformancePresentation", () => {
  it("returns null when inspection info is unavailable", () => {
    expect(buildOverviewConformancePresentation()).toBeNull();
  });

  it("presents a clean targeted report as passed", () => {
    const presentation = buildOverviewConformancePresentation({
      info: infoWith(new Report({ target: fido21Target })),
    });

    expect(presentation).toEqual({
      status: "passed",
      target: fido21Target,
      assessments: [],
      findingCount: 0,
      inconclusiveCount: 0,
    });
  });

  it("presents and localizes findings", () => {
    const presentation = buildOverviewConformancePresentation({
      info: infoWith(
        new Report({
          target: fido21Target,
          findings: [localizedFinding()],
        }),
      ),
    });

    expect(presentation).toMatchObject({
      status: "findings",
      target: fido21Target,
      findingCount: 1,
      inconclusiveCount: 0,
    });
    expect(presentation?.assessments[0]).toMatchObject({
      kind: "finding",
      profile: Profile.ProfileFIDO21,
      source: "pinUvAuthProtocols",
      references: [{ specification: SpecificationID.SpecificationCTAP21 }],
    });
    expect(presentation?.assessments[0].expectations[0]).toContain("2");
    expect(presentation?.assessments[0].evidence[0]).toContain("1");
  });

  it("gives findings precedence in a mixed report", () => {
    const presentation = buildOverviewConformancePresentation({
      info: infoWith(
        new Report({
          target: fido21Target,
          findings: [localizedFinding()],
          inconclusive: [localizedInconclusive()],
        }),
      ),
    });

    expect(presentation).toMatchObject({
      status: "findings",
      findingCount: 1,
      inconclusiveCount: 1,
    });
    expect(presentation?.assessments.map((assessment) => assessment.id)).toEqual([
      RuleID.RuleProfilePinUVProtocolTwoRequired,
      RuleID.RuleProfileRKCredentialManagementRequired,
    ]);
    expect(presentation?.assessments[1]).toMatchObject({
      kind: "inconclusive",
      profile: Profile.ProfileFIDO21,
      source: "options.credMgmt + options.credentialMgmtPreview",
    });
    expect(presentation?.assessments[1].reason).not.toBe("");
  });

  it("presents an inconclusive-only report", () => {
    const presentation = buildOverviewConformancePresentation({
      info: infoWith(
        new Report({
          target: fido21Target,
          inconclusive: [localizedInconclusive()],
        }),
      ),
    });

    expect(presentation).toMatchObject({
      status: "inconclusive",
      target: fido21Target,
      findingCount: 0,
      inconclusiveCount: 1,
    });
    expect(presentation?.assessments).toHaveLength(1);
    expect(presentation?.assessments[0].kind).toBe("inconclusive");
  });

  it("makes an unresolved target explicit instead of presenting a clean report", () => {
    const presentation = buildOverviewConformancePresentation({
      info: infoWith(
        new Report({
          advertisedProfiles: [Profile.ProfileU2FV2],
        }),
        [Version.U2F_V2],
      ),
    });

    expect(presentation).toMatchObject({
      status: "unresolved",
      target: null,
      findingCount: 0,
      inconclusiveCount: 0,
    });
    expect(presentation?.assessments).toHaveLength(1);
    expect(presentation?.assessments[0]).toMatchObject({
      id: "target_unresolved",
      kind: "unresolved",
      profile: null,
      source: "versions",
      expectations: [],
      references: [],
    });
    expect(presentation?.assessments[0].evidence[0]).toContain("U2F_V2");
  });

  it("localizes every typed conformance rule id", () => {
    for (const ruleId of Object.values(RuleID)) {
      if (ruleId === RuleID.$zero) continue;

      const warning = localizeCtapAssessment(localizedFinding(ruleId));

      expect(warning.id).toBe(ruleId);
      expect(warning.kind).toBe("finding");
      expect(warning.name).not.toBe("");
      expect(warning.description).not.toBe("");
      expect(warning.expectations[0]).not.toBe("");
      expect(warning.evidence[0]).not.toBe("");
    }
  });
});
