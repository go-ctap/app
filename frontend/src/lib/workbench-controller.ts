import { get } from "svelte/store";

import {
  bootstrapAuthenticatorSession,
  selectAuthenticatorSession,
} from "$lib/authenticator-controller.js";
import { advancedMode } from "$lib/application-config.js";
import { maybeLoadConformance } from "$lib/conformance-controller.js";
import { activeScreen, type ActiveScreen } from "$lib/features/workbench/state.js";
import { maybeLoadLargeBlobs } from "$lib/largeblobs-controller.js";
import { maybeLoadOverview } from "$lib/overview-controller.js";
import { maybeLoadPasskeys } from "$lib/passkeys-controller.js";
import { maybeLoadSecurity } from "$lib/security-controller.js";

export async function loadActiveScreen(screen = get(activeScreen)) {
  switch (screen) {
    case "overview":
    case "lab": {
      await maybeLoadOverview();

      return;
    }
    case "passkeys": {
      await maybeLoadPasskeys();

      return;
    }
    case "large-blobs": {
      await maybeLoadLargeBlobs();

      return;
    }
    case "security": {
      await maybeLoadSecurity();

      return;
    }
    case "conformance": {
      await maybeLoadConformance();
    }
  }
}

export async function bootstrap() {
  await bootstrapAuthenticatorSession();
}

export async function selectToken(selector: string) {
  await selectAuthenticatorSession(selector);
}

export async function navigateToScreen(screen: ActiveScreen) {
  if (screen === "conformance" && !get(advancedMode)) return;

  if (get(activeScreen) === screen) return;

  activeScreen.set(screen);
  await loadActiveScreen(screen);
}
