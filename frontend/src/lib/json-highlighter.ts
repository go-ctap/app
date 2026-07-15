import json from "shiki/langs/json.mjs";
import githubDarkDefault from "shiki/themes/github-dark-default.mjs";
import githubLightDefault from "shiki/themes/github-light-default.mjs";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { ThemedTokenWithVariants } from "shiki/types";

const lightTheme = "github-light-default";
const darkTheme = "github-dark-default";

const highlighter = createHighlighterCore({
  langs: [json],
  themes: [githubLightDefault, githubDarkDefault],
  engine: createJavaScriptRegexEngine(),
});

export type HighlightedJsonLine = {
  id: number;
  tokens: ThemedTokenWithVariants[];
};

export async function highlightJson(source: string): Promise<HighlightedJsonLine[]> {
  const lines = (await highlighter).codeToTokensWithThemes(source, {
    lang: "json",
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  });

  return lines.map((tokens, index) => ({
    id: tokens[0]?.offset ?? -(index + 1),
    tokens,
  }));
}
