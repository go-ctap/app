export type DeviceFeatureName = "overview" | "passkeys" | "large-blobs" | "lab" | "security";

export type DeviceFeatureLifecycle = Readonly<{
  resetForAuthenticatorChange: () => void;
  resetForTest: () => void;
}>;

/**
 * Keeps the authenticator boundary independent from lazily loaded screens.
 * A feature joins the boundary when its state module is loaded; an unloaded
 * feature is already in its initial state and does not need resetting.
 */
export class DeviceFeatureLifecycleRegistry {
  readonly #features = new Map<DeviceFeatureName, DeviceFeatureLifecycle>();

  register(name: DeviceFeatureName, lifecycle: DeviceFeatureLifecycle) {
    this.#features.set(name, lifecycle);

    return () => {
      if (this.#features.get(name) === lifecycle) {
        this.#features.delete(name);
      }
    };
  }

  resetForAuthenticatorChange() {
    for (const lifecycle of this.#features.values()) {
      lifecycle.resetForAuthenticatorChange();
    }
  }

  resetForTest() {
    for (const lifecycle of this.#features.values()) {
      lifecycle.resetForTest();
    }
  }

  dispose() {
    this.#features.clear();
  }
}

export const deviceFeatureLifecycles = new DeviceFeatureLifecycleRegistry();
