import githubLightDefault from "shiki/themes/github-light-default.mjs";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { describe, expect, it } from "vitest";

import { ctapDiagnosticLanguage, highlightCTAPDiagnostic } from "$lib/ctap-diagnostic-highlighter";

async function scopedTokens(source: string) {
  const highlighter = await createHighlighterCore({
    langs: [ctapDiagnosticLanguage],
    themes: [githubLightDefault],
    engine: createJavaScriptRegexEngine(),
  });
  const result = highlighter.codeToTokens(source, {
    lang: "ctap-diagnostic",
    theme: "github-light-default",
    includeExplanation: "scopeName",
  });

  return result.tokens.flat().map((token) => ({
    content: token.content,
    scopes: token.explanation?.flatMap((part) => part.scopes.map((scope) => scope.scopeName)) ?? [],
  }));
}

describe("CTAP diagnostic highlighter", () => {
  it("highlights schema annotations, CBOR values, punctuation, and redaction", async () => {
    const tokens = await scopedTokens(
      `{ /clientDataHash/ 1: h'ff4d', /alg/ 2: -7, /enabled/ 3: true, /missing/ 4: null, /unknown/ 5: undefined, /secret/ 6: "[REDACTED]", /secretBytes/ 7: h'/[REDACTED]/' }`,
    );

    expect(tokens.find((token) => token.content === "/clientDataHash/")?.scopes).toContain(
      "entity.name.tag.ctapdiag",
    );
    expect(tokens.find((token) => token.content === "ff4d")?.scopes).toContain(
      "constant.numeric.hex.ctapdiag",
    );
    expect(tokens.find((token) => token.content === "-7")?.scopes).toContain(
      "constant.numeric.ctapdiag",
    );
    expect(tokens.find((token) => token.content === "true")?.scopes).toContain(
      "constant.language.ctapdiag",
    );
    expect(tokens.find((token) => token.content === "[REDACTED]")?.scopes).toContain(
      "markup.deleted.redacted.ctapdiag",
    );
    expect(tokens.find((token) => token.content === "/[REDACTED]/")?.scopes).toContain(
      "markup.deleted.redacted.ctapdiag",
    );
    expect(tokens.find((token) => token.content.includes("{"))?.scopes).toContain(
      "punctuation.definition.ctapdiag",
    );
    expect(tokens.find((token) => token.content.includes(":"))?.scopes).toContain(
      "punctuation.separator.ctapdiag",
    );
  });

  it("keeps single-quoted diagnostic text out of numeric highlighting", async () => {
    const source = `'user-eNJ0dP2b4nWTg6C27NARSxYe'`;
    const tokens = await scopedTokens(source);
    const stringTokens = tokens.filter((token) =>
      token.scopes.includes("string.quoted.single.ctapdiag"),
    );

    expect(stringTokens.map((token) => token.content).join("")).toBe(source);
    expect(tokens.some((token) => token.scopes.includes("constant.numeric.ctapdiag"))).toBe(false);
  });

  it("does not treat annotations inside strings or byte strings as fields", async () => {
    const tokens = await scopedTokens(`"inside /notAField/" '/alsoNotAField/' h'feed'`);
    const annotationTokens = tokens.filter((token) =>
      token.scopes.includes("entity.name.tag.ctapdiag"),
    );

    expect(annotationTokens).toEqual([]);
    expect(tokens.find((token) => token.content.includes("/notAField/"))?.scopes).toContain(
      "string.quoted.double.ctapdiag",
    );
    expect(tokens.find((token) => token.content.includes("/alsoNotAField/"))?.scopes).toContain(
      "string.quoted.single.ctapdiag",
    );
  });

  it("preserves the source while producing dual-theme tokens", async () => {
    const source = `{ /versions/ 1: ["FIDO_2_1"], /aaguid/ 3: h'ff4d' }`;
    const lines = await highlightCTAPDiagnostic(source);

    expect(
      lines
        .flatMap((line) => line.tokens)
        .map((token) => token.content)
        .join(""),
    ).toBe(source);
    expect(
      lines
        .flatMap((line) => line.tokens)
        .every((token) => token.variants.light && token.variants.dark),
    ).toBe(true);
  });
});
