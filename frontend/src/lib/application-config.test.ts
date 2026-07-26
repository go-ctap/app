import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationConfig, ApplicationConfigSnapshot } from "../../bindings/telesma/appconfig";

const applicationServiceMocks = vi.hoisted(() => ({
  LoadApplicationConfig: vi.fn(),
  SaveApplicationConfig: vi.fn(),
}));

vi.mock("../../bindings/telesma/appconfig/service", () => applicationServiceMocks);

import {
  advancedMode,
  currentLocale,
  initializeApplicationConfig,
  setAdvancedMode,
  setAppLocale,
} from "./application-config.js";

function snapshot(locale: string, advanced: boolean, exists = true) {
  return new ApplicationConfigSnapshot({
    config: new ApplicationConfig({ locale, advancedMode: advanced }),
    exists,
  });
}

describe("application config", () => {
  beforeEach(async () => {
    applicationServiceMocks.LoadApplicationConfig.mockResolvedValue(snapshot("en", false));
    applicationServiceMocks.SaveApplicationConfig.mockResolvedValue(undefined);
    await initializeApplicationConfig();
    vi.clearAllMocks();
  });

  it("applies a persisted config", async () => {
    applicationServiceMocks.LoadApplicationConfig.mockResolvedValue(snapshot("ru", true));

    await initializeApplicationConfig();

    expect(get(currentLocale)).toBe("ru");
    expect(get(advancedMode)).toBe(true);
    expect(applicationServiceMocks.SaveApplicationConfig).not.toHaveBeenCalled();
  });

  it("creates a config on first launch", async () => {
    applicationServiceMocks.LoadApplicationConfig.mockResolvedValue(snapshot("en", false, false));

    await initializeApplicationConfig();

    expect(applicationServiceMocks.SaveApplicationConfig).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", advancedMode: false }),
    );
  });

  it("serializes preference writes", async () => {
    let finishFirstSave: (() => void) | undefined;
    applicationServiceMocks.SaveApplicationConfig
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        finishFirstSave = resolve;
      }))
      .mockResolvedValue(undefined);

    setAppLocale("ru");
    await vi.waitFor(() => expect(applicationServiceMocks.SaveApplicationConfig).toHaveBeenCalledTimes(1));
    setAdvancedMode(true);
    await Promise.resolve();
    expect(applicationServiceMocks.SaveApplicationConfig).toHaveBeenCalledTimes(1);

    finishFirstSave?.();
    await vi.waitFor(() => expect(applicationServiceMocks.SaveApplicationConfig).toHaveBeenCalledTimes(2));
    expect(applicationServiceMocks.SaveApplicationConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ locale: "ru", advancedMode: true }),
    );
  });
});
