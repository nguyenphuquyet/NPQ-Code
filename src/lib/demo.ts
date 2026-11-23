import type {
  FileNode,
  RecentWorkspace,
  SearchFile,
  TerminalDone,
  TerminalOutput,
  WorkspaceInfo,
} from "./api";

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
  writeFile: async (path: string, content: string): Promise<void> => {
    files.set(path, content);
  },
  createFile: async (path: string): Promise<void> => {
    files.set(path, "");
  },
  createDirectory: async (): Promise<void> => {
    /* folders are derived from file paths in the demo tree */
  },
  deletePath: async (path: string): Promise<void> => {
    for (const file of Array.from(files.keys())) {
      if (file === path || file.startsWith(`${path}/`)) files.delete(file);
    }
  },
  renamePath: async (oldPath: string, newPath: string): Promise<void> => {
    for (const file of Array.from(files.keys())) {
      if (file !== oldPath && !file.startsWith(`${oldPath}/`)) continue;
      const content = files.get(file) ?? "";
      files.delete(file);
      files.set(newPath + file.slice(oldPath.length), content);
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
    const lines = [
      "This is the browser demo — commands run only in the desktop app.",
      "Open the Tauri build to use a real shell in this folder.",
    ];
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
