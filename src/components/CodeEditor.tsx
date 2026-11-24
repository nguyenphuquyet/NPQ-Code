import { useEffect, useMemo, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { getActiveEditor, setActiveEditor } from "../lib/editorBridge";
import { monaco, monacoLanguage, monacoThemeFor } from "../lib/monaco";
import { useStudio } from "../lib/store";
import { useTheme } from "../lib/theme";
import type { RevealTarget } from "../lib/store";
import type { EditorLanguage } from "../lib/api";

type Props = {
  path: string;
  content: string;
  language: EditorLanguage;
  reveal?: RevealTarget | null;
  readOnly?: boolean;
  diff?: boolean;
  onChange: (value: string) => void;
  onCursor: (line: number, col: number) => void;
  onSave: () => void;
};

/**
 * Monaco wrapper. The theme comes from `src/lib/monaco.ts`, and the font size
 * follows the shell zoom: the editor is anchored at 13px/18px when
 * `--ui-scale` sits at its 1.1 default, exactly like the previous CodeMirror
 * surface.
 */
export default function CodeEditor({
  path,
  content,
  language,
  reveal,
  readOnly = false,
  diff = false,
  onChange,
  onCursor,
  onSave,
}: Props) {
  const { theme } = useTheme();
  const studio = useStudio();
  const uiScale = studio.uiScale;
  const fontSize = Math.round((13 * uiScale) / 1.1);
  const lineHeight = Math.round((18 * uiScale) / 1.1);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);
  const onSaveRef = useRef(onSave);
  const readOnlyRef = useRef(readOnly);
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;
  onSaveRef.current = onSave;
  readOnlyRef.current = readOnly;

  /*
   * The model URI keeps the real extension so the TypeScript worker picks the
   * right script kind (JSX is only legal in a `.tsx`/`.jsx` model). Models are
   * disposed on unmount, so reusing the base name is safe.
   */
  const modelPath = useMemo(() => {
    const name = path.replace(/\\/g, "/").split("/").pop() || "untitled";
    return `file:///npq/${encodeURIComponent(name)}`;
  }, [path]);

  const applyDiffDecorations = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    if (!model) return;
    const decorations: MonacoEditor.IModelDeltaDecoration[] = [];
    for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber += 1) {
      const text = model.getLineContent(lineNumber);
      let kind: "add" | "del" | "hunk" | "meta" | null = null;
      if (text.startsWith("+++") || text.startsWith("---")) kind = "meta";
      else if (text.startsWith("@@")) kind = "hunk";
      else if (text.startsWith("+")) kind = "add";
      else if (text.startsWith("-")) kind = "del";
      if (!kind) continue;
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: `npq-diff-${kind}`,
          inlineClassName: kind === "hunk" || kind === "meta" ? `npq-diff-${kind}-text` : undefined,
        },
      });
    }
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    setActiveEditor(editor);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current();
    });
    editor.onDidChangeCursorPosition((event) => {
      onCursorRef.current(event.position.lineNumber, event.position.column);
    });
    onCursorRef.current(1, 1);
    if (diff) applyDiffDecorations(editor);
    editor.focus();
  };

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && getActiveEditor() === editor) setActiveEditor(null);
      editorRef.current = null;
    };
  }, []);

  // Jump to a search result / tree reveal without remounting the editor.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !reveal) return;
    const model = editor.getModel();
    if (!model) return;
    const lineNumber = Math.min(Math.max(1, reveal.line), model.getLineCount());
    const column = Math.min(Math.max(1, reveal.column), model.getLineMaxColumn(lineNumber));
    editor.setPosition({ lineNumber, column });
    editor.revealLineInCenter(lineNumber);
    editor.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.nonce]);

  // Read-only documents (git diffs) can be refreshed in place when the panel
  // re-opens them, so mirror prop updates into the existing model.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !readOnly) return;
    const model = editor.getModel();
    if (!model || model.getValue() === content) return;
    model.setValue(content);
    if (diff) applyDiffDecorations(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, readOnly, diff]);

  return (
    <Editor
      path={modelPath}
      defaultValue={content}
      language={monacoLanguage(language)}
      theme={monacoThemeFor(theme)}
      onMount={handleMount}
      onChange={(value) => {
        if (!readOnlyRef.current) onChangeRef.current(value ?? "");
      }}
      loading={<div className="h-full w-full" />}
      options={{
        fontSize,
        lineHeight,
        fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        wordWrap: "on",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "solid",
        cursorSmoothCaretAnimation: "off",
        renderLineHighlight: "line",
        padding: { top: 8, bottom: 12 },
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: true,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        tabSize: 2,
        automaticLayout: true,
        stickyScroll: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        contextmenu: true,
        quickSuggestions: true,
        readOnly,
        domReadOnly: readOnly,
        fixedOverflowWidgets: true,
      }}
    />
  );
}
