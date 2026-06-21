import {cleanup, render, screen} from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {DeviceReport} from "../../bindings/github.com/go-ctap/kit/model/report";
import TokenSelect from "./TokenSelect.svelte";
import {Mode} from "../../bindings/github.com/go-ctap/kit/transport";

describe("TokenSelect", () => {
  afterEach(() => {
    cleanup();
  });

  it("passes the empty selector through when clearing selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const devices = [
      new DeviceReport({
        deviceId: "device-1",
        ordinalAlias: "authenticator-1",
        transport: Mode.ModeAuto,
        product: "Test Key",
      }),
    ];

    render(TokenSelect, {
      props: {
        devices,
        value: "device-1",
        onSelect,
      },
    });

    await user.selectOptions(screen.getByLabelText("Authenticator"), "");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("");
  });
});
