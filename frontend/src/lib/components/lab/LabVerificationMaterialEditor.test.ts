import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CredentialVerificationMaterial } from "../../../../bindings/github.com/telesma-app/kit/model/webauthn";

import { setAppLocale } from "$lib/i18n";

import LabVerificationMaterialEditor from "$lib/components/lab/LabVerificationMaterialEditor.svelte";

describe("Lab verification material editor", () => {
  afterEach(() => cleanup());

  it("labels verification keys as local-only and emits generated DTO rows", async () => {
    setAppLocale("en");

    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(LabVerificationMaterialEditor, {
      entries: [],
      onChange,
    });

    expect(
      screen.getByText("Local verification data · not sent to the authenticator"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Signature verification will be unavailable/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add verification key" }));

    const created = onChange.mock.calls[0][0] as CredentialVerificationMaterial[];

    expect(created).toHaveLength(1);
    expect(created[0]).toBeInstanceOf(CredentialVerificationMaterial);

    await rerender({ entries: created, onChange });
    await fireEvent.change(screen.getByLabelText("Passkey ID"), {
      target: { value: "cafe" },
    });

    const updated = onChange.mock.calls.at(-1)![0] as CredentialVerificationMaterial[];

    expect(updated[0]).toMatchObject({ credentialIDHex: "cafe" });
  });

  it("starts populated handoff material collapsed and opens it from the keyboard", async () => {
    setAppLocale("en");

    const user = userEvent.setup();

    render(LabVerificationMaterialEditor, {
      entries: [
        new CredentialVerificationMaterial({
          credentialIDHex: "cafe",
          publicKeyCOSEHex: "a501",
        }),
      ],
      onChange: vi.fn(),
    });

    const trigger = screen.getByRole("button", { name: "Edit verification material" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Passkey ID")).not.toBeVisible();

    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Passkey ID")).toHaveValue("cafe");
    expect(screen.getByRole("button", { name: "Hide verification material" })).toBeInTheDocument();
  });
});
