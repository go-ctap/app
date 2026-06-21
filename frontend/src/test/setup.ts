import "@testing-library/jest-dom/vitest";

if (!("window" in globalThis)) {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        origin: "http://localhost",
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
    },
    configurable: true,
  });
}

if (!("document" in globalThis)) {
  Object.defineProperty(globalThis, "document", {
    value: {
      addEventListener: () => {},
      readyState: "complete",
    },
    configurable: true,
  });
}

if (!("localStorage" in globalThis)) {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
    configurable: true,
  });
}

if (!("MouseEvent" in globalThis)) {
  Object.defineProperty(globalThis, "MouseEvent", {
    value: class MouseEvent {
      buttons = 0;
    },
    configurable: true,
  });
}

if (!HTMLElement.prototype.hasPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    value: () => false,
    configurable: true,
  });
}

if (!HTMLElement.prototype.releasePointerCapture) {
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    value: () => {},
    configurable: true,
  });
}
