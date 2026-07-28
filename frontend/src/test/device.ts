import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

export function testHIDDevice(id = "token-1", product = "Test key") {
  return new DeviceReport({
    attachment: {
      id,
      transport: Mode.ModeHID,
      usb: { product, vendorId: 1, productId: 2 },
    },
  });
}
