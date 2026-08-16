import { json } from "@codemirror/lang-json";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { smartJSONEnter } from "$lib/json-editor";

function editorAtEndOfSecondLine(doc: string) {
  const initialState = EditorState.create({ doc, extensions: [json()] });
  const position = initialState.doc.line(2).to;

  return new EditorView({
    state: initialState.update({ selection: { anchor: position } }).state,
  });
}

describe("smartJSONEnter", () => {
  it("adds a missing comma before opening a new object property", () => {
    const editor = editorAtEndOfSecondLine('{\n  "enabled": true\n}');

    smartJSONEnter(editor);

    expect(editor.state.doc.toString()).toBe('{\n  "enabled": true,\n  \n}');
    editor.destroy();
  });

  it("does not duplicate an existing comma", () => {
    const editor = editorAtEndOfSecondLine('{\n  "enabled": true,\n}');

    smartJSONEnter(editor);

    expect(editor.state.doc.toString()).toBe('{\n  "enabled": true,\n  \n}');
    editor.destroy();
  });

  it("adds a missing comma after an array item", () => {
    const editor = editorAtEndOfSecondLine("[\n  1\n]");

    smartJSONEnter(editor);

    expect(editor.state.doc.toString()).toBe("[\n  1,\n  \n]");
    editor.destroy();
  });
});
