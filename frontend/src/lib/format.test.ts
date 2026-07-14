import { afterEach, describe, expect, it } from "vitest";

import { bioSampleStatusLabel, permissionLabel } from "./format.js";
import { setAppLocale } from "./i18n.js";

describe("ctapkit display labels", () => {
  afterEach(() => setAppLocale("en"));

  it("localizes symbolic and canonical permission names", () => {
    setAppLocale("ru");

    expect(permissionLabel("PermissionCredentialManagement")).toBe("Управление учетными данными");
    expect(permissionLabel("credentialManagement")).toBe("Управление учетными данными");
  });

  it("localizes biometric sample statuses", () => {
    setAppLocale("ru");

    expect(bioSampleStatusLabel("LastEnrollSampleStatusFingerprintTooHigh")).toBe("Приложите палец ниже");
    expect(bioSampleStatusLabel("too-fast")).toBe("Держите палец на сенсоре дольше");
  });

  it("humanizes unknown future values", () => {
    expect(permissionLabel("PermissionVendorExtension")).toBe("Vendor Extension");
    expect(bioSampleStatusLabel("LastEnrollSampleStatusVendorResult")).toBe("Vendor Result");
  });
});
