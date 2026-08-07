import { afterEach, describe, expect, it } from "vitest";

import { bioSampleStatusLabel, permissionLabel } from "$lib/format.js";
import { setAppLocale } from "$lib/i18n.js";

describe("ctapkit display labels", () => {
  afterEach(() => setAppLocale("en"));

  it("localizes symbolic and canonical permission names", () => {
    setAppLocale("ru");

    expect(permissionLabel("PermissionMakeCredential")).toBe("MakeCredential");
    expect(permissionLabel("PermissionCredentialManagement")).toBe("Управление ключами доступа");
    expect(permissionLabel("credentialManagement")).toBe("Управление ключами доступа");
    expect(permissionLabel("credentialManagement,largeBlobWrite")).toBe(
      "Управление ключами доступа + Запись крупного блоба",
    );
  });

  it("does not describe MakeCredential permission as passkey creation", () => {
    expect(permissionLabel("makeCredential")).toBe("MakeCredential");
  });

  it("localizes biometric sample statuses", () => {
    setAppLocale("ru");

    expect(bioSampleStatusLabel("LastEnrollSampleStatusFingerprintTooHigh")).toBe(
      "Приложите палец ниже",
    );
    expect(bioSampleStatusLabel("too-fast")).toBe("Держите палец на сенсоре дольше");
  });

  it("humanizes unknown future values", () => {
    expect(permissionLabel("PermissionVendorExtension")).toBe("Vendor Extension");
    expect(bioSampleStatusLabel("LastEnrollSampleStatusVendorResult")).toBe("Vendor Result");
  });
});
