import { resetAuthenticatorDeviceState } from "$lib/features/authenticator/state.js";
import { resetLargeBlobsDeviceState } from "$lib/features/largeblobs/state.js";
import { resetLabDeviceState } from "$lib/features/lab/state.js";
import { resetOverviewDeviceState } from "$lib/features/overview/state.js";
import { resetPasskeysDeviceState } from "$lib/features/passkeys/state.js";
import { resetSecurityDeviceState } from "$lib/features/security/state.js";

export function resetDeviceState() {
  resetAuthenticatorDeviceState();
  resetOverviewDeviceState();
  resetPasskeysDeviceState();
  resetLargeBlobsDeviceState();
  resetLabDeviceState();
  resetSecurityDeviceState();
}
