import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { demoApi, demoOnTerminalDone, demoOnTerminalOutput } from "./demo";

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

export type EditorLanguage =
  | "tsx"
  | "ts"
  | "js"
  | "jsx"
  | "json"
  | "html"
  | "css"
  | "text";

const tauriApi = {
  openWorkspace: (path: string) => invoke<WorkspaceInfo>("open_workspace", { path }),
  recentWorkspaces: () => invoke<RecentWorkspace[]>("recent_workspaces"),
  removeRecent: (path: string) => invoke<void>("remove_recent", { path }),
  listTree: (path: string) => invoke<FileNode>("list_tree", { path }),
  readFile: (path: string) => invoke<string>("read_file", { path }),
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
  xml: "html",
  svg: "html",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",
};

export function fileLanguage(path: string): EditorLanguage {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXTENSION[extension] ?? "text";
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
