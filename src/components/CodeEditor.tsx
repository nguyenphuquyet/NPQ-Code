import { useEffect, useRef } from "react";
import { EditorState, Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { tags as t } from "@lezer/highlight";
import { getActiveEditor, setActiveEditor } from "../lib/editorBridge";
import type { RevealTarget } from "../lib/store";

const lightHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: "#0000FF" },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: "#A31515" },
  { tag: [t.number, t.bool, t.null], color: "#098658" },
  { tag: t.comment, color: "#008000", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#795E26" },
  { tag: [t.definition(t.variableName), t.variableName], color: "#001080" },
  { tag: [t.typeName, t.className, t.definition(t.typeName)], color: "#267F99" },
  { tag: [t.propertyName, t.attributeName], color: "#001080" },
  { tag: [t.operator, t.punctuation], color: "#1F1F1F" },
  { tag: [t.self, t.namespace], color: "#7B3FA0" },
  { tag: t.meta, color: "#0070C1" },
  { tag: t.tagName, color: "#800000" },
  { tag: t.atom, color: "#7B3FA0" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.link, color: "#0066B8", textDecoration: "underline" },
  { tag: t.invalid, color: "#CD3131" },
]);

const lightTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#FFFFFF", color: "#1F1F1F", height: "100%" },
    ".cm-content": { caretColor: "#000000", padding: "8px 0" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#000000" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "#ADD6FF",
    },
    ".cm-selectionMatch": { backgroundColor: "#C9E4FB" },
    ".cm-activeLine": { backgroundColor: "#F5F5F5" },
    ".cm-gutters": {
      backgroundColor: "#FFFFFF",
      color: "#6E7681",
      border: "none",
      borderRight: "1px solid #F0F0F0",
    },
    ".cm-activeLineGutter": { backgroundColor: "#F0F0F0", color: "#1F1F1F" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#F3F3F3",
      border: "1px solid #E2E2E2",
      color: "#6B6B6B",
    },
    ".cm-tooltip": {
      backgroundColor: "#FFFFFF",
      border: "1px solid #C8C8C8",
      color: "#1F1F1F",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "#D7E8F8",
      color: "#1F1F1F",
    },
    ".cm-matchingBracket": { backgroundColor: "#E5F3FF", outline: "1px solid #7FB4D9" },
    ".cm-nonmatchingBracket": { color: "#CD3131" },
    ".cm-panels": { backgroundColor: "#F3F3F3", color: "#1F1F1F" },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid #E2E2E2" },
    ".cm-panels.cm-panels-bottom": { borderTop: "1px solid #E2E2E2" },
    ".cm-searchMatch": { backgroundColor: "#FFE9A8", outline: "1px solid #E2C45C" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#FFD166" },
  },
  { dark: false },
);

function languageFor(lang: string): Extension {
  switch (lang) {
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "ts":
      return javascript({ typescript: true });
    case "jsx":
      return javascript({ jsx: true });
    case "js":
      return javascript();
    case "json":
      return json();
    case "html":
      return html();
    case "css":
      return css();
    default:
      return [];
  }
}

type Props = {
  content: string;
  language: string;
  reveal?: RevealTarget | null;
  onChange: (value: string) => void;
  onCursor: (line: number, col: number) => void;
  onSave: () => void;
};

export default function CodeEditor({
  content,
  language,
  reveal,
  onChange,
  onCursor,
  onSave,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!hostRef.current) return;
    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          onSaveRef.current();
          return true;
        },
      },
    ]);
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) onChangeRef.current(update.state.doc.toString());
      if (update.selectionSet) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        onCursorRef.current(line.number, head - line.from + 1);
      }
    });
    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        saveKeymap,
        syntaxHighlighting(lightHighlight, { fallback: false }),
        lightTheme,
        languageFor(language),
        updateListener,
        EditorView.lineWrapping,
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    setActiveEditor(view);
    onCursorRef.current(1, 1);
    return () => {
      if (getActiveEditor() === view) setActiveEditor(null);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Jump to a search result / tree reveal without remounting the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !reveal) return;
    const lineNumber = Math.min(Math.max(1, reveal.line), view.state.doc.lines);
    const line = view.state.doc.line(lineNumber);
    const column = Math.min(Math.max(1, reveal.column), line.length + 1);
    const position = line.from + column - 1;
    view.dispatch({
      selection: { anchor: position },
      effects: EditorView.scrollIntoView(position, { y: "center" }),
    });
    view.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.nonce]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
