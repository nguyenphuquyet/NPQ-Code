import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  FileDiff,
  FileText,
  FolderOpen,
  GitBranch,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Undo2,
} from "lucide-react";
import { api, type GitFile, type GitFileStatus } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useStudio } from "../lib/store";

const STATUS_LETTER: Record<GitFileStatus, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  copied: "C",
  conflicted: "U",
  untracked: "?",
};

const STATUS_COLOR: Record<GitFileStatus, string> = {
  modified: "text-vs-yellow",
  added: "text-vs-green",
  deleted: "text-vs-red",
  renamed: "text-vs-blue",
  copied: "text-vs-blue",
  conflicted: "text-vs-red",
  untracked: "text-vs-green",
};

function splitPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  if (index < 0) return { name: normalized, dir: "" };
  return { name: normalized.slice(index + 1), dir: normalized.slice(0, index) };
}

type RowProps = {
  file: GitFile;
  root: string;
  staged: boolean;
};

function FileRow({ file, root, staged }: RowProps) {
  const s = useStudio();
  const { t } = useI18n();
  const { name, dir } = splitPath(file.path);
  const deleted = file.status === "deleted";

  const open = () => {
    if (!staged && file.status === "untracked") {
      void s.openFile(`${root}/${file.path}`);
    } else {
      void s.openGitDiff(file.path, staged);
    }
  };

  return (
    <div className="group flex items-center gap-1 py-[3px] pl-1 pr-1 hover:bg-vs-hover">
      <button
        onClick={open}
        title={`${file.path} — ${t("git.viewDiff")}`}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <span
          className={`w-3.5 shrink-0 text-center font-mono text-[0.625rem] font-bold ${
            STATUS_COLOR[file.status]
          }`}
        >
          {STATUS_LETTER[file.status]}
        </span>
        <span className="truncate text-2xs text-vs-text">{name}</span>
        {dir && <span className="truncate text-[0.625rem] text-vs-dim">{dir}</span>}
      </button>

      <div className="flex shrink-0 items-center text-vs-dim opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        {!staged && !deleted && (
          <button
            onClick={() => void s.openFile(`${root}/${file.path}`)}
            title={t("git.openFile")}
            className="grid h-4 w-4 place-items-center rounded hover:bg-vs-select hover:text-vs-strong"
          >
            <FileText size={11} />
          </button>
        )}
        <button
          onClick={() => void s.openGitDiff(file.path, staged)}
          title={t("git.viewDiff")}
          className="grid h-4 w-4 place-items-center rounded hover:bg-vs-select hover:text-vs-strong"
        >
          <FileDiff size={11} />
        </button>
        {staged ? (
          <button
            onClick={() => void s.unstageGit([file.path])}
            title={t("git.unstage")}
            className="grid h-4 w-4 place-items-center rounded hover:bg-vs-select hover:text-vs-strong"
          >
            <Minus size={11} />
          </button>
        ) : (
          <>
            <button
              onClick={() => void s.stageGit([file.path])}
              title={t("git.stage")}
              className="grid h-4 w-4 place-items-center rounded hover:bg-vs-select hover:text-vs-strong"
            >
              <Plus size={11} />
            </button>
            <button
              onClick={() => {
                if (window.confirm(t("git.discardConfirm", { count: 1 }))) {
                  void s.discardGit([file.path]);
                }
              }}
              title={t("git.discard")}
              className="grid h-4 w-4 place-items-center rounded hover:bg-vs-select hover:text-vs-red"
            >
              <Undo2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type SectionProps = {
  title: string;
  files: GitFile[];
  root: string;
  staged: boolean;
  action?: { label: string; icon: "plus" | "minus"; run: () => void };
};

function Section({ title, files, root, staged, action }: SectionProps) {
  if (files.length === 0) return null;
  return (
    <div className="mb-1">
      <div className="flex h-6 items-center gap-1 pl-2 pr-1 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <ChevronDown size={11} className="shrink-0" />
          <span className="truncate">{title}</span>
          <span className="ml-0.5 shrink-0 rounded-full bg-vs-badge px-1.5 text-[0.625rem] font-normal">
            {files.length}
          </span>
        </div>
        {action && (
          <button
            onClick={action.run}
            title={action.label}
            className="grid h-4 w-4 place-items-center rounded text-vs-dim hover:bg-vs-hover hover:text-vs-strong"
          >
            {action.icon === "plus" ? <Plus size={11} /> : <Minus size={11} />}
          </button>
        )}
      </div>
      {files.map((file) => (
        <FileRow key={`${staged ? "s" : "w"}:${file.path}`} file={file} root={root} staged={staged} />
      ))}
    </div>
  );
}

export default function SourceControlPanel() {
  const s = useStudio();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const status = s.git.status;
  const root = (status?.repo_root ?? s.workspace?.path ?? "").replace(/[\\/]+$/, "");
  const staged = status?.staged ?? [];
  const changes = status?.changes ?? [];
  const untracked = status?.untracked ?? [];
  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;
  const dirtyCount = staged.length + changes.length + untracked.length;

  useEffect(() => {
    setMessage("");
    setPickerOpen(false);
  }, [s.workspace?.path]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  const togglePicker = async () => {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    setPickerOpen(true);
    if (!root) return;
    setBranchesLoading(true);
    try {
      const list = await api.gitBranches(root);
      setBranches(list.branches);
    } catch {
      setBranches(status?.branch ? [status.branch] : []);
    } finally {
      setBranchesLoading(false);
    }
  };

  if (!s.workspace) {
    return (
      <div className="flex h-full flex-col bg-vs-sidebar">
        <div className="flex h-7 shrink-0 items-center px-3 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
          {t("sidebar.sourceControl")}
        </div>
        <div className="px-4 py-6 text-2xs text-vs-dim">
          <p>{t("explorer.noFolder")}</p>
          <button
            onClick={() => s.setDialog("open")}
            className="mt-3 flex items-center gap-1.5 rounded bg-vs-button px-3 py-1.5 text-white hover:opacity-90"
          >
            <FolderOpen size={12} /> {t("git.openFolder")}
          </button>
        </div>
      </div>
    );
  }

  const commit = async () => {
    if (!message.trim() || staged.length === 0 || s.git.busy) return;
    const done = await s.commitGit(message);
    if (done) setMessage("");
  };

  return (
    <div className="flex h-full flex-col bg-vs-sidebar">
      <div className="flex h-7 shrink-0 items-center gap-1 px-2 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
        <span className="flex-1 truncate">{t("sidebar.sourceControl")}</span>
        {!s.git.loading && dirtyCount > 0 && (
          <span className="shrink-0 rounded-full bg-vs-badge px-1.5 text-[0.625rem] font-normal text-vs-text">
            {dirtyCount}
          </span>
        )}
        {s.git.loading && <Loader2 size={11} className="shrink-0 animate-spin" />}
        <button
          className="grid h-5 w-5 place-items-center rounded hover:bg-vs-hover"
          title={t("git.refresh")}
          onClick={() => void s.refreshGit()}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {s.git.error && (
        <div className="mx-2 mb-2 rounded border border-vs-red/50 bg-vs-red/10 px-2 py-1.5 text-2xs text-vs-red">
          {s.git.error}
        </div>
      )}

      {status && !status.is_repo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-2xs text-vs-dim">
          <GitBranch size={30} className="text-vs-dim/60" />
          <p className="font-semibold text-vs-text">{t("git.noRepoTitle")}</p>
          <p>{t("git.noRepoHint")}</p>
          <button
            onClick={() => void s.initGit()}
            disabled={s.git.busy}
            className="rounded bg-vs-accent px-3 py-1.5 text-white hover:opacity-90 disabled:opacity-60"
          >
            {t("git.init")}
          </button>
        </div>
      ) : (
        <>
          <div
            ref={pickerRef}
            className="relative mx-2 mb-2 flex items-center gap-1 rounded border border-vs-border bg-vs-input px-1.5 py-1"
          >
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <GitBranch size={12} className="shrink-0 text-vs-dim" />
              <button
                onClick={() => void togglePicker()}
                className="flex min-w-0 items-center gap-0.5 truncate text-2xs text-vs-strong hover:text-vs-accent"
                title={t("git.switchBranch")}
              >
                <span className="truncate">{status?.branch ?? t("git.detached")}</span>
                <ChevronDown size={11} className="shrink-0" />
              </button>
              {ahead > 0 && (
                <span
                  className="flex shrink-0 items-center text-[0.625rem] text-vs-dim"
                  title={t("git.ahead", { count: ahead })}
                >
                  <ArrowUp size={10} />
                  {ahead}
                </span>
              )}
              {behind > 0 && (
                <span
                  className="flex shrink-0 items-center text-[0.625rem] text-vs-dim"
                  title={t("git.behind", { count: behind })}
                >
                  <ArrowDown size={10} />
                  {behind}
                </span>
              )}
            </div>
            <button
              onClick={() => void s.pullGit()}
              disabled={s.git.busy}
              title={t("git.pull")}
              className="grid h-4 w-4 place-items-center rounded text-vs-dim hover:bg-vs-hover hover:text-vs-strong disabled:opacity-50"
            >
              <ArrowDown size={12} />
            </button>
            <button
              onClick={() => void s.pushGit()}
              disabled={s.git.busy}
              title={t("git.push")}
              className="grid h-4 w-4 place-items-center rounded text-vs-dim hover:bg-vs-hover hover:text-vs-strong disabled:opacity-50"
            >
              <ArrowUp size={12} />
            </button>

            {pickerOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-30 max-h-56 overflow-auto rounded border border-vs-border bg-vs-panel py-1 shadow-lg">
                {branchesLoading && (
                  <div className="flex items-center gap-1.5 px-2 py-1 text-2xs text-vs-dim">
                    <Loader2 size={11} className="animate-spin" /> {t("git.refresh")}
                  </div>
                )}
                {!branchesLoading &&
                  branches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        setPickerOpen(false);
                        if (branch !== status?.branch) void s.checkoutGit(branch);
                      }}
                      className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-2xs hover:bg-vs-hover ${
                        branch === status?.branch ? "text-vs-accent" : "text-vs-text"
                      }`}
                    >
                      <GitBranch size={11} className="shrink-0" />
                      <span className="truncate">{branch}</span>
                      {branch === status?.branch && <Check size={11} className="ml-auto shrink-0" />}
                    </button>
                  ))}
                {!branchesLoading && branches.length === 0 && (
                  <div className="px-2 py-1 text-2xs text-vs-dim">{t("git.detached")}</div>
                )}
              </div>
            )}
          </div>

          <div className="mx-2 mb-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  void commit();
                }
              }}
              rows={3}
              placeholder={t("git.commitPlaceholder")}
              className="w-full resize-none rounded border border-vs-border bg-vs-input px-2 py-1 text-2xs text-vs-text outline-none placeholder:text-vs-dim focus:border-vs-accent"
            />
            <button
              onClick={() => void commit()}
              disabled={!message.trim() || staged.length === 0 || s.git.busy}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded bg-vs-accent px-2 py-1 text-2xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={12} />
              {t("git.commit")}
              {staged.length > 0 && <span className="opacity-80">({staged.length})</span>}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto pb-2">
            {!s.git.loading && dirtyCount === 0 && !s.git.error && (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-2xs text-vs-dim">
                <Check size={22} className="text-vs-green" />
                {t("git.noChanges")}
              </div>
            )}

            <Section
              title={t("git.staged")}
              files={staged}
              root={root}
              staged
              action={{
                label: t("git.unstageAll"),
                icon: "minus",
                run: () => void s.unstageGit(staged.map((file) => file.path)),
              }}
            />
            <Section
              title={t("git.changes")}
              files={changes}
              root={root}
              staged={false}
              action={{
                label: t("git.stageAll"),
                icon: "plus",
                run: () => void s.stageGit(changes.map((file) => file.path)),
              }}
            />
            <Section
              title={t("git.untracked")}
              files={untracked}
              root={root}
              staged={false}
              action={{
                label: t("git.stageAll"),
                icon: "plus",
                run: () => void s.stageGit(untracked.map((file) => file.path)),
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
