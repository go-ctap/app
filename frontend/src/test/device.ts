import { DeviceReport } from "../../bindings/github.com/telesma-app/kit/model/report";
import { Mode, SmartCardInterface } from "../../bindings/github.com/telesma-app/kit/transport";

export function testHIDDevice(id = "token-1", product = "Test key") {
  return new DeviceReport({
    attachment: {
      id,
      transport: Mode.ModeHID,
      usb: { product, vendorId: 1, productId: 2 },
    },
  });
}

export function testSmartCardDevice(id = "card-1") {
  return new DeviceReport({
    attachment: {
      id,
      transport: Mode.ModeSmartCard,
      smartCard: {
        reader: "Test reader",
        interface: SmartCardInterface.SmartCardInterfaceUnknown,
      },
    },
  });
}
