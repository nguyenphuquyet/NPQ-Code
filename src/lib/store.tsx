import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  api,
  fileLanguage,
  fileName,
  onTerminalDone,
  onTerminalOutput,
  type EditorLanguage,
  type FileNode,
  type GitStatus,
  type RecentWorkspace,
  type SearchFile,
  type WorkspaceInfo,
} from "./api";
import { useI18n } from "./i18n";

export type OpenFile = {
  path: string;
  name: string;
  language: EditorLanguage;
  content: string;
  dirty: boolean;
  /** Read-only documents (git diffs) never write back to disk. */
  readOnly?: boolean;
  /** Render as a unified diff with add/remove line colours. */
  diff?: boolean;
  /** Real file the document was derived from, for breadcrumbs. */
  sourcePath?: string;
};

export type GitState = {
  status: GitStatus | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
};

export type SidebarView = "explorer" | "search" | "git" | "extensions";
export type BottomTab = "problems" | "output" | "terminal";
export type LogStream = "stdout" | "stderr" | "info" | "error" | "system";
export type LogLine = { stream: LogStream; line: string };
export type RevealTarget = { path: string; line: number; column: number; nonce: number };

type SearchState = {
  query: string;
  caseSensitive: boolean;
  results: SearchFile[];
  running: boolean;
  error: string | null;
};

/**
 * UI zoom: `--ui-scale` multiplies the `html` font size, and every rem-based
 * Tailwind size follows it. Defaults to 1.1 so the light UI reads comfortably
 * on high-DPI screens.
 */
const UI_SCALE_KEY = "npqcode.uiScale";
const UI_SCALE_DEFAULT = 1.1;
const UI_SCALE_MIN = 0.8;
const UI_SCALE_MAX = 1.6;
const UI_SCALE_STEP = 0.05;

function clampScale(n: number) {
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(n * 100) / 100));
}

function readStoredScale() {
  try {
    const saved = Number(window.localStorage.getItem(UI_SCALE_KEY));
    if (Number.isFinite(saved) && saved >= UI_SCALE_MIN && saved <= UI_SCALE_MAX) {
      return clampScale(saved);
    }
  } catch {
    /* storage unavailable */
  }
  return UI_SCALE_DEFAULT;
}

function joinPath(dir: string, name: string) {
  return dir.replace(/[\\/]+$/, "") + "/" + name;
}

type StudioState = {
  workspace: WorkspaceInfo | null;
  tree: FileNode | null;
  recent: RecentWorkspace[];
  openFiles: OpenFile[];
  activePath: string | null;
  sidebarView: SidebarView;
  sidebarVisible: boolean;
  bottomVisible: boolean;
  bottomTab: BottomTab;
  output: LogLine[];
  terminal: LogLine[];
  terminalRunning: number | null;
  search: SearchState;
  searchFocusNonce: number;
  reveal: RevealTarget | null;
  quickOpen: boolean;
  cursor: { line: number; col: number };
  dialog: null | "open";
  toast: string | null;
  uiScale: number;
  settingsOpen: boolean;
  git: GitState;

  loadRecent: () => void;
  openWorkspace: (path: string) => Promise<void>;
  closeWorkspace: () => void;
  refreshTree: () => void;
  openFile: (path: string) => Promise<void>;
  openFileAt: (path: string, line?: number, column?: number) => Promise<void>;
  closeTab: (path: string) => void;
  closeOtherTabs: (path: string) => void;
  closeAllTabs: () => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveAll: () => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  newFile: (dir: string, name: string) => Promise<void>;
  newFolder: (dir: string, name: string) => Promise<void>;
  renamePath: (oldPath: string, newPath: string) => Promise<void>;
  runCommand: (command: string) => Promise<void>;
  stopCommand: () => Promise<void>;
  clearTerminal: () => void;
  clearOutput: () => void;
  appendOutput: (line: string, stream?: LogStream) => void;
  searchWorkspace: (query: string, caseSensitive: boolean) => Promise<void>;
  openSearch: () => void;
  setSidebarView: (view: SidebarView) => void;
  toggleSidebar: () => void;
  setBottomTab: (tab: BottomTab) => void;
  toggleTerminal: () => void;
  setBottomVisible: (visible: boolean) => void;
  setQuickOpen: (open: boolean) => void;
  setCursor: (line: number, col: number) => void;
  setDialog: (dialog: null | "open") => void;
  setSettingsOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  setUiScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  removeRecent: (path: string) => void;
  refreshGit: () => Promise<void>;
  stageGit: (paths: string[]) => Promise<void>;
  unstageGit: (paths: string[]) => Promise<void>;
  discardGit: (paths: string[]) => Promise<void>;
  commitGit: (message: string) => Promise<boolean>;
  pushGit: () => Promise<void>;
  pullGit: () => Promise<void>;
  initGit: () => Promise<void>;
  checkoutGit: (branch: string) => Promise<void>;
  openGitDiff: (path: string, staged: boolean) => Promise<void>;
};

const Ctx = createContext<StudioState | null>(null);

export function useStudio(): StudioState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStudio must be used inside <StudioProvider>");
  return value;
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("explorer");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [bottomVisible, setBottomVisible] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("terminal");
  const [output, setOutput] = useState<LogLine[]>([]);
  const [terminal, setTerminal] = useState<LogLine[]>([]);
  const [terminalRunning, setTerminalRunning] = useState<number | null>(null);
  const [search, setSearch] = useState<SearchState>({
    query: "",
    caseSensitive: false,
    results: [],
    running: false,
    error: null,
  });
  const [searchFocusNonce, setSearchFocusNonce] = useState(0);
  const [reveal, setReveal] = useState<RevealTarget | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [dialog, setDialog] = useState<null | "open">(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [uiScale, setUiScale] = useState(readStoredScale);
  const [git, setGit] = useState<GitState>({
    status: null,
    loading: false,
    busy: false,
    error: null,
  });
  const toastTimer = useRef<number | null>(null);
  const searchSeq = useRef(0);
  const gitSeq = useRef(0);
  const revealSeq = useRef(0);
  const finishedCommands = useRef<Set<number>>(new Set());

  // Apply + persist the UI zoom. `--ui-scale` is consumed by `html` in index.css.
  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
    try {
      window.localStorage.setItem(UI_SCALE_KEY, String(uiScale));
    } catch {
      /* storage unavailable */
    }
  }, [uiScale]);

  const zoomIn = useCallback(() => setUiScale((scale) => clampScale(scale + UI_SCALE_STEP)), []);
  const zoomOut = useCallback(() => setUiScale((scale) => clampScale(scale - UI_SCALE_STEP)), []);
  const resetZoom = useCallback(() => setUiScale(UI_SCALE_DEFAULT), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, resetZoom]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const appendOutput = useCallback((line: string, stream: LogStream = "info") => {
    setOutput((prev) => [...prev.slice(-500), { stream, line }]);
  }, []);

  /* ------------------------------------------------------------------ Git */

  const refreshGitFor = useCallback(
    async (root: string) => {
      const seq = ++gitSeq.current;
      setGit((prev) => ({ ...prev, loading: true }));
      try {
        const status = await api.gitStatus(root);
        if (gitSeq.current !== seq) return;
        setGit({ status, loading: false, busy: false, error: null });
      } catch (error) {
        if (gitSeq.current !== seq) return;
        const raw = String(error);
        setGit((prev) => ({
          ...prev,
          loading: false,
          busy: false,
          error: raw === "GIT_NOT_FOUND" ? t("git.notInstalled") : raw,
        }));
      }
    },
    [t],
  );

  const refreshGit = useCallback(async () => {
    if (!workspace) return;
    await refreshGitFor(workspace.path);
  }, [refreshGitFor, workspace]);

  const runGit = useCallback(
    async (action: (root: string) => Promise<unknown>, success?: string) => {
      if (!workspace) {
        showToast(t("msg.openFolderFirst"));
        return false;
      }
      const root = git.status?.repo_root ?? workspace.path;
      setGit((prev) => ({ ...prev, busy: true }));
      try {
        await action(root);
        await refreshGitFor(root);
        if (success) showToast(success);
        return true;
      } catch (error) {
        setGit((prev) => ({ ...prev, busy: false }));
        const raw = String(error);
        showToast(
          raw === "GIT_NOT_FOUND"
            ? t("git.notInstalled")
            : raw === "EMPTY_MESSAGE"
              ? t("git.emptyMessage")
              : t("git.actionFailed", { message: raw }),
        );
        return false;
      }
    },
    [git.status, refreshGitFor, showToast, t, workspace],
  );

  const stageGit = useCallback(
    async (paths: string[]) => {
      await runGit(
        (root) => api.gitStage(root, paths),
        t("git.stagedMsg", { count: paths.length }),
      );
    },
    [runGit, t],
  );

  const unstageGit = useCallback(
    async (paths: string[]) => {
      await runGit(
        (root) => api.gitUnstage(root, paths),
        t("git.unstagedMsg", { count: paths.length }),
      );
    },
    [runGit, t],
  );

  const discardGit = useCallback(
    async (paths: string[]) => {
      await runGit((root) => api.gitDiscard(root, paths), t("git.discardedMsg"));
    },
    [runGit, t],
  );

  const commitGit = useCallback(
    (message: string) => runGit((root) => api.gitCommit(root, message), t("git.committed")),
    [runGit, t],
  );

  const pushGit = useCallback(async () => {
    await runGit((root) => api.gitPush(root), t("git.pushed"));
  }, [runGit, t]);

  const pullGit = useCallback(async () => {
    await runGit((root) => api.gitPull(root), t("git.pulled"));
  }, [runGit, t]);

  const initGit = useCallback(async () => {
    await runGit((root) => api.gitInit(root), t("git.initDone"));
  }, [runGit, t]);

  const checkoutGit = useCallback(
    async (branch: string) => {
      await runGit((root) => api.gitCheckout(root, branch), t("git.checkedOut", { branch }));
    },
    [runGit, t],
  );

  const openGitDiff = useCallback(
    async (path: string, staged: boolean) => {
      if (!workspace) return;
      const root = (git.status?.repo_root ?? workspace.path).replace(/[\\/]+$/, "");
      const key = `git-diff:${staged ? "staged" : "worktree"}:${path}`;
      setActivePath(key);
      if (openFiles.some((file) => file.path === key)) return;
      try {
        const diff = await api.gitDiff(root, path, staged);
        const content = diff.trim() ? diff : t("git.noDiff");
        setOpenFiles((prev) =>
          prev.some((file) => file.path === key)
            ? prev
            : [
                ...prev,
                {
                  path: key,
                  name: `${fileName(path)} ${t("git.diffSuffix")}`,
                  language: "text",
                  content,
                  dirty: false,
                  readOnly: true,
                  diff: true,
                  sourcePath: `${root}/${path}`,
                },
              ],
        );
      } catch (error) {
        const raw = String(error);
        showToast(
          raw === "GIT_NOT_FOUND"
            ? t("git.notInstalled")
            : t("git.actionFailed", { message: raw }),
        );
        setActivePath((current) => (current === key ? null : current));
      }
    },
    [git.status, openFiles, showToast, t, workspace],
  );

  // Keep the panel fresh when the folder opens, on window focus, and (cheaply)
  // while the Source Control view is visible.
  useEffect(() => {
    if (!workspace) return;
    void refreshGitFor(workspace.path);
  }, [refreshGitFor, workspace]);

  useEffect(() => {
    if (!workspace || sidebarView !== "git") return;
    const timer = window.setInterval(() => void refreshGitFor(workspace.path), 6000);
    return () => window.clearInterval(timer);
  }, [refreshGitFor, sidebarView, workspace]);

  useEffect(() => {
    if (!workspace) return;
    const onFocus = () => void refreshGitFor(workspace.path);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshGitFor, workspace]);

  const loadRecent = useCallback(() => {
    api.recentWorkspaces().then(setRecent).catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
    let cancelled = false;
    let unOutput: (() => void) | undefined;
    let unDone: (() => void) | undefined;
    onTerminalOutput((event) => {
      setTerminal((prev) => [
        ...prev.slice(-2000),
        { stream: event.stream === "stderr" ? "stderr" : "stdout", line: event.line },
      ]);
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unOutput = unlisten;
    });
    onTerminalDone((done) => {
      setTerminalRunning((current) => (current === done.id ? null : current));
      finishedCommands.current.add(done.id);
      setTerminal((prev) => [
        ...prev.slice(-2000),
        {
          stream: done.success ? "system" : "error",
          line: t("terminal.exited", { code: done.code }),
        },
      ]);
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unDone = unlisten;
    });
    return () => {
      cancelled = true;
      unOutput?.();
      unDone?.();
    };
  }, [loadRecent, t]);

  const refreshTree = useCallback(() => {
    if (!workspace) return;
    api
      .listTree(workspace.path)
      .then(setTree)
      .catch((error) => showToast(String(error)));
    void refreshGit();
  }, [workspace, showToast, refreshGit]);

  const openFile = useCallback(
    async (path: string) => {
      setActivePath(path);
      if (openFiles.some((file) => file.path === path)) return;
      try {
        const content = await api.readFile(path);
        setOpenFiles((prev) => {
          if (prev.some((file) => file.path === path)) return prev;
          return [
            ...prev,
            { path, name: fileName(path), language: fileLanguage(path), content, dirty: false },
          ];
        });
      } catch (error) {
        showToast(String(error));
        setActivePath((current) => (current === path ? null : current));
      }
    },
    [openFiles, showToast],
  );

  const openFileAt = useCallback(
    async (path: string, line = 1, column = 1) => {
      await openFile(path);
      revealSeq.current += 1;
      setReveal({ path, line, column, nonce: revealSeq.current });
    },
    [openFile],
  );

  const openWorkspace = useCallback(
    async (path: string) => {
      try {
        const info = await api.openWorkspace(path);
        setWorkspace(info);
        setOpenFiles([]);
        setActivePath(null);
        setTerminal([]);
        setTerminalRunning(null);
        setSearch({ query: "", caseSensitive: false, results: [], running: false, error: null });
        setBottomVisible(false);
        setGit({ status: null, loading: false, busy: false, error: null });
        const nextTree = await api.listTree(info.path);
        setTree(nextTree);
        loadRecent();
        void refreshGitFor(info.path);
        appendOutput(t("msg.workspaceOpened", { path: info.path }));
        showToast(t("msg.opened", { name: info.name }));
        setSidebarView("explorer");
        setSidebarVisible(true);
      } catch (error) {
        showToast(String(error));
      }
    },
    [appendOutput, loadRecent, refreshGitFor, showToast, t],
  );

  const closeWorkspace = useCallback(() => {
    for (const file of openFiles) {
      if (file.dirty) void api.writeFile(file.path, file.content).catch(() => {});
    }
    void api.stopAllCommands().catch(() => {});
    setWorkspace(null);
    setTree(null);
    setOpenFiles([]);
    setActivePath(null);
    setTerminal([]);
    setTerminalRunning(null);
    setOutput([]);
    setSearch({ query: "", caseSensitive: false, results: [], running: false, error: null });
    setGit({ status: null, loading: false, busy: false, error: null });
    setBottomVisible(false);
    loadRecent();
  }, [loadRecent, openFiles]);

  const closeTab = useCallback(
    (path: string) => {
      const closing = openFiles.find((file) => file.path === path);
      if (closing?.dirty) void api.writeFile(path, closing.content).catch(() => {});
      setOpenFiles((prev) => {
        const next = prev.filter((file) => file.path !== path);
        if (activePath === path) {
          const index = prev.findIndex((file) => file.path === path);
          const nextActive = next[Math.min(index, Math.max(next.length - 1, 0))];
          setActivePath(nextActive ? nextActive.path : null);
        }
        return next;
      });
    },
    [activePath, openFiles],
  );

  const closeOtherTabs = useCallback(
    (path: string) => {
      for (const file of openFiles) {
        if (file.path !== path && file.dirty) void api.writeFile(file.path, file.content).catch(() => {});
      }
      setOpenFiles((prev) => prev.filter((file) => file.path === path));
      setActivePath(path);
    },
    [openFiles],
  );

  const closeAllTabs = useCallback(() => {
    for (const file of openFiles) {
      if (file.dirty) void api.writeFile(file.path, file.content).catch(() => {});
    }
    setOpenFiles([]);
    setActivePath(null);
  }, [openFiles]);

  const setActive = useCallback((path: string) => setActivePath(path), []);

  const updateContent = useCallback((path: string, content: string) => {
    setOpenFiles((prev) =>
      prev.map((file) =>
        file.path === path && !file.readOnly ? { ...file, content, dirty: true } : file,
      ),
    );
  }, []);

  const saveFile = useCallback(
    async (path: string) => {
      const file = openFiles.find((item) => item.path === path);
      if (!file || !file.dirty || file.readOnly) return;
      try {
        await api.writeFile(path, file.content);
        setOpenFiles((prev) =>
          prev.map((item) => (item.path === path ? { ...item, dirty: false } : item)),
        );
        appendOutput(t("msg.saved", { name: file.name }));
        showToast(t("msg.saved", { name: file.name }));
        void refreshGit();
      } catch (error) {
        appendOutput(String(error), "error");
        showToast(String(error));
      }
    },
    [appendOutput, openFiles, refreshGit, showToast, t],
  );

  const saveAll = useCallback(async () => {
    const dirtyFiles = openFiles.filter((file) => file.dirty && !file.readOnly);
    if (dirtyFiles.length === 0) return;
    try {
      for (const file of dirtyFiles) await api.writeFile(file.path, file.content);
      setOpenFiles((prev) =>
        prev.map((file) => (file.readOnly ? file : { ...file, dirty: false })),
      );
      appendOutput(t("msg.savedCount", { count: dirtyFiles.length }));
      showToast(t("msg.savedAll"));
      void refreshGit();
    } catch (error) {
      appendOutput(String(error), "error");
      showToast(String(error));
    }
  }, [appendOutput, openFiles, refreshGit, showToast, t]);

  const runCommand = useCallback(
    async (command: string) => {
      if (!workspace) {
        showToast(t("msg.openFolderFirst"));
        return;
      }
      const trimmed = command.trim();
      if (!trimmed) return;
      setBottomVisible(true);
      setBottomTab("terminal");
      setTerminal((prev) => [...prev.slice(-2000), { stream: "info", line: `$ ${trimmed}` }]);
      try {
        const id = await api.runCommand(workspace.path, trimmed);
        // A very fast command can report completion before this promise settles.
        if (finishedCommands.current.delete(id)) setTerminalRunning(null);
        else setTerminalRunning(id);
      } catch (error) {
        setTerminal((prev) => [...prev.slice(-2000), { stream: "error", line: String(error) }]);
        showToast(String(error));
      }
    },
    [showToast, t, workspace],
  );

  const stopCommand = useCallback(async () => {
    if (terminalRunning === null) return;
    try {
      await api.stopCommand(terminalRunning);
    } catch {
      /* already exited */
    }
  }, [terminalRunning]);

  const clearTerminal = useCallback(() => setTerminal([]), []);
  const clearOutput = useCallback(() => setOutput([]), []);

  const searchWorkspace = useCallback(
    async (query: string, caseSensitive: boolean) => {
      const seq = ++searchSeq.current;
      setSearch((prev) => ({ ...prev, query, caseSensitive, error: null }));
      if (!workspace || !query.trim()) {
        setSearch((prev) => ({ ...prev, results: [], running: false }));
        return;
      }
      setSearch((prev) => ({ ...prev, running: true }));
      try {
        const results = await api.searchWorkspace(workspace.path, query, caseSensitive);
        if (searchSeq.current === seq) {
          setSearch((prev) => ({ ...prev, results, running: false }));
        }
      } catch (error) {
        if (searchSeq.current === seq) {
          setSearch((prev) => ({ ...prev, running: false, error: String(error), results: [] }));
        }
      }
    },
    [workspace],
  );

  const openSearch = useCallback(() => {
    setSidebarView("search");
    setSidebarVisible(true);
    setSearchFocusNonce((nonce) => nonce + 1);
  }, []);

  const deleteFile = useCallback(
    async (path: string) => {
      try {
        await api.deletePath(path);
        setOpenFiles((prev) =>
          prev.filter(
            (file) => file.path !== path && !file.path.startsWith(path + "/") && !file.path.startsWith(path + "\\"),
          ),
        );
        setActivePath((current) =>
          current === path || current?.startsWith(path + "/") || current?.startsWith(path + "\\")
            ? null
            : current,
        );
        refreshTree();
        appendOutput(t("msg.deleted", { path }));
      } catch (error) {
        showToast(String(error));
      }
    },
    [appendOutput, refreshTree, showToast, t],
  );

  const newFile = useCallback(
    async (dir: string, name: string) => {
      const path = joinPath(dir, name);
      try {
        await api.createFile(path);
        refreshTree();
        await openFile(path);
      } catch (error) {
        showToast(String(error));
      }
    },
    [openFile, refreshTree, showToast],
  );

  const newFolder = useCallback(
    async (dir: string, name: string) => {
      try {
        await api.createDirectory(joinPath(dir, name));
        refreshTree();
      } catch (error) {
        showToast(String(error));
      }
    },
    [refreshTree, showToast],
  );

  const renamePath = useCallback(
    async (oldPath: string, newPath: string) => {
      if (oldPath === newPath) return;
      try {
        await api.renamePath(oldPath, newPath);
        const remap = (path: string) => {
          if (path === oldPath) return newPath;
          if (path.startsWith(oldPath + "/") || path.startsWith(oldPath + "\\")) {
            return newPath + path.slice(oldPath.length);
          }
          return path;
        };
        setOpenFiles((prev) =>
          prev.map((file) => {
            const path = remap(file.path);
            return path === file.path ? file : { ...file, path, name: fileName(path) };
          }),
        );
        setActivePath((current) => (current ? remap(current) : current));
        refreshTree();
        appendOutput(
          t("msg.renamed", { from: fileName(oldPath), to: fileName(newPath) }),
        );
      } catch (error) {
        showToast(String(error));
      }
    },
    [appendOutput, refreshTree, showToast, t],
  );

  const setBottomTabAndShow = useCallback((tab: BottomTab) => {
    setBottomTab(tab);
    setBottomVisible(true);
  }, []);

  const toggleTerminal = useCallback(() => {
    if (bottomVisible && bottomTab === "terminal") {
      setBottomVisible(false);
    } else {
      setBottomTab("terminal");
      setBottomVisible(true);
    }
  }, [bottomTab, bottomVisible]);

  // Editor-independent shortcuts, mirroring VS Code's defaults.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target;
      const insideEditor = target instanceof Element && target.closest(".cm-editor") !== null;
      const key = e.key.toLowerCase();
      if (key === "p" && !e.shiftKey) {
        e.preventDefault();
        if (workspace) setQuickOpen(true);
      } else if (key === "o" && !e.shiftKey) {
        e.preventDefault();
        setDialog("open");
      } else if (key === "s" && e.shiftKey) {
        e.preventDefault();
        void saveAll();
      } else if (key === "s") {
        if (insideEditor) return; // CodeMirror's own Mod-s binding handles this one
        e.preventDefault();
        if (activePath) void saveFile(activePath);
      } else if (key === "b" && !e.shiftKey) {
        e.preventDefault();
        setSidebarVisible((visible) => !visible);
      } else if (key === "`") {
        e.preventDefault();
        toggleTerminal();
      } else if (key === "w" && !e.shiftKey) {
        e.preventDefault();
        if (activePath) closeTab(activePath);
      } else if (key === "f" && e.shiftKey) {
        e.preventDefault();
        setSidebarView("search");
        setSidebarVisible(true);
        setSearchFocusNonce((nonce) => nonce + 1);
      } else if (key === "e" && e.shiftKey) {
        e.preventDefault();
        setSidebarView("explorer");
        setSidebarVisible(true);
      } else if (key === "m" && e.shiftKey) {
        e.preventDefault();
        setBottomTab("problems");
        setBottomVisible(true);
      } else if (key === "u" && e.shiftKey) {
        e.preventDefault();
        setBottomTab("output");
        setBottomVisible(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activePath, closeTab, saveAll, saveFile, toggleTerminal, workspace]);

  const value: StudioState = {
    workspace,
    tree,
    recent,
    openFiles,
    activePath,
    sidebarView,
    sidebarVisible,
    bottomVisible,
    bottomTab,
    output,
    terminal,
    terminalRunning,
    search,
    searchFocusNonce,
    reveal,
    quickOpen,
    cursor,
    dialog,
    toast,
    uiScale,
    settingsOpen,
    git,
    loadRecent,
    openWorkspace,
    closeWorkspace,
    refreshTree,
    openFile,
    openFileAt,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    setActive,
    updateContent,
    saveFile,
    saveAll,
    deleteFile,
    newFile,
    newFolder,
    renamePath,
    runCommand,
    stopCommand,
    clearTerminal,
    clearOutput,
    appendOutput,
    searchWorkspace,
    openSearch,
    setSidebarView: (view: SidebarView) => {
      setSidebarView(view);
      setSidebarVisible(true);
    },
    toggleSidebar: () => setSidebarVisible((visible) => !visible),
    setBottomTab: setBottomTabAndShow,
    toggleTerminal,
    setBottomVisible,
    setQuickOpen,
    setCursor: (line: number, col: number) => setCursor({ line, col }),
    setDialog,
    setSettingsOpen,
    showToast,
    setUiScale: (scale: number) => setUiScale(clampScale(scale)),
    zoomIn,
    zoomOut,
    resetZoom,
    removeRecent: (path: string) => {
      api.removeRecent(path).then(loadRecent).catch(() => {});
    },
    refreshGit,
    stageGit,
    unstageGit,
    discardGit,
    commitGit,
    pushGit,
    pullGit,
    initGit,
    checkoutGit,
    openGitDiff,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
