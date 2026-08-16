import { describe, expect, it } from "vitest";

import { formatJSON } from "$lib/json-source";

describe("JSON source formatting", () => {
  it("formats valid JSON", () => {
    const source = '{ "name": "Telesma", "options": [true, null] }';

    expect(formatJSON(source)).toBe(
      '{\n  "name": "Telesma",\n  "options": [\n    true,\n    null\n  ]\n}',
    );
  });

  it("reports invalid JSON", () => {
    expect(formatJSON("{not-json}")).toBeNull();
  });
});
