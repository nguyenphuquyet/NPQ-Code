import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Braces,
  ChevronRight,
  ClipboardCopy,
  FileCode2,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Image as ImageIcon,
  Palette,
  Pencil,
  RefreshCw,
  ScrollText,
  Trash2,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";
import type { FileNode } from "../lib/api";
import { useContextMenu } from "./ContextMenu";
import { copyText } from "../lib/clipboard";

function fileIcon(name: string) {
  const lower = name.toLowerCase();
  if (/\.(tsx?|jsx?|mjs|cjs|mts|cts)$/.test(lower)) {
    return <FileCode2 size={14} className="text-vs-blue" />;
  }
  if (/\.jsonc?$/.test(lower)) return <Braces size={14} className="text-vs-yellow" />;
  if (/\.(css|scss|sass|less)$/.test(lower)) return <Palette size={14} className="text-vs-orange" />;
  if (/\.(html?|xml|svg)$/.test(lower)) return <Globe size={14} className="text-vs-orange" />;
  if (/\.(md|markdown|txt)$/.test(lower)) return <ScrollText size={14} className="text-vs-dim" />;
  if (/\.(png|jpe?g|gif|webp|ico|bmp)$/.test(lower)) {
    return <ImageIcon size={14} className="text-vs-purple" />;
  }
  return <FileText size={14} className="text-vs-dim" />;
}

function parentDir(path: string) {
  return path.replace(/[\\/][^\\/]+$/, "");
}

/*
 * Explorer expansion is remembered per workspace, so closing and reopening the
 * app restores the same tree shape.
 */
const EXPANDED_PREFIX = "npqcode.tree.expanded:";

function readExpanded(workspacePath: string | undefined): Set<string> {
  if (!workspacePath) return new Set();
  try {
    const raw = window.localStorage.getItem(EXPANDED_PREFIX + workspacePath);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function saveExpanded(workspacePath: string | undefined, expanded: Set<string>) {
  if (!workspacePath) return;
  try {
    window.localStorage.setItem(EXPANDED_PREFIX + workspacePath, JSON.stringify([...expanded]));
  } catch {
    /* storage unavailable */
  }
}

type TreeProps = {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
};

function TreeNode({ node, depth, expanded, toggle }: TreeProps) {
  const s = useStudio();
  const { t } = useI18n();
  const ctx = useContextMenu();
  const isActive = s.activePath === node.path;
  const open = expanded.has(node.path);
  const openFile = s.openFiles.find((file) => file.path === node.path);

  const onContextMenu = (event: ReactMouseEvent) => {
    const items = node.is_dir
      ? [
          {
            label: t("explorer.newFile"),
            icon: <FilePlus2 size={12} />,
            action: () => {
              const name = window.prompt(t("tree.newFileName"));
              if (name) void s.newFile(node.path, name);
            },
          },
          {
            label: t("explorer.newFolder"),
            icon: <FolderPlus size={12} />,
            action: () => {
              const name = window.prompt(t("tree.newFolderName"));
              if (name) void s.newFolder(node.path, name);
            },
          },
          { separator: true as const },
        ]
      : [
          { label: t("tree.open"), icon: <FileCode2 size={12} />, action: () => void s.openFile(node.path) },
          { separator: true as const },
        ];

    ctx.open(event, [
      ...items,
      {
        label: t("tree.rename"),
        icon: <Pencil size={12} />,
        action: () => {
          const name = window.prompt(t("tree.renameName"), node.name);
          if (name && name !== node.name) {
            void s.renamePath(node.path, parentDir(node.path) + "/" + name);
          }
        },
      },
      { label: t("tree.copyPath"), icon: <ClipboardCopy size={12} />, action: () => void copyText(node.path) },
      {
        label: t("tree.refresh"),
        icon: <RefreshCw size={12} />,
        action: () => s.refreshTree(),
      },
      { separator: true },
      {
        label: t("tree.delete"),
        icon: <Trash2 size={12} />,
        danger: true,
        action: () => {
          if (window.confirm(t("tree.deleteConfirm", { name: node.name }))) void s.deleteFile(node.path);
        },
      },
    ]);
  };

  if (node.is_dir) {
    return (
      <div>
        <button
          className="flex w-full items-center gap-1 py-[3px] pr-2 text-left hover:bg-vs-hover"
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => toggle(node.path)}
          onContextMenu={onContextMenu}
        >
          <ChevronRight
            size={12}
            className={`shrink-0 text-vs-dim transition-transform ${open ? "rotate-90" : ""}`}
          />
          {open ? (
            <FolderOpen size={14} className="shrink-0 text-vs-accent" />
          ) : (
            <Folder size={14} className="shrink-0 text-vs-accent" />
          )}
          <span className="truncate text-2xs text-vs-text">{node.name}</span>
        </button>
        {open &&
          node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      className={`flex w-full items-center gap-1 py-[3px] pr-2 text-left hover:bg-vs-hover ${
        isActive ? "bg-vs-select" : ""
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
      onClick={() => void s.openFile(node.path)}
      onContextMenu={onContextMenu}
    >
      <span className="shrink-0" style={{ width: 12 }} />
      {fileIcon(node.name)}
      <span
        className={`truncate text-2xs ${
          isActive || openFile ? "text-vs-strong" : "text-vs-text"
        }`}
      >
        {node.name}
      </span>
      {openFile?.dirty && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-vs-modified" />}
    </button>
  );
}

export default function ProjectTree() {
  const s = useStudio();
  const { t } = useI18n();
  const workspacePath = s.workspace?.path;
  const [expanded, setExpanded] = useState<Set<string>>(() => readExpanded(workspacePath));

  // Load the remembered expansion for this folder (or start collapsed).
  useEffect(() => {
    setExpanded(readExpanded(workspacePath));
  }, [workspacePath]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      saveExpanded(workspacePath, next);
      return next;
    });
  };

  const collapseAll = () => {
    setExpanded(new Set());
    saveExpanded(workspacePath, new Set());
  };

  const createAtRoot = async (kind: "file" | "folder") => {
    if (!s.workspace) return;
    const name = window.prompt(
      kind === "file" ? t("tree.newFileName") : t("tree.newFolderName"),
    );
    if (!name) return;
    if (kind === "file") await s.newFile(s.workspace.path, name);
    else await s.newFolder(s.workspace.path, name);
  };

  if (!s.workspace) {
    return (
      <div className="flex h-full flex-col bg-vs-sidebar">
        <div className="flex h-7 shrink-0 items-center px-3 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
          {t("explorer.title")}
        </div>
        <div className="px-4 py-6 text-2xs text-vs-dim">
          <p>{t("explorer.noFolder")}</p>
          <button
            onClick={() => s.setDialog("open")}
            className="mt-3 rounded bg-vs-button px-3 py-1.5 text-white hover:opacity-90"
          >
            {t("explorer.openFolder")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-vs-sidebar">
      <div className="flex h-7 shrink-0 items-center gap-1 px-2 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
        <span className="flex-1">{t("explorer.title")}</span>
        <button
          className="grid h-5 w-5 place-items-center rounded hover:bg-vs-hover"
          title={t("explorer.newFile")}
          onClick={() => void createAtRoot("file")}
        >
          <FilePlus2 size={13} />
        </button>
        <button
          className="grid h-5 w-5 place-items-center rounded hover:bg-vs-hover"
          title={t("explorer.newFolder")}
          onClick={() => void createAtRoot("folder")}
        >
          <FolderPlus size={13} />
        </button>
        <button
          className="grid h-5 w-5 place-items-center rounded hover:bg-vs-hover"
          title={t("explorer.refresh")}
          onClick={() => s.refreshTree()}
        >
          <RefreshCw size={12} />
        </button>
        <button
          className="grid h-5 w-5 place-items-center rounded hover:bg-vs-hover"
          title={t("explorer.collapseAll")}
          onClick={collapseAll}
        >
          <ChevronRight size={12} />
        </button>
      </div>

      <div className="flex items-center gap-1 px-2 py-1 text-2xs font-bold uppercase tracking-wide text-vs-strong">
        <span className="truncate">{s.workspace.name}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-2">
        {s.tree?.children.map((child) => (
          <TreeNode key={child.path} node={child} depth={0} expanded={expanded} toggle={toggle} />
        ))}
        {s.tree && s.tree.children.length === 0 && (
          <div className="px-3 py-2 text-2xs text-vs-dim">{t("explorer.empty")}</div>
        )}
      </div>
    </div>
  );
}
