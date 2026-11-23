import { useEffect, useRef } from "react";
import { EditorState, Extension, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
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

/*
 * CodeMirror colours come from the theme CSS variables in `src/index.css`
 * (`--cm-*` for the editor chrome, `--syn-*` for syntax tokens), so switching
 * theme repaints open editors without reconfiguring any extension.
 */
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: "rgb(var(--syn-keyword))" },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: "rgb(var(--syn-string))" },
  { tag: [t.number, t.bool, t.null], color: "rgb(var(--syn-number))" },
  { tag: t.comment, color: "rgb(var(--syn-comment))", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "rgb(var(--syn-function))" },
  { tag: [t.definition(t.variableName), t.variableName], color: "rgb(var(--syn-variable))" },
  { tag: [t.typeName, t.className, t.definition(t.typeName)], color: "rgb(var(--syn-type))" },
  { tag: [t.propertyName, t.attributeName], color: "rgb(var(--syn-property))" },
  { tag: [t.operator, t.punctuation], color: "rgb(var(--syn-operator))" },
  { tag: [t.self, t.namespace], color: "rgb(var(--syn-namespace))" },
  { tag: t.meta, color: "rgb(var(--syn-meta))" },
  { tag: t.tagName, color: "rgb(var(--syn-tag))" },
  { tag: t.atom, color: "rgb(var(--syn-atom))" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.link, color: "rgb(var(--syn-link))", textDecoration: "underline" },
  { tag: t.invalid, color: "rgb(var(--cm-invalid))" },
]);

const codeTheme = EditorView.theme(
  {
    "&": { backgroundColor: "rgb(var(--cm-bg))", color: "rgb(var(--cm-fg))", height: "100%" },
    ".cm-content": { caretColor: "rgb(var(--cm-caret))", padding: "8px 0" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "rgb(var(--cm-caret))" },
    /*
     * CodeMirror's base theme ships `&light.cm-focused > .cm-scroller >
     * .cm-selectionLayer .cm-selectionBackground { background: #d7d4f0 }`.
     * That selector is 5 classes deep, so a plain `.cm-selectionBackground`
     * rule loses to it and the editor keeps CodeMirror's pale lavender
     * selection even in a dark theme. Match its specificity (and add
     * `.cm-editor`) so the themed variable always wins.
     */
    "&.cm-editor.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, & > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgb(var(--cm-selection))",
    },
    ".cm-selectionLayer .cm-selectionBackground": {
      backgroundColor: "rgb(var(--cm-selection))",
    },
    ".cm-selectionMatch": { backgroundColor: "rgb(var(--cm-selection-match))" },
    /*
     * The active line paints in the line-background layer, which sits above
     * CodeMirror's selection layer (z-index: -2). A solid fill would hide the
     * selection on the line that holds the caret, so this must stay a
     * translucent overlay — CodeMirror's own default uses rgba for this reason.
     */
    ".cm-activeLine": {
      backgroundColor: "rgb(var(--cm-active-line) / var(--cm-active-line-alpha))",
    },
    ".cm-gutters": {
      backgroundColor: "rgb(var(--cm-gutter-bg))",
      color: "rgb(var(--cm-gutter-fg))",
      border: "none",
      borderRight: "1px solid rgb(var(--cm-gutter-border))",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgb(var(--cm-active-gutter-bg))",
      color: "rgb(var(--cm-active-gutter-fg))",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "rgb(var(--cm-fold-bg))",
      border: "1px solid rgb(var(--cm-fold-border))",
      color: "rgb(var(--cm-fold-fg))",
    },
    ".cm-tooltip": {
      backgroundColor: "rgb(var(--cm-tooltip-bg))",
      border: "1px solid rgb(var(--cm-tooltip-border))",
      color: "rgb(var(--cm-fg))",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "rgb(var(--cm-accent-soft))",
      color: "rgb(var(--cm-fg))",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgb(var(--cm-bracket-bg))",
      outline: "1px solid rgb(var(--cm-bracket-outline))",
    },
    ".cm-nonmatchingBracket": { color: "rgb(var(--cm-invalid))" },
    ".cm-panels": { backgroundColor: "rgb(var(--cm-panel-bg))", color: "rgb(var(--cm-fg))" },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid rgb(var(--cm-panel-border))" },
    ".cm-panels.cm-panels-bottom": { borderTop: "1px solid rgb(var(--cm-panel-border))" },
    ".cm-searchMatch": {
      backgroundColor: "rgb(var(--cm-search-bg))",
      outline: "1px solid rgb(var(--cm-search-outline))",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgb(var(--cm-search-selected))",
    },
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

/** Colours `+`/`-`/`@@` lines in the read-only unified diff tabs. */
function buildDiffDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let position = from;
    while (position <= to) {
      const line = view.state.doc.lineAt(position);
      const text = line.text;
      let className: string | null = null;
      if (text.startsWith("+++") || text.startsWith("---")) className = "cm-diff-meta";
      else if (text.startsWith("@@")) className = "cm-diff-hunk";
      else if (text.startsWith("+")) className = "cm-diff-add";
      else if (text.startsWith("-")) className = "cm-diff-del";
      if (className) builder.add(line.from, line.from, Decoration.line({ class: className }));
      position = line.to + 1;
    }
  }
  return builder.finish();
}

const diffHighlighting = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDiffDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDiffDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

type Props = {
  content: string;
  language: string;
  reveal?: RevealTarget | null;
  readOnly?: boolean;
  diff?: boolean;
  onChange: (value: string) => void;
  onCursor: (line: number, col: number) => void;
  onSave: () => void;
};

export default function CodeEditor({
  content,
  language,
  reveal,
  readOnly = false,
  diff = false,
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
        ...(readOnly
          ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
          : []),
        ...(diff ? [diffHighlighting] : []),
        syntaxHighlighting(highlight, { fallback: false }),
        codeTheme,
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
