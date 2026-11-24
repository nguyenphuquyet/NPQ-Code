import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import type { EditorLanguage } from "./api";
import type { ThemeId } from "./theme";

// Monaco ships its own language workers and Vite bundles them through the
// `new URL(..., import.meta.url)` calls in the ESM build, so no
// `MonacoEnvironment` override is needed here.
loader.config({ monaco });

/*
 * The shell paints itself from the `--syn-*` / `--cm-*` CSS variables in
 * `src/index.css`, but Monaco resolves theme colours in JavaScript, so the same
 * palette is mirrored here as hex values. Keep the two in sync when a theme
 * changes.
 */
type SyntaxPalette = {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  variable: string;
  type: string;
  property: string;
  operator: string;
  namespace: string;
  meta: string;
  tag: string;
  atom: string;
  link: string;
};

type ChromePalette = {
  bg: string;
  fg: string;
  caret: string;
  selection: string;
  inactiveSelection: string;
  selectionMatch: string;
  lineHighlight: string;
  gutterBg: string;
  gutterFg: string;
  gutterActiveFg: string;
  indentGuide: string;
  indentGuideActive: string;
  whitespace: string;
  bracketBg: string;
  bracketBorder: string;
  widgetBg: string;
  widgetBorder: string;
  inputBg: string;
  accent: string;
  hoverBg: string;
  listSelect: string;
  listSelectFg: string;
  scrollbar: string;
  scrollbarHover: string;
  searchMatch: string;
  searchOutline: string;
  error: string;
};

const LIGHT: SyntaxPalette = {
  keyword: "0000ff",
  string: "a31515",
  number: "098658",
  comment: "008000",
  function: "795e26",
  variable: "001080",
  type: "267f99",
  property: "001080",
  operator: "1f1f1f",
  namespace: "7b3fa0",
  meta: "0070c1",
  tag: "800000",
  atom: "7b3fa0",
  link: "0066b8",
};

const DARK: SyntaxPalette = {
  keyword: "569cd6",
  string: "ce9178",
  number: "b5cea8",
  comment: "6a9955",
  function: "dcdcaa",
  variable: "9cdcfe",
  type: "4ec9b0",
  property: "9cdcfe",
  operator: "d4d4d4",
  namespace: "4ec9b0",
  meta: "569cd6",
  tag: "569cd6",
  atom: "569cd6",
  link: "3794ff",
};

const HIGH_CONTRAST: SyntaxPalette = {
  ...DARK,
  comment: "7ca668",
  operator: "ffffff",
  link: "21a6ff",
};

const SOLARIZED: SyntaxPalette = {
  keyword: "859900",
  string: "2aa198",
  number: "d33682",
  comment: "93a1a1",
  function: "b58900",
  variable: "268bd2",
  type: "cb4b16",
  property: "268bd2",
  operator: "586e75",
  namespace: "cb4b16",
  meta: "268bd2",
  tag: "268bd2",
  atom: "d33682",
  link: "268bd2",
};

const LIGHT_CHROME: ChromePalette = {
  bg: "ffffff",
  fg: "1f1f1f",
  caret: "000000",
  selection: "add6ff",
  inactiveSelection: "add6ff80",
  selectionMatch: "c9e4fb",
  lineHighlight: "00000009",
  gutterBg: "ffffff",
  gutterFg: "6e7681",
  gutterActiveFg: "1f1f1f",
  indentGuide: "d3d3d3",
  indentGuideActive: "939393",
  whitespace: "d3d3d3",
  bracketBg: "e5f3ff",
  bracketBorder: "7fb4d9",
  widgetBg: "ffffff",
  widgetBorder: "c8c8c8",
  inputBg: "ffffff",
  accent: "0066b8",
  hoverBg: "f2f2f2",
  listSelect: "d7e8f8",
  listSelectFg: "1f1f1f",
  scrollbar: "c8c8c866",
  scrollbarHover: "a8a8a8b3",
  searchMatch: "ffe9a8",
  searchOutline: "e2c45c",
  error: "cd3131",
};

const DARK_CHROME: ChromePalette = {
  bg: "1e1e1e",
  fg: "d4d4d4",
  caret: "aeafad",
  selection: "264f78",
  inactiveSelection: "3a3d41",
  selectionMatch: "3a3d41",
  lineHighlight: "ffffff0a",
  gutterBg: "1e1e1e",
  gutterFg: "858585",
  gutterActiveFg: "c6c6c6",
  indentGuide: "404040",
  indentGuideActive: "707070",
  whitespace: "3b3b3b",
  bracketBg: "0064001a",
  bracketBorder: "888888",
  widgetBg: "252526",
  widgetBorder: "454545",
  inputBg: "3c3c3c",
  accent: "0078d4",
  hoverBg: "2a2d2e",
  listSelect: "094771",
  listSelectFg: "ffffff",
  scrollbar: "79797966",
  scrollbarHover: "646464b3",
  searchMatch: "613214",
  searchOutline: "a86432",
  error: "f44747",
};

const HIGH_CONTRAST_CHROME: ChromePalette = {
  ...DARK_CHROME,
  bg: "000000",
  fg: "ffffff",
  caret: "ffffff",
  selection: "0f4a85",
  inactiveSelection: "0f4a85",
  selectionMatch: "262626",
  lineHighlight: "ffffff1f",
  gutterBg: "000000",
  gutterFg: "c8c8c8",
  gutterActiveFg: "ffffff",
  indentGuide: "3c3c3c",
  bracketBg: "00000000",
  bracketBorder: "ffffff",
  widgetBg: "000000",
  widgetBorder: "6fc3df",
  inputBg: "000000",
  accent: "6fc3df",
  hoverBg: "141414",
  listSelect: "0f4a85",
  searchMatch: "7c4d00",
  searchOutline: "ffd700",
  error: "ff6a6a",
};

const SOLARIZED_CHROME: ChromePalette = {
  ...LIGHT_CHROME,
  bg: "fdf6e3",
  fg: "586e75",
  caret: "073642",
  selection: "dfd7be",
  inactiveSelection: "dfd7be80",
  selectionMatch: "e9e1c8",
  lineHighlight: "0000000b",
  gutterBg: "fdf6e3",
  gutterFg: "93a1a1",
  gutterActiveFg: "073642",
  indentGuide: "eee8d5",
  indentGuideActive: "93a1a1",
  whitespace: "eee8d5",
  widgetBg: "fdf6e3",
  widgetBorder: "d3cbb7",
  inputBg: "fdf6e3",
  accent: "268bd2",
  hoverBg: "eee8d5",
  listSelect: "eee8d5",
  listSelectFg: "073642",
  searchMatch: "ffe9a8",
  searchOutline: "e2c45c",
  error: "dc322f",
};

function tokenRules(palette: SyntaxPalette): monaco.editor.ITokenThemeRule[] {
  return [
    { token: "comment", foreground: palette.comment, fontStyle: "italic" },
    { token: "keyword", foreground: palette.keyword },
    { token: "keyword.control", foreground: palette.keyword },
    { token: "keyword.operator", foreground: palette.operator },
    { token: "string", foreground: palette.string },
    { token: "string.escape", foreground: palette.string },
    { token: "string.key.json", foreground: palette.property },
    { token: "string.value.json", foreground: palette.string },
    { token: "number", foreground: palette.number },
    { token: "regexp", foreground: palette.string },
    { token: "operator", foreground: palette.operator },
    { token: "delimiter", foreground: palette.operator },
    { token: "delimiter.bracket", foreground: palette.operator },
    { token: "type", foreground: palette.type },
    { token: "type.identifier", foreground: palette.type },
    { token: "identifier", foreground: palette.variable },
    { token: "variable", foreground: palette.variable },
    { token: "variable.predefined", foreground: palette.function },
    { token: "function", foreground: palette.function },
    { token: "tag", foreground: palette.tag },
    { token: "metatag", foreground: palette.tag },
    { token: "attribute.name", foreground: palette.property },
    { token: "attribute.value", foreground: palette.string },
    { token: "namespace", foreground: palette.namespace },
    { token: "annotation", foreground: palette.meta },
    { token: "predefined", foreground: palette.function },
    { token: "constant", foreground: palette.atom },
    { token: "key", foreground: palette.property },
  ];
}

function chromeColors(chrome: ChromePalette): monaco.editor.IColors {
  return {
    "editor.background": `#${chrome.bg}`,
    "editor.foreground": `#${chrome.fg}`,
    "editorLineNumber.foreground": `#${chrome.gutterFg}`,
    "editorLineNumber.activeForeground": `#${chrome.gutterActiveFg}`,
    "editorCursor.foreground": `#${chrome.caret}`,
    "editor.selectionBackground": `#${chrome.selection}`,
    "editor.inactiveSelectionBackground": `#${chrome.inactiveSelection}`,
    "editor.selectionHighlightBackground": `#${chrome.selectionMatch}`,
    "editor.lineHighlightBackground": `#${chrome.lineHighlight}`,
    "editor.lineHighlightBorder": "#00000000",
    "editorIndentGuide.background1": `#${chrome.indentGuide}`,
    "editorIndentGuide.activeBackground1": `#${chrome.indentGuideActive}`,
    "editorWhitespace.foreground": `#${chrome.whitespace}`,
    "editorBracketMatch.background": `#${chrome.bracketBg}`,
    "editorBracketMatch.border": `#${chrome.bracketBorder}`,
    "editorGutter.background": `#${chrome.gutterBg}`,
    "editorWidget.background": `#${chrome.widgetBg}`,
    "editorWidget.border": `#${chrome.widgetBorder}`,
    "editorWidget.foreground": `#${chrome.fg}`,
    "editorSuggestWidget.background": `#${chrome.widgetBg}`,
    "editorSuggestWidget.border": `#${chrome.widgetBorder}`,
    "editorSuggestWidget.selectedBackground": `#${chrome.listSelect}`,
    "editorSuggestWidget.selectedForeground": `#${chrome.listSelectFg}`,
    "editorHoverWidget.background": `#${chrome.widgetBg}`,
    "editorHoverWidget.border": `#${chrome.widgetBorder}`,
    "input.background": `#${chrome.inputBg}`,
    "input.border": `#${chrome.widgetBorder}`,
    "input.foreground": `#${chrome.fg}`,
    focusBorder: `#${chrome.accent}`,
    "list.hoverBackground": `#${chrome.hoverBg}`,
    "list.activeSelectionBackground": `#${chrome.listSelect}`,
    "list.activeSelectionForeground": `#${chrome.listSelectFg}`,
    "scrollbarSlider.background": `#${chrome.scrollbar}`,
    "scrollbarSlider.hoverBackground": `#${chrome.scrollbarHover}`,
    "scrollbarSlider.activeBackground": `#${chrome.scrollbarHover}`,
    "editor.findMatchBackground": `#${chrome.searchMatch}`,
    "editor.findMatchBorder": `#${chrome.searchOutline}`,
    "editor.findMatchHighlightBackground": `#${chrome.searchMatch}80`,
    "editor.rangeHighlightBackground": `#${chrome.listSelect}66`,
    "editorError.foreground": `#${chrome.error}`,
    "editorOverviewRuler.border": "#00000000",
    "editorOverviewRuler.findMatchForeground": `#${chrome.searchOutline}`,
  };
}

function defineTheme(id: string, base: "vs" | "vs-dark", syntax: SyntaxPalette, chrome: ChromePalette) {
  monaco.editor.defineTheme(id, {
    base,
    inherit: true,
    rules: tokenRules(syntax),
    colors: chromeColors(chrome),
  });
}

defineTheme("npq-light", "vs", LIGHT, LIGHT_CHROME);
defineTheme("npq-dark", "vs-dark", DARK, DARK_CHROME);
defineTheme("npq-hc", "vs-dark", HIGH_CONTRAST, HIGH_CONTRAST_CHROME);
defineTheme("npq-solarized", "vs", SOLARIZED, SOLARIZED_CHROME);

/** Monaco theme id for a shell theme. */
export function monacoThemeFor(theme: ThemeId): string {
  return `npq-${theme}`;
}

const LANGUAGE_IDS: Record<EditorLanguage, string> = {
  tsx: "typescript",
  ts: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  python: "python",
  rust: "rust",
  go: "go",
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  java: "java",
  kotlin: "kotlin",
  scala: "scala",
  dart: "dart",
  php: "php",
  ruby: "ruby",
  lua: "lua",
  sql: "sql",
  yaml: "yaml",
  markdown: "markdown",
  xml: "xml",
  shell: "shell",
  toml: "ini",
  powershell: "powershell",
  dockerfile: "dockerfile",
  ini: "ini",
  diff: "diff",
  text: "plaintext",
};

/** Maps the editor's own language ids onto Monaco's registered languages. */
export function monacoLanguage(language: EditorLanguage): string {
  return LANGUAGE_IDS[language] ?? "plaintext";
}

// JSX/TSX needs the compiler flag; the worker also picks the script kind from
// the model path, which `CodeEditor` keeps ending in `.tsx`/`.jsx`.
monaco.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.typescript.ScriptTarget.ES2020,
  jsx: monaco.typescript.JsxEmit.ReactJSX,
  allowNonTsExtensions: true,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
  moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
});
monaco.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.typescript.ScriptTarget.ES2020,
  jsx: monaco.typescript.JsxEmit.ReactJSX,
  allowNonTsExtensions: true,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
});

export { monaco };
