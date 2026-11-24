import { copyText, readText } from "./clipboard";
import { getActiveEditor } from "./editorBridge";

/** Editor commands shared by the context menu and the menu bar. */

export function hasEditorSelection(): boolean {
  const editor = getActiveEditor();
  const selection = editor?.getSelection();
  return Boolean(selection && !selection.isEmpty());
}

function selectionText(): string {
  const editor = getActiveEditor();
  const model = editor?.getModel();
  const selection = editor?.getSelection();
  if (!model || !selection) return "";
  return model.getValueInRange(selection);
}

export function editorUndo() {
  getActiveEditor()?.trigger("menu", "undo", null);
}

export function editorRedo() {
  getActiveEditor()?.trigger("menu", "redo", null);
}

export function editorSelectAll() {
  const editor = getActiveEditor();
  const model = editor?.getModel();
  if (!editor || !model) return;
  editor.setSelection(model.getFullModelRange());
  editor.focus();
}

export function editorFind() {
  const editor = getActiveEditor();
  if (!editor) return;
  void editor.getAction("actions.find")?.run();
  editor.focus();
}

export async function editorCopy(): Promise<boolean> {
  const text = selectionText();
  if (!text) return false;
  return copyText(text);
}

export async function editorCut(): Promise<boolean> {
  const editor = getActiveEditor();
  const model = editor?.getModel();
  const selection = editor?.getSelection();
  if (!editor || !model || !selection || selection.isEmpty()) return false;
  await copyText(model.getValueInRange(selection));
  editor.executeEdits("cut", [{ range: selection, text: "", forceMoveMarkers: true }]);
  editor.focus();
  return true;
}

export async function editorPaste(): Promise<boolean> {
  const editor = getActiveEditor();
  const selection = editor?.getSelection();
  if (!editor || !selection) return false;
  const text = await readText();
  if (!text) return false;
  editor.executeEdits("paste", [{ range: selection, text, forceMoveMarkers: true }]);
  editor.focus();
  return true;
}

export function editorFormatDocument() {
  const editor = getActiveEditor();
  if (!editor) return;
  void editor.getAction("editor.action.formatDocument")?.run();
  editor.focus();
}

export function editorRenameSymbol() {
  const editor = getActiveEditor();
  if (!editor) return;
  void editor.getAction("editor.action.rename")?.run();
}

export function editorGoToDefinition() {
  const editor = getActiveEditor();
  if (!editor) return;
  void editor.getAction("editor.action.revealDefinition")?.run();
}
