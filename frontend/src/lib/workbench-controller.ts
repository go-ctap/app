import { get } from "svelte/store";

import {
  bootstrapAuthenticatorSession,
  selectAuthenticatorSession,
} from "$lib/authenticator-controller.js";
import { activeScreen, type ActiveScreen } from "$lib/features/workbench/state.js";

async function loadActiveScreen(screen = get(activeScreen)) {
  switch (screen) {
    case "overview":
    case "lab": {
      const { maybeLoadOverview } = await import("$lib/overview-controller.js");

      await maybeLoadOverview();

      return;
    }
    case "passkeys": {
      const { maybeLoadPasskeys } = await import("$lib/passkeys-controller.js");

      await maybeLoadPasskeys();

      return;
    }
    case "large-blobs": {
      const { maybeLoadLargeBlobs } = await import("$lib/largeblobs-controller.js");

      await maybeLoadLargeBlobs();

      return;
    }
    case "security": {
      const { maybeLoadSecurity } = await import("$lib/security-controller.js");

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
