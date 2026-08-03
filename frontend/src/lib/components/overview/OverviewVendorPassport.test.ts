import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import OverviewVendorPassport from "$lib/components/overview/OverviewVendorPassport.svelte";
import { setAppLocale } from "$lib/i18n";
import type { OverviewVendorPassportPresentation } from "$lib/overview-rules";

const presentation: OverviewVendorPassportPresentation = {
  vendor: "Token2",
  transport: "USB · HID",
  limited: false,
  scopeNote: "",
  coreFacts: [],
  summaryFacts: [],
  detailFacts: [
    {
      label: "NFC support",
      value: "Supported",
      source: "device.vendorMetadata.token2.supportsNFC",
    },
  ],
};

describe("OverviewVendorPassport", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows vendor facts without exposing their internal source paths", async () => {
    const user = userEvent.setup();

    render(OverviewVendorPassport, { props: { presentation } });
    await user.click(screen.getByRole("button", { name: "Show technical details" }));

    expect(screen.getByText("NFC support")).toBeInTheDocument();
    expect(screen.getByText("Supported")).toBeInTheDocument();
    expect(screen.queryByText("device.vendorMetadata.token2.supportsNFC")).not.toBeInTheDocument();
  });
});
