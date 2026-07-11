export const Create = {
  Any: (value: unknown) => value,
  Array:
    <T>(create: (value: unknown) => T) =>
    (value: unknown): T[] =>
      Array.isArray(value) ? value.map(create) : [],
  ByteSlice: (value: unknown) => value,
  Map:
    <K extends string | number | symbol, V>(createKey: (value: unknown) => K, createValue: (value: unknown) => V) =>
    (value: unknown): Record<K, V> => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<K, V>;
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [createKey(key), createValue(item)])) as Record<K, V>;
    },
  Nullable:
    <T>(create: (value: unknown) => T) =>
    (value: unknown): T | null =>
      value === null || value === undefined ? null : create(value),
};

export const Call = {
  ByID: () => Promise.reject(new Error("Wails calls are unavailable in unit tests")),
};

export const Clipboard = {
  SetText: (_text: string) => Promise.resolve(),
  Text: () => Promise.resolve(""),
};

export const Events = {
  On: () => () => {},
};

export const System = {
  IsWindows: () => false,
  invoke: () => undefined,
};

export const Window = {
  Close: () => Promise.resolve(),
  IsMaximised: () => Promise.resolve(false),
  Minimise: () => Promise.resolve(),
  ToggleMaximise: () => Promise.resolve(),
};

export class CancellablePromise<T> extends Promise<T> {}
