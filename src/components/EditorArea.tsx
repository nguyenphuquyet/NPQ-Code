import {
  ChevronRight,
  FileArchive,
  FileAudio,
  FileCode2,
  FileDiff,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Info,
  X,
} from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { fileLanguage, fileName, relativePath } from "../lib/api";
import type { PreviewKind } from "../lib/api";
import type { OpenFile } from "../lib/store";
import CodeEditor from "./CodeEditor";
import MediaPreview from "./MediaPreview";
import { useContextMenu } from "./ContextMenu";
import { copyText } from "../lib/clipboard";
import { getActiveEditor } from "../lib/editorBridge";
import {
  editorCopy,
  editorCut,
  editorFind,
  editorFormatDocument,
  editorGoToDefinition,
  editorPaste,
  editorRedo,
  editorRenameSymbol,
  editorSelectAll,
  editorUndo,
  hasEditorSelection,
} from "../lib/editorActions";

const PREVIEW_ICON: Record<PreviewKind, { icon: typeof ImageIcon; className: string }> = {
  image: { icon: ImageIcon, className: "text-vs-purple" },
  video: { icon: FileVideo, className: "text-vs-orange" },
  audio: { icon: FileAudio, className: "text-vs-green" },
  pdf: { icon: FileText, className: "text-vs-red" },
  binary: { icon: FileArchive, className: "text-vs-dim" },
};

function tabIcon(file: OpenFile) {
  if (file.diff) return <FileDiff size={13} className="text-vs-green" />;
  if (file.preview) {
    const { icon: Icon, className } = PREVIEW_ICON[file.preview];
    return <Icon size={13} className={className} />;
  }
  const name = (file.sourcePath ? fileName(file.sourcePath) : file.name).toLowerCase();
  if (name === "dockerfile" || name.startsWith("dockerfile.")) {
    return <FileCode2 size={13} className="text-vs-blue" />;
  }
  if (/\.(tsx?|jsx?|mjs|cjs|mts|cts)$/.test(name)) {
    return <FileCode2 size={13} className="text-vs-blue" />;
  }
  if (/\.(json|jsonc)$/.test(name)) return <FileCode2 size={13} className="text-vs-yellow" />;
  if (/\.(css|scss|sass|less)$/.test(name)) return <FileCode2 size={13} className="text-vs-orange" />;
  if (/\.(html?|xml|svg|xsl|xslt)$/.test(name)) return <FileCode2 size={13} className="text-vs-orange" />;
  if (/\.(md|markdown|txt)$/.test(name)) return <FileCode2 size={13} className="text-vs-dim" />;
  if (/\.(py|pyw|pyi|rb|rake|gemspec|php)$/.test(name)) {
    return <FileCode2 size={13} className="text-vs-green" />;
  }
  if (/\.(rs|c|cpp|cxx|cc|h|hpp|hxx|hh|cs|java|kt|kts|scala|dart|go|lua)$/.test(name)) {
    return <FileCode2 size={13} className="text-vs-orange" />;
  }
  if (/\.(ya?ml|toml|ini|cfg|conf|env|properties|sql)$/.test(name)) {
    return <FileCode2 size={13} className="text-vs-purple" />;
  }
  if (/\.(sh|bash|zsh|ksh|ps1|psm1|psd1)$/.test(name)) {
    return <FileCode2 size={13} className="text-vs-green" />;
  }
  return <FileCode2 size={13} className="text-vs-blue" />;
}

export default function EditorArea() {
  const s = useStudio();
  const { t } = useI18n();
  const ctx = useContextMenu();
  const active = s.openFiles.find((file) => file.path === s.activePath);

  const crumbs = active
    ? active.diff
      ? [fileName(active.sourcePath ?? active.path), t("git.diffSuffix")]
      : active.sourcePath
        ? [
            ...relativePath(s.workspace?.path ?? "", active.sourcePath).replace(/\\/g, "/").split("/"),
            t("preview.textSuffix"),
          ]
        : relativePath(s.workspace?.path ?? "", active.path).replace(/\\/g, "/").split("/")
    : [];

  const onEditorContextMenu = (event: ReactMouseEvent) => {
    const view = getActiveEditor();
    const readonly = Boolean(active?.diff);
    ctx.open(event, [
      {
        label: t("menu.goToDefinition"),
        shortcut: "F12",
        disabled: !view,
        action: editorGoToDefinition,
      },
      {
        label: t("menu.renameSymbol"),
        shortcut: "F2",
        disabled: !view || readonly,
        action: editorRenameSymbol,
      },
      {
        label: t("menu.formatDocument"),
        shortcut: "Shift+Alt+F",
        disabled: !view || readonly,
        action: editorFormatDocument,
      },
      { separator: true },
      { label: t("menu.undo"), shortcut: "Ctrl+Z", disabled: !view, action: editorUndo },
      { label: t("menu.redo"), shortcut: "Ctrl+Y", disabled: !view, action: editorRedo },
      { separator: true },
      { label: t("menu.cut"), shortcut: "Ctrl+X", disabled: !hasEditorSelection(), action: () => void editorCut() },
      { label: t("menu.copy"), shortcut: "Ctrl+C", disabled: !hasEditorSelection(), action: () => void editorCopy() },
      { label: t("menu.paste"), shortcut: "Ctrl+V", disabled: !view, action: () => void editorPaste() },
      { separator: true },
      { label: t("menu.selectAll"), shortcut: "Ctrl+A", disabled: !view, action: editorSelectAll },
      { label: `${t("menu.find")}…`, shortcut: "Ctrl+F", disabled: !view, action: editorFind },
      { separator: true },
      {
        label: t("editor.tabSave"),
        shortcut: "Ctrl+S",
        disabled: !active?.dirty,
        action: () => active && void s.saveFile(active.path),
      },
      { label: t("editor.tabCopyPath"), action: () => active && void copyText(active.path) },
    ]);
  };

  const onTabContextMenu = (event: ReactMouseEvent, path: string, dirty: boolean) => {
    ctx.open(event, [
      { label: t("editor.tabSave"), shortcut: "Ctrl+S", disabled: !dirty, action: () => void s.saveFile(path) },
      { separator: true },
      { label: t("editor.tabClose"), shortcut: "Ctrl+W", action: () => s.closeTab(path) },
      {
        label: t("editor.tabCloseOthers"),
        disabled: s.openFiles.length < 2,
        action: () => s.closeOtherTabs(path),
      },
      { label: t("editor.tabCloseAll"), action: () => s.closeAllTabs() },
      { separator: true },
      { label: t("editor.tabCopyPath"), action: () => void copyText(path) },
    ]);
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-vs-editor">
      {/* Tabs */}
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-vs-border bg-vs-panel">
        {s.openFiles.map((file) => {
          const isActive = file.path === s.activePath;
          return (
            <div
              key={file.path}
              onClick={() => s.setActive(file.path)}
              onAuxClick={(event) => {
                if (event.button === 1) s.closeTab(file.path);
              }}
              onContextMenu={(event) => onTabContextMenu(event, file.path, file.dirty)}
              className={`group flex min-w-[130px] max-w-[220px] cursor-pointer items-center gap-1.5 border-r border-t-2 border-vs-border px-3 text-2xs ${
                isActive
                  ? "border-t-vs-accent bg-vs-editor text-vs-strong"
                  : "border-t-transparent bg-vs-tab text-vs-dim hover:bg-vs-hover"
              }`}
            >
              {tabIcon(file)}
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              {file.dirty ? (
                <span
                  className="h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full bg-vs-modified group-hover:hidden"
                  onClick={(event) => {
                    event.stopPropagation();
                    void s.saveFile(file.path);
                  }}
                  title={t("editor.tabUnsaved")}
                />
              ) : null}
              <button
                className={`grid h-4 w-4 shrink-0 place-items-center rounded hover:bg-vs-badge ${
                  file.dirty ? "hidden group-hover:grid" : isActive ? "" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  s.closeTab(file.path);
                }}
                title={t("editor.tabClose")}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb */}
      {active && (
        <div className="flex h-6 shrink-0 items-center overflow-hidden border-b border-vs-border bg-vs-editor px-3 text-2xs text-vs-dim">
          {crumbs.map((part, index) => (
            <span key={index} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight size={10} className="shrink-0 text-vs-dim/70" />}
              <span className={`truncate ${index === crumbs.length - 1 ? "text-vs-strong" : ""}`}>
                {part}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="relative min-h-0 flex-1" onContextMenu={onEditorContextMenu}>
        {active ? (
          active.preview ? (
            <MediaPreview key={active.path} file={active} />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              {active.readOnly && active.sourcePath && (
                <div className="flex shrink-0 items-center gap-1.5 border-b border-vs-border bg-vs-panel px-3 py-1 text-2xs text-vs-dim">
                  <Info size={12} className="shrink-0 text-vs-accent" />
                  <span className="truncate">{t("preview.textPreviewBanner")}</span>
                </div>
              )}
              <div className="min-h-0 flex-1">
                <CodeEditor
                  key={active.path}
                  path={active.sourcePath ?? active.path}
                  content={active.content}
                  language={
                    active.diff ? "text" : fileLanguage(active.sourcePath ?? active.path)
                  }
                  readOnly={active.readOnly}
                  diff={active.diff}
                  reveal={s.reveal && s.reveal.path === active.path ? s.reveal : null}
                  onChange={(value) => s.updateContent(active.path, value)}
                  onCursor={(line, col) => s.setCursor(line, col)}
                  onSave={() => void s.saveFile(active.path)}
                />
              </div>
            </div>
          )
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="max-w-sm text-vs-dim">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-lg border border-vs-border bg-vs-sidebar">
                <FileCode2 size={30} className="text-vs-accent" />
              </div>
              <p className="mb-1 text-sm text-vs-strong">NPQ Code</p>
              <p className="text-2xs">{t("editor.emptyHint")}</p>
              <p className="mt-3 text-2xs">{t("editor.emptyQuick")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
