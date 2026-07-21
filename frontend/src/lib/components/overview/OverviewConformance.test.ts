import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  Profile,
  RuleID,
  SpecificationID,
  Target,
} from "../../../../bindings/github.com/go-ctap/kit/model/conformance";

import { setAppLocale } from "$lib/i18n";
import type {
  OverviewConformanceAssessment,
  OverviewConformancePresentation,
  OverviewConformanceStatus,
} from "$lib/overview-rules";

import OverviewConformance from "./OverviewConformance.svelte";

const target = new Target({
  profile: Profile.ProfileFIDO23,
  specification: SpecificationID.SpecificationCTAP23,
});

function assessment(kind: OverviewConformanceAssessment["kind"]): OverviewConformanceAssessment {
  return {
    id: kind === "unresolved" ? "target_unresolved" : RuleID.RuleVersionsRequired,
    kind,
    profile: kind === "unresolved" ? null : Profile.ProfileFIDO23,
    name: kind === "unresolved" ? "Conformance target unresolved" : "Versions required",
    description: "Representative assessment",
    expectations: kind === "unresolved" ? [] : ["versions must be reported"],
    evidence: ["versions: absent"],
    reason: kind === "finding" ? undefined : "More evidence is required",
    source: "versions",
    references: [],
  };
}

function presentation(status: OverviewConformanceStatus): OverviewConformancePresentation {
  const assessments = status === "passed"
    ? []
    : [assessment(status === "findings" ? "finding" : status)];

  return {
    status,
    target: status === "unresolved" ? null : target,
    assessments,
    findingCount: status === "findings" ? 1 : 0,
    inconclusiveCount: status === "inconclusive" ? 1 : 0,
  };
}

describe("OverviewConformance", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps a passed summary visible and its details collapsed by default", async () => {
    const user = userEvent.setup();

    render(OverviewConformance, { props: { presentation: presentation("passed") } });

    expect(screen.getByText("Conformance")).toBeInTheDocument();
    expect(screen.getAllByText("Passed").length).toBeGreaterThan(0);
    expect(screen.getByText(Profile.ProfileFIDO23)).toBeInTheDocument();
    expect(screen.getByText(SpecificationID.SpecificationCTAP23)).toBeInTheDocument();

    const expand = screen.getByRole("button", { name: "Expand conformance details" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(expand);

    const collapse = screen.getByRole("button", { name: "Collapse conformance details" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("status")).toHaveTextContent("No issues found");

    collapse.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expand conformance details" })).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it.each([
    ["findings", "Findings: 1", "Versions required"],
    ["inconclusive", "Inconclusive: 1", "Versions required"],
    ["unresolved", "Not evaluated", "Conformance target unresolved"],
  ] satisfies Array<[OverviewConformanceStatus, string, string]>) (
    "opens %s details by default",
    (status, label, assessmentName) => {
      render(OverviewConformance, { props: { presentation: presentation(status) } });

      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "Collapse conformance details" })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("article")).toBeInTheDocument();
      expect(screen.getByText(assessmentName)).toBeInTheDocument();
    },
  );

  it("summarizes findings and inconclusive results together", () => {
    const mixed: OverviewConformancePresentation = {
      status: "findings",
      target,
      assessments: [assessment("finding"), assessment("inconclusive")],
      findingCount: 1,
      inconclusiveCount: 1,
    };

    render(OverviewConformance, { props: { presentation: mixed } });

    expect(screen.getAllByText("Findings: 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inconclusive: 1").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
