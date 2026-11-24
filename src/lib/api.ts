import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { demoApi, demoAssetUrl, demoOnTerminalDone, demoOnTerminalOutput } from "./demo";

/**
 * `npm run dev` also serves the UI in a plain browser, where the Tauri IPC
 * bridge does not exist. Detect it so the shell falls back to the in-memory
 * demo workspace instead of throwing during mount.
 */
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[];
};

export type WorkspaceInfo = {
  path: string;
  name: string;
};

export type RecentWorkspace = {
  path: string;
  name: string;
  opened_at: number;
};

export type SearchHit = {
  line: number;
  column: number;
  content: string;
};

export type SearchFile = {
  path: string;
  name: string;
  hits: SearchHit[];
};

export type TerminalOutput = {
  id: number;
  stream: "stdout" | "stderr";
  line: string;
};

export type TerminalDone = {
  id: number;
  code: number;
  success: boolean;
};

export type GitFileStatus =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "copied"
  | "conflicted"
  | "untracked";

export type GitFile = {
  path: string;
  orig_path: string | null;
  status: GitFileStatus;
  staged: boolean;
};

export type GitStatus = {
  is_repo: boolean;
  repo_root: string | null;
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: GitFile[];
  changes: GitFile[];
  untracked: GitFile[];
};

export type GitBranchList = {
  current: string | null;
  branches: string[];
};

export type FileMeta = {
  size: number;
  modified: number | null;
  is_dir: boolean;
};

/** Files the editor renders as a preview instead of a text buffer. */
export type PreviewKind = "image" | "video" | "audio" | "pdf" | "binary";

export type EditorLanguage =
  | "tsx"
  | "ts"
  | "js"
  | "jsx"
  | "json"
  | "html"
  | "css"
  | "scss"
  | "less"
  | "python"
  | "rust"
  | "go"
  | "c"
  | "cpp"
  | "csharp"
  | "java"
  | "kotlin"
  | "scala"
  | "dart"
  | "php"
  | "ruby"
  | "lua"
  | "sql"
  | "yaml"
  | "markdown"
  | "xml"
  | "shell"
  | "toml"
  | "powershell"
  | "dockerfile"
  | "ini"
  | "diff"
  | "text";

const tauriApi = {
  openWorkspace: (path: string) => invoke<WorkspaceInfo>("open_workspace", { path }),
  recentWorkspaces: () => invoke<RecentWorkspace[]>("recent_workspaces"),
  removeRecent: (path: string) => invoke<void>("remove_recent", { path }),
  listTree: (path: string) => invoke<FileNode>("list_tree", { path }),
  readFile: (path: string) => invoke<string>("read_file", { path }),
  readFileHead: (path: string, limit?: number) =>
    invoke<string>("read_file_head", { path, limit }),
  fileMeta: (path: string) => invoke<FileMeta>("file_meta", { path }),
  openExternal: (path: string) => invoke<void>("open_external", { path }),
  revealPath: (path: string) => invoke<void>("reveal_path", { path }),
  writeFile: (path: string, content: string) => invoke<void>("write_file", { path, content }),
  createFile: (path: string) => invoke<void>("create_file", { path }),
  createDirectory: (path: string) => invoke<void>("create_directory", { path }),
  deletePath: (path: string) => invoke<void>("delete_path", { path }),
  renamePath: (oldPath: string, newPath: string) =>
    invoke<void>("rename_path", { oldPath, newPath }),
  searchWorkspace: (root: string, query: string, caseSensitive: boolean) =>
    invoke<SearchFile[]>("search_workspace", { root, query, caseSensitive }),
  runCommand: (cwd: string, command: string) =>
    invoke<number>("run_command", { cwd, command }),
  stopCommand: (id: number) => invoke<void>("stop_command", { id }),
  stopAllCommands: () => invoke<void>("stop_all_commands"),
  gitStatus: (root: string) => invoke<GitStatus>("git_status", { root }),
  gitStage: (root: string, paths: string[]) => invoke<string>("git_stage", { root, paths }),
  gitUnstage: (root: string, paths: string[]) => invoke<string>("git_unstage", { root, paths }),
  gitDiscard: (root: string, paths: string[]) => invoke<string>("git_discard", { root, paths }),
  gitCommit: (root: string, message: string) =>
    invoke<string>("git_commit", { root, message }),
  gitPush: (root: string) => invoke<string>("git_push", { root }),
  gitPull: (root: string) => invoke<string>("git_pull", { root }),
  gitInit: (root: string) => invoke<string>("git_init", { root }),
  gitBranches: (root: string) => invoke<GitBranchList>("git_branches", { root }),
  gitCheckout: (root: string, branch: string) =>
    invoke<string>("git_checkout", { root, branch }),
  gitDiff: (root: string, path: string, staged: boolean) =>
    invoke<string>("git_diff", { root, path, staged }),
  pickDirectory: async () =>
    (await openDialog({ directory: true, multiple: false })) as string | null,
};

/** Real Tauri IPC, or the in-memory demo workspace during browser preview. */
export const api: typeof tauriApi = isTauri ? tauriApi : demoApi;

export function onTerminalOutput(cb: (line: TerminalOutput) => void): Promise<UnlistenFn> {
  if (!isTauri) return Promise.resolve(demoOnTerminalOutput(cb));
  return listen<TerminalOutput>("terminal-output", (e) => cb(e.payload));
}
export function onTerminalDone(cb: (done: TerminalDone) => void): Promise<UnlistenFn> {
  if (!isTauri) return Promise.resolve(demoOnTerminalDone(cb));
  return listen<TerminalDone>("terminal-done", (e) => cb(e.payload));
}

const LANGUAGE_BY_EXTENSION: Record<string, EditorLanguage> = {
  tsx: "tsx",
  ts: "ts",
  mts: "ts",
  cts: "ts",
  js: "js",
  mjs: "js",
  cjs: "js",
  jsx: "jsx",
  json: "json",
  jsonc: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  xml: "xml",
  xsl: "xml",
  xslt: "xml",
  svg: "xml",
  plist: "xml",
  py: "python",
  pyw: "python",
  pyi: "python",
  rs: "rust",
  go: "go",
  c: "c",
  h: "c",
  cpp: "cpp",
  cxx: "cpp",
  cc: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  hh: "cpp",
  cs: "csharp",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  sc: "scala",
  dart: "dart",
  php: "php",
  phtml: "php",
  rb: "ruby",
  rake: "ruby",
  gemspec: "ruby",
  lua: "lua",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  markdown: "markdown",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ksh: "shell",
  toml: "toml",
  ps1: "powershell",
  psm1: "powershell",
  psd1: "powershell",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  properties: "ini",
  env: "ini",
  diff: "diff",
  patch: "diff",
};

export function fileLanguage(path: string): EditorLanguage {
  const name = fileName(path).toLowerCase();
  if (name === "dockerfile" || name.startsWith("dockerfile.") || name === "containerfile") {
    return "dockerfile";
  }
  if (name === ".env" || name.startsWith(".env.")) return "ini";
  const extension = name.split(".").pop() ?? "";
  return LANGUAGE_BY_EXTENSION[extension] ?? "text";
}

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "jfif",
  "gif",
  "webp",
  "bmp",
  "ico",
  "avif",
  "apng",
  "tif",
  "tiff",
]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "mov", "m4v", "mkv", "avi", "wmv", "flv"]);
const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "oga",
  "m4a",
  "aac",
  "flac",
  "opus",
  "weba",
  "wma",
  "mid",
  "midi",
]);
const BINARY_EXTENSIONS = new Set([
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "bz2",
  "xz",
  "zst",
  "tgz",
  "exe",
  "msi",
  "dll",
  "so",
  "dylib",
  "bin",
  "dat",
  "class",
  "jar",
  "war",
  "wasm",
  "pyc",
  "pyd",
  "o",
  "obj",
  "lib",
  "a",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "rtf",
  "psd",
  "ai",
  "eps",
  "sketch",
  "fig",
  "ttf",
  "otf",
  "woff",
  "woff2",
  "eot",
  "db",
  "sqlite",
  "sqlite3",
  "mdb",
  "iso",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "apk",
  "aab",
  "ipa",
  "blend",
  "fbx",
  "stl",
  "unitypackage",
]);

/**
 * Binary and media files get a dedicated preview pane; everything else
 * (`null`) opens as an editable text buffer.
 */
export function previewKind(path: string): PreviewKind | null {
  const name = fileName(path).toLowerCase();
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1) : "";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (extension === "pdf") return "pdf";
  if (BINARY_EXTENSIONS.has(extension)) return "binary";
  return null;
}

/** Local files become `asset://` URLs inside the Tauri webview. */
export function assetUrl(path: string): string {
  if (!isTauri) return demoAssetUrl(path);
  return convertFileSrc(path);
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) return "";
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function fileName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

/** Path relative to the workspace root, using forward slashes. */
export function relativePath(root: string, path: string): string {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/\/+$/, "");
  const base = normalize(root);
  const full = normalize(path);
  if (full === base) return fileName(full);
  if (full.startsWith(base + "/")) return full.slice(base.length + 1);
  return full;
}

export type FlatFile = { path: string; name: string; relative: string };

/** Every file in the tree, in display order — used by quick open. */
export function flattenFiles(node: FileNode | null, root = "", out: FlatFile[] = []): FlatFile[] {
  if (!node) return out;
  if (!node.is_dir) {
    out.push({ path: node.path, name: node.name, relative: relativePath(root || node.path, node.path) });
    return out;
  }
  for (const child of node.children) flattenFiles(child, root || node.path, out);
  return out;
}
