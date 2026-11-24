import type {
  FileMeta,
  FileNode,
  GitBranchList,
  GitFile,
  GitStatus,
  RecentWorkspace,
  SearchFile,
  TerminalDone,
  TerminalOutput,
  WorkspaceInfo,
} from "./api";
import { translate } from "./i18n";

/**
 * Browser-only demo backend used by `npm run dev` when the Tauri IPC bridge is
 * missing. It keeps a small in-memory workspace so the whole shell — explorer,
 * editor, search and terminal — can be exercised without the desktop runtime.
 * The Tauri build never reaches this module's data.
 */
export const demoWorkspace: WorkspaceInfo = {
  path: "/demo/npq-code",
  name: "npq-code-demo",
};

const files = new Map<string, string>();

function addFile(path: string, lines: string[]) {
  files.set(`${demoWorkspace.path}/${path}`, lines.join("\n"));
}

addFile("README.md", [
  "# NPQ Code demo",
  "",
  "This workspace only exists in the browser preview (`npm run dev`).",
  "The desktop build reads real folders from disk.",
  "",
  "## Try it",
  "",
  "- Open a file from the Explorer",
  "- Press Ctrl+Shift+F and search for `secure`",
  "- Press Ctrl+` and run `npm run build`",
]);

addFile("src/App.tsx", [
  'import { useMemo, useState } from "react";',
  "",
  "type Props = { title: string };",
  "",
  "export default function App({ title }: Props) {",
  "  const [count, setCount] = useState(0);",
  "  const label = useMemo(() => `${title} · ${count}`, [title, count]);",
  "",
  "  return (",
  '    <main className="app">',
  "      <h1>{label}</h1>",
  "      <button onClick={() => setCount((value) => value + 1)}>",
  "        Increment",
  "      </button>",
  "    </main>",
  "  );",
  "}",
]);

addFile("src/styles.css", [
  ":root {",
  "  color-scheme: light;",
  "  --bg: #ffffff;",
  "  --fg: #1f1f1f;",
  "  --accent: #007acc;",
  "}",
  "",
  "body {",
  "  margin: 0;",
  "  background: var(--bg);",
  "  color: var(--fg);",
  "  font-family: system-ui, sans-serif;",
  "}",
  "",
  ".app {",
  "  padding: 2rem;",
  "}",
]);

addFile("src/utils.py", [
  "from dataclasses import dataclass",
  "",
  "",
  "@dataclass",
  "class Release:",
  "    name: str",
  "    files: list[str]",
  "",
  "    def summary(self) -> str:",
  '        return f"{self.name}: {len(self.files)} files"',
  "",
  "",
  "def chunk(items: list[str], size: int = 10) -> list[list[str]]:",
  "    return [items[i : i + size] for i in range(0, len(items), size)]",
]);

addFile("infra/deploy.yaml", [
  "name: npq-code",
  "on:",
  "  push:",
  "    branches: [main]",
  "jobs:",
  "  build:",
  "    runs-on: windows-latest",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "      - run: npm ci && npm run build",
  "        env:",
  "          NODE_ENV: production",
]);

addFile("scripts/release.sh", [
  "#!/usr/bin/env bash",
  "set -euo pipefail",
  "",
  'VERSION="${1:-1.0.0}"',
  'echo "Building NPQ Code $VERSION"',
  'npm run build -- --mode production',
  'git tag -a "v$VERSION" -m "Release $VERSION"',
]);

addFile("Dockerfile", [
  "FROM node:20-alpine AS build",
  "WORKDIR /app",
  "COPY package*.json ./",
  "RUN npm ci",
  "COPY . .",
  "RUN npm run build",
  "",
  "FROM nginx:alpine",
  "COPY --from=build /app/dist /usr/share/nginx/html",
  "EXPOSE 80",
]);

/*
 * Media preview demo: the browser build cannot read the disk, so `img` sources
 * come from `demoAssetUrl` and these placeholders only exist to show the pane.
 */
addFile("assets/logo.png", []);
addFile("assets/demo.mp4", []);
addFile("assets/archive.zip", []);
addFile("docs/handbook.pdf", []);

const demoMediaSizes = new Map<string, number>([
  [`${demoWorkspace.path}/assets/logo.png`, 96_432],
  [`${demoWorkspace.path}/assets/demo.mp4`, 3_684_352],
  [`${demoWorkspace.path}/assets/archive.zip`, 1_204_880],
  [`${demoWorkspace.path}/docs/handbook.pdf`, 512_880],
]);

const demoAssetCache = new Map<string, string>();

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) =>
    char === "<" ? "&lt;" : char === ">" ? "&gt;" : char === "&" ? "&amp;" : char === '"' ? "&quot;" : "&apos;",
  );
}

/** SVG stand-in for image files in the browser demo. */
export function demoAssetUrl(path: string): string {
  const cached = demoAssetCache.get(path);
  if (cached) return cached;
  const name = escapeXml(path.split("/").pop() ?? "image");
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">',
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#0b3d63"/><stop offset="1" stop-color="#1f6feb"/></linearGradient></defs>',
    '<rect width="960" height="640" fill="url(#g)"/>',
    '<circle cx="760" cy="140" r="120" fill="#ffffff" opacity="0.08"/>',
    '<circle cx="180" cy="520" r="180" fill="#ffffff" opacity="0.06"/>',
    '<text x="80" y="300" font-family="Segoe UI, sans-serif" font-size="56" font-weight="700" fill="#ffffff">',
    "NPQ Code",
    "</text>",
    `<text x="80" y="360" font-family="Segoe UI, sans-serif" font-size="28" fill="#c9e2ff">${name}</text>`,
    '<text x="80" y="410" font-family="Segoe UI, sans-serif" font-size="20" fill="#9dc4ea">',
    "Demo image · desktop build shows the real file",
    "</text></svg>",
  ].join("");
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  demoAssetCache.set(path, url);
  return url;
}

addFile("package.json", [
  "{",
  '  "name": "npq-code-demo",',
  '  "private": true,',
  '  "version": "0.1.0",',
  '  "scripts": {',
  '    "dev": "vite",',
  '    "build": "vite build"',
  "  }",
  "}",
]);

function buildNode(path: string, name: string): FileNode {
  const prefix = `${path}/`;
  const children = new Map<string, { dir: boolean }>();
  for (const file of files.keys()) {
    if (!file.startsWith(prefix)) continue;
    const rest = file.slice(prefix.length);
    const [head, ...tail] = rest.split("/");
    const isDir = tail.length > 0;
    const existing = children.get(head);
    if (!existing || isDir) children.set(head, { dir: isDir });
  }

  return {
    name,
    path,
    is_dir: true,
    children: Array.from(children.entries())
      .sort(([a, aMeta], [b, bMeta]) =>
        aMeta.dir === bMeta.dir ? a.localeCompare(b) : aMeta.dir ? -1 : 1,
      )
      .map(([childName, meta]) =>
        meta.dir
          ? buildNode(`${path}/${childName}`, childName)
          : {
              name: childName,
              path: `${path}/${childName}`,
              is_dir: false,
              children: [],
            },
      ),
  };
}

const outputListeners = new Set<(line: TerminalOutput) => void>();
const doneListeners = new Set<(done: TerminalDone) => void>();
let nextCommandId = 1;

const recent: RecentWorkspace[] = [
  { path: demoWorkspace.path, name: demoWorkspace.name, opened_at: Date.now() },
];

/**
 * Fake repository so the Source Control panel can be exercised in the browser.
 * The desktop build talks to real `git` through the Rust commands.
 */
const demoGit = {
  branch: "main",
  ahead: 1,
  behind: 0,
  staged: [
    { path: "src/App.tsx", orig_path: null, status: "modified", staged: true },
  ] as GitFile[],
  changes: [
    { path: "src/styles.css", orig_path: null, status: "modified", staged: false },
    { path: "src/components/Button.tsx", orig_path: null, status: "deleted", staged: false },
  ] as GitFile[],
  untracked: [{ path: "notes.txt", orig_path: null, status: "untracked", staged: false }] as GitFile[],
};

function demoRelative(path: string) {
  const prefix = `${demoWorkspace.path}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path.split("/").pop() ?? path;
}

function demoMarkChanged(path: string) {
  const relative = demoRelative(path);
  const known =
    demoGit.staged.some((file) => file.path === relative) ||
    demoGit.changes.some((file) => file.path === relative) ||
    demoGit.untracked.some((file) => file.path === relative);
  if (known) return;
  demoGit.changes.push({
    path: relative,
    orig_path: null,
    status: "modified",
    staged: false,
  });
  demoGit.changes.sort((a, b) => a.path.localeCompare(b.path));
}

const demoDiff = (path: string, staged: boolean): string => {
  const file = [...demoGit.staged, ...demoGit.changes, ...demoGit.untracked].find(
    (item) => item.path === path,
  );
  if (!file) return "";
  if (file.status === "untracked" || (file.status === "added" && !staged)) {
    return [
      `diff --git a/${path} b/${path}`,
      "new file mode 100644",
      "--- /dev/null",
      `+++ b/${path}`,
      "@@ -0,0 +1,4 @@",
      `+// ${path}`,
      "+export const demo = true;",
      "+",
      "+export default demo;",
      "",
    ].join("\n");
  }
  if (file.status === "deleted") {
    return [
      `diff --git a/${path} b/${path}`,
      "deleted file mode 100644",
      `--- a/${path}`,
      "+++ /dev/null",
      "@@ -1,4 +0,0 @@",
      "-export function Button() {",
      "-  return <button>Click</button>;",
      "-}",
      "",
    ].join("\n");
  }
  return [
    `diff --git a/${path} b/${path}`,
    "index 8f3c2a1..4d7e9b0 100644",
    `--- a/${path}`,
    `+++ b/${path}`,
    "@@ -1,6 +1,7 @@",
    ' import { useMemo } from "react";',
    "",
    '-const version = "0.1.0";',
    '+const version = "0.2.0";',
    '+const author = "NPQ Code";',
    "",
    " export default function App() {",
    "",
  ].join("\n");
};

export const demoApi = {
  openWorkspace: async (path: string): Promise<WorkspaceInfo> => ({
    ...demoWorkspace,
    path,
  }),
  recentWorkspaces: async (): Promise<RecentWorkspace[]> => recent,
  removeRecent: async (path: string): Promise<void> => {
    const index = recent.findIndex((item) => item.path === path);
    if (index >= 0) recent.splice(index, 1);
  },
  listTree: async (path: string): Promise<FileNode> => buildNode(path, demoWorkspace.name),
  readFile: async (path: string): Promise<string> => {
    const content = files.get(path);
    if (content === undefined) throw new Error(`Demo backend: no such file ${path}`);
    return content;
  },
  readFileHead: async (path: string, limit?: number): Promise<string> => {
    const content = files.get(path);
    if (content === undefined) throw new Error(`Demo backend: no such file ${path}`);
    return content.slice(0, limit ?? 512 * 1024);
  },
  fileMeta: async (path: string): Promise<FileMeta> => ({
    size: demoMediaSizes.get(path) ?? files.get(path)?.length ?? 0,
    modified: Date.now(),
    is_dir: false,
  }),
  openExternal: async (): Promise<void> => {
    /* the browser demo has no shell to hand the file to */
  },
  revealPath: async (): Promise<void> => {
    /* the browser demo has no file manager */
  },
  writeFile: async (path: string, content: string): Promise<void> => {
    files.set(path, content);
    demoMarkChanged(path);
  },
  createFile: async (path: string): Promise<void> => {
    files.set(path, "");
    const relative = demoRelative(path);
    if (![...demoGit.staged, ...demoGit.changes, ...demoGit.untracked].some((f) => f.path === relative)) {
      demoGit.untracked.push({
        path: relative,
        orig_path: null,
        status: "untracked",
        staged: false,
      });
      demoGit.untracked.sort((a, b) => a.path.localeCompare(b.path));
    }
  },
  createDirectory: async (): Promise<void> => {
    /* folders are derived from file paths in the demo tree */
  },
  deletePath: async (path: string): Promise<void> => {
    for (const file of Array.from(files.keys())) {
      if (file === path || file.startsWith(`${path}/`)) files.delete(file);
    }
    const relative = demoRelative(path);
    const matches = (file: GitFile) => file.path === relative || file.path.startsWith(`${relative}/`);
    demoGit.staged = demoGit.staged.filter((file) => !matches(file));
    demoGit.changes = demoGit.changes.filter((file) => !matches(file));
    demoGit.untracked = demoGit.untracked.filter((file) => !matches(file));
  },
  renamePath: async (oldPath: string, newPath: string): Promise<void> => {
    for (const file of Array.from(files.keys())) {
      if (file !== oldPath && !file.startsWith(`${oldPath}/`)) continue;
      const content = files.get(file) ?? "";
      files.delete(file);
      files.set(newPath + file.slice(oldPath.length), content);
    }
    const from = demoRelative(oldPath);
    const to = demoRelative(newPath);
    for (const list of [demoGit.staged, demoGit.changes, demoGit.untracked]) {
      for (const file of list) {
        if (file.path === from || file.path.startsWith(`${from}/`)) {
          file.path = to + file.path.slice(from.length);
          file.status = "renamed";
          file.orig_path = file.orig_path ?? from;
        }
      }
    }
  },
  searchWorkspace: async (
    _root: string,
    query: string,
    caseSensitive: boolean,
  ): Promise<SearchFile[]> => {    const needle = caseSensitive ? query : query.toLowerCase();
    const results: SearchFile[] = [];
    for (const [path, content] of files) {
      const hits = content
        .split("\n")
        .map((line, index) => ({ line: index + 1, column: 1, content: line }))
        .filter((hit) => {
          const haystack = caseSensitive ? hit.content : hit.content.toLowerCase();
          return haystack.includes(needle);
        });
      if (hits.length > 0) {
        results.push({ path, name: path.split("/").pop() ?? path, hits });
      }
    }
    return results;
  },
  runCommand: async (_cwd: string, _command: string): Promise<number> => {
    const id = nextCommandId++;
    const lines = [translate("demo.browserOnly"), translate("demo.desktopOnly")];
    lines.forEach((line, index) => {
      window.setTimeout(() => {
        outputListeners.forEach((listener) => listener({ id, stream: "stderr", line }));
      }, 120 * (index + 1));
    });
    window.setTimeout(() => {
      doneListeners.forEach((listener) => listener({ id, code: 1, success: false }));
    }, 120 * (lines.length + 1));
    return id;
  },
  stopCommand: async (_id: number): Promise<void> => {
    /* the demo command finishes on its own */
  },
  stopAllCommands: async (): Promise<void> => {
    /* nothing is running */
  },
  gitStatus: async (root: string): Promise<GitStatus> => ({
    is_repo: true,
    repo_root: root,
    branch: demoGit.branch,
    upstream: `origin/${demoGit.branch}`,
    ahead: demoGit.ahead,
    behind: demoGit.behind,
    staged: demoGit.staged.map((file) => ({ ...file })),
    changes: demoGit.changes.map((file) => ({ ...file })),
    untracked: demoGit.untracked.map((file) => ({ ...file })),
  }),
  gitStage: async (_root: string, paths: string[]): Promise<string> => {
    const wanted = new Set(paths);
    const moved = [...demoGit.changes, ...demoGit.untracked].filter((file) => wanted.has(file.path));
    demoGit.changes = demoGit.changes.filter((file) => !wanted.has(file.path));
    demoGit.untracked = demoGit.untracked.filter((file) => !wanted.has(file.path));
    for (const file of moved) {
      demoGit.staged = [
        ...demoGit.staged.filter((item) => item.path !== file.path),
        { ...file, staged: true, status: file.status === "untracked" ? "added" : file.status },
      ];
    }
    demoGit.staged.sort((a, b) => a.path.localeCompare(b.path));
    return "";
  },
  gitUnstage: async (_root: string, paths: string[]): Promise<string> => {
    const wanted = new Set(paths);
    const moved = demoGit.staged.filter((file) => wanted.has(file.path));
    demoGit.staged = demoGit.staged.filter((file) => !wanted.has(file.path));
    for (const file of moved) {
      demoGit.changes = [
        ...demoGit.changes.filter((item) => item.path !== file.path),
        { ...file, staged: false, status: file.status === "added" ? "modified" : file.status },
      ];
    }
    demoGit.changes.sort((a, b) => a.path.localeCompare(b.path));
    return "";
  },
  gitDiscard: async (_root: string, paths: string[]): Promise<string> => {
    const wanted = new Set(paths);
    demoGit.changes = demoGit.changes.filter((file) => !wanted.has(file.path));
    demoGit.untracked = demoGit.untracked.filter((file) => !wanted.has(file.path));
    return "";
  },
  gitCommit: async (_root: string, message: string): Promise<string> => {
    if (!message.trim()) throw new Error("EMPTY_MESSAGE");
    if (demoGit.staged.length === 0) throw new Error("nothing to commit, working tree clean");
    demoGit.staged = [];
    demoGit.ahead += 1;
    return "[main] demo commit";
  },
  gitPush: async (): Promise<string> => {
    demoGit.ahead = 0;
    return "Everything up-to-date";
  },
  gitPull: async (): Promise<string> => {
    demoGit.behind = 0;
    return "Already up to date.";
  },
  gitInit: async (): Promise<string> => "Initialized empty Git repository",
  gitBranches: async (): Promise<GitBranchList> => ({
    current: demoGit.branch,
    branches: ["feat/source-control", "main"],
  }),
  gitCheckout: async (_root: string, branch: string): Promise<string> => {
    demoGit.branch = branch;
    return `Switched to branch '${branch}'`;
  },
  gitDiff: async (_root: string, path: string, staged: boolean): Promise<string> =>
    demoDiff(path, staged),
  pickDirectory: async (): Promise<string | null> => demoWorkspace.path,
};

export function demoOnTerminalOutput(cb: (line: TerminalOutput) => void) {
  outputListeners.add(cb);
  return () => outputListeners.delete(cb);
}

export function demoOnTerminalDone(cb: (done: TerminalDone) => void) {
  doneListeners.add(cb);
  return () => doneListeners.delete(cb);
}
