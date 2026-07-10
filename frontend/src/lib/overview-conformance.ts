import { localizeCtapAssessment, m } from "./overview-i18n.js";
import type {
  OverviewConformanceAssessment,
  OverviewConformancePresentation,
  OverviewContext,
} from "./overview-types.js";

export function buildOverviewConformancePresentation(
  context: OverviewContext = {},
): OverviewConformancePresentation | null {
  if (!context.info) return null;

  const { conformance, versions } = context.info;
  const assessments: OverviewConformanceAssessment[] = [
    ...conformance.findings.map(localizeCtapAssessment),
    ...conformance.inconclusive.map(localizeCtapAssessment),
  ];

  if (conformance.target === null) {
    assessments.push({
      id: "target_unresolved",
      kind: "unresolved",
      profile: null,
      name: m.conformance_target_unresolved_name(),
      description: m.conformance_target_unresolved_description(),
      expectations: [],
      evidence: [versions.length
        ? m.conformance_evidence_present_values({ path: "versions", values: versions.join(", ") })
        : m.conformance_evidence_present_empty({ path: "versions" })],
      reason: m.conformance_target_unresolved_reason(),
      source: "versions",
      references: [],
    });
  }

  const findingCount = conformance.findings.length;
  const inconclusiveCount = conformance.inconclusive.length;

  return {
    status: findingCount > 0
      ? "findings"
      : inconclusiveCount > 0
        ? "inconclusive"
        : conformance.target === null
          ? "unresolved"
          : "passed",
    target: conformance.target,
    assessments,
    findingCount,
    inconclusiveCount,
  };
}
