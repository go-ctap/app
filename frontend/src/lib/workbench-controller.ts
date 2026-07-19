import { get } from "svelte/store";

import {
  bootstrapAuthenticatorSession,
  selectAuthenticatorSession,
} from "./authenticator-controller.js";
import { activeScreen, type ActiveScreen } from "./features/workbench/state.js";

async function loadActiveScreen(screen = get(activeScreen)) {
  switch (screen) {
    case "overview":
    case "lab": {
      const { maybeLoadOverview } = await import("./overview-controller.js");
      await maybeLoadOverview();
      return;
    }
    case "passkeys": {
      const { maybeLoadPasskeys } = await import("./passkeys-controller.js");
      await maybeLoadPasskeys();
      return;
    }
    case "large-blobs": {
      const { maybeLoadLargeBlobs } = await import("./largeblobs-controller.js");
      await maybeLoadLargeBlobs();
      return;
    }
    case "security": {
      const { maybeLoadSecurity } = await import("./security-controller.js");
      await maybeLoadSecurity();
    }
  }
}

export async function bootstrap() {
  await bootstrapAuthenticatorSession();
  await loadActiveScreen();
}

export async function selectToken(selector: string) {
  await selectAuthenticatorSession(selector);
  await loadActiveScreen();
}

export async function navigateToScreen(screen: ActiveScreen) {
  if (get(activeScreen) === screen) return;
  activeScreen.set(screen);
  await loadActiveScreen(screen);
}
