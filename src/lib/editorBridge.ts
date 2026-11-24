import type { editor as MonacoEditor } from "monaco-editor";

/**
 * The Monaco editor currently mounted in the editor area.
 *
 * The context menu and the menu bar act on the editor from the outside, while
 * Monaco owns its instance inside `CodeEditor`, so the active editor is
 * published here (same idea as the `window.__TAURI_INTERNALS__` bridge).
 */
let activeEditor: MonacoEditor.IStandaloneCodeEditor | null = null;

export function setActiveEditor(editor: MonacoEditor.IStandaloneCodeEditor | null) {
  activeEditor = editor;
}

export function getActiveEditor(): MonacoEditor.IStandaloneCodeEditor | null {
  return activeEditor;
}
