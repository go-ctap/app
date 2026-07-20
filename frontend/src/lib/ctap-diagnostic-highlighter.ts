import githubDarkDefault from "shiki/themes/github-dark-default.mjs";
import githubLightDefault from "shiki/themes/github-light-default.mjs";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { LanguageRegistration, ThemedTokenWithVariants } from "shiki/types";

export const ctapDiagnosticLanguage = {
  name: "ctap-diagnostic",
  scopeName: "source.ctapdiag",
  patterns: [
    { include: "#byte-string" },
    { include: "#string" },
    { include: "#single-quoted-string" },
    { include: "#annotation" },
    { include: "#constant" },
    { include: "#number" },
    { include: "#punctuation" },
  ],
  repository: {
    annotation: {
      match: "/[A-Za-z_][A-Za-z0-9_.-]*/",
      name: "entity.name.tag.ctapdiag",
    },
    "byte-string": {
      begin: "h'",
      beginCaptures: {
        0: { name: "punctuation.definition.string.begin.ctapdiag" },
      },
      end: "'",
      endCaptures: {
        0: { name: "punctuation.definition.string.end.ctapdiag" },
      },
      name: "string.quoted.single.byte.ctapdiag",
      patterns: [
        { match: "/\\[REDACTED\\]/", name: "markup.deleted.redacted.ctapdiag" },
        { match: "[0-9A-Fa-f]+", name: "constant.numeric.hex.ctapdiag" },
      ],
    },
    string: {
      begin: '"',
      beginCaptures: {
        0: { name: "punctuation.definition.string.begin.ctapdiag" },
      },
      end: '"',
      endCaptures: {
        0: { name: "punctuation.definition.string.end.ctapdiag" },
      },
      name: "string.quoted.double.ctapdiag",
      patterns: [
        { match: "\\[REDACTED\\]", name: "markup.deleted.redacted.ctapdiag" },
        { match: "\\\\(?:[\"/\\\\bfnrt]|u[0-9A-Fa-f]{4})", name: "constant.character.escape.ctapdiag" },
      ],
    },
    "single-quoted-string": {
      begin: "'",
      beginCaptures: {
        0: { name: "punctuation.definition.string.begin.ctapdiag" },
      },
      end: "'",
      endCaptures: {
        0: { name: "punctuation.definition.string.end.ctapdiag" },
      },
      name: "string.quoted.single.ctapdiag",
      patterns: [
        { match: "\\[REDACTED\\]", name: "markup.deleted.redacted.ctapdiag" },
        { match: "\\\\(?:['/\\\\bfnrt]|u[0-9A-Fa-f]{4})", name: "constant.character.escape.ctapdiag" },
      ],
    },
    constant: {
      match: "\\b(?:true|false|null|undefined)\\b",
      name: "constant.language.ctapdiag",
    },
    number: {
      match: "-?(?:0x[0-9A-Fa-f]+|(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[Ee][+-]?[0-9]+)?)",
      name: "constant.numeric.ctapdiag",
    },
    punctuation: {
      patterns: [
        { match: "[{}\\[\\]()]", name: "punctuation.definition.ctapdiag" },
        { match: "[:,]", name: "punctuation.separator.ctapdiag" },
      ],
    },
  },
} satisfies LanguageRegistration;

const highlighter = createHighlighterCore({
  langs: [ctapDiagnosticLanguage],
  themes: [githubLightDefault, githubDarkDefault],
  engine: createJavaScriptRegexEngine(),
});

export type HighlightedCTAPDiagnosticLine = {
  id: number;
  tokens: ThemedTokenWithVariants[];
};

export async function highlightCTAPDiagnostic(source: string): Promise<HighlightedCTAPDiagnosticLine[]> {
  const lines = (await highlighter).codeToTokensWithThemes(source, {
    lang: "ctap-diagnostic",
    themes: {
      light: "github-light-default",
      dark: "github-dark-default",
    },
  });

  return lines.map((tokens, index) => ({
    id: tokens[0]?.offset ?? -(index + 1),
    tokens,
  }));
}
