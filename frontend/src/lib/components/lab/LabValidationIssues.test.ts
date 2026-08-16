import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it } from "vitest";

import LabValidationIssues from "$lib/components/lab/LabValidationIssues.svelte";
import { setAppLocale } from "$lib/i18n";

describe("LabValidationIssues", () => {
  beforeEach(() => setAppLocale("en"));

  it("leaves invalid JSON to the inline editor diagnostic", () => {
    render(LabValidationIssues, {
      props: {
        issues: [{ field: "make.clientData.rawJSON", code: "invalid-json" }],
        severity: "warning",
      },
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/not valid JSON/)).not.toBeInTheDocument();
  });

  it("continues to render other validation warnings", () => {
    render(LabValidationIssues, {
      props: {
        issues: [
          { field: "make.clientData.rawJSON", code: "invalid-json" },
          { field: "make.clientData.origin", code: "insecure-origin" },
        ],
        severity: "warning",
      },
    });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/HTTPS origin/)).toBeInTheDocument();
    expect(screen.queryByText(/not valid JSON/)).not.toBeInTheDocument();
  });
});
