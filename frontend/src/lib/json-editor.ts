import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { insertNewlineAndIndent } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import { linter, lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, Prec, Transaction } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  keymap,
  placeholder as placeholderExtension,
  type Command,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { minimalSetup } from "codemirror";

const jsonHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--json-editor-property)" },
  { tag: tags.string, color: "var(--json-editor-string)" },
  { tag: tags.number, color: "var(--json-editor-number)" },
  { tag: [tags.bool, tags.null], color: "var(--json-editor-literal)" },
]);

export type JSONEditorConfiguration = {
  id: string;
  labelledBy: string;
  placeholder?: string;
  disabled: boolean;
  invalid: boolean;
};

export type JSONEditorHandle = {
  setValue: (value: string) => void;
  setConfiguration: (configuration: JSONEditorConfiguration) => void;
  destroy: () => void;
};

type JSONEditorOptions = JSONEditorConfiguration & {
  parent: HTMLElement;
  value: string;
  onChange: (value: string) => void;
};

function isJSONItemEnd(state: EditorState, position: number) {
  let node = syntaxTree(state).resolveInner(position, -1);

  while (node.to === position) {
    if (node.name === "Property" && node.parent?.name === "Object") return true;
    if (node.parent?.name === "Array") return true;

    if (!node.parent) break;
    node = node.parent;
  }

  return false;
}

function canInsertTrailingComma(state: EditorState, position: number) {
  const suffix = state.sliceDoc(position, state.doc.lineAt(position).to).trim();

  return (suffix === "" || suffix === "}" || suffix === "]") && isJSONItemEnd(state, position);
}

export const smartJSONEnter: Command = (view) => {
  const range = view.state.selection.main;

  if (view.state.selection.ranges.length !== 1 || !range.empty) {
    return insertNewlineAndIndent(view);
  }

  if (canInsertTrailingComma(view.state, range.head)) {
    view.dispatch({
      changes: { from: range.head, insert: "," },
      selection: { anchor: range.head + 1 },
    });
  }

  return insertNewlineAndIndent(view);
};

function configurationExtension(configuration: JSONEditorConfiguration) {
  const attributes: Record<string, string> = {
    id: configuration.id,
    "aria-labelledby": configuration.labelledBy,
    "aria-multiline": "true",
    autocomplete: "off",
    autocapitalize: "off",
    autocorrect: "off",
    spellcheck: "false",
  };

  if (configuration.disabled) attributes["aria-disabled"] = "true";
  if (configuration.invalid) attributes["aria-invalid"] = "true";

  return [
    EditorState.readOnly.of(configuration.disabled),
    EditorView.editable.of(!configuration.disabled),
    EditorView.contentAttributes.of(attributes),
    configuration.placeholder ? placeholderExtension(configuration.placeholder) : [],
  ];
}

export function createJSONEditor(options: JSONEditorOptions): JSONEditorHandle {
  const configuration = new Compartment();
  let synchronizing = false;

  const view = new EditorView({
    parent: options.parent,
    state: EditorState.create({
      doc: options.value,
      extensions: [
        Prec.highest(keymap.of([{ key: "Enter", run: smartJSONEnter }])),
        minimalSetup,
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([...closeBracketsKeymap, ...searchKeymap, ...lintKeymap]),
        json(),
        syntaxHighlighting(jsonHighlightStyle),
        linter(jsonParseLinter()),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        configuration.of(configurationExtension(options)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !synchronizing) {
            options.onChange(update.state.doc.toString());
          }
        }),
      ],
    }),
  });

  function setValue(value: string) {
    if (value === view.state.doc.toString()) return;

    synchronizing = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      selection: { anchor: Math.min(view.state.selection.main.head, value.length) },
      annotations: Transaction.addToHistory.of(false),
    });
    synchronizing = false;
  }

  return {
    setValue,
    setConfiguration(nextConfiguration) {
      view.dispatch({
        effects: configuration.reconfigure(configurationExtension(nextConfiguration)),
      });
    },
    destroy() {
      view.destroy();
    },
  };
}
