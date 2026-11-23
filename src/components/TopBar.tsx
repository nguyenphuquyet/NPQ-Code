import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  Code2,
  Copy,
  Eraser,
  FolderOpen,
  MinusSquare,
  Redo2,
  Save,
  SaveAll,
  Search,
  Scissors,
  Square,
  TerminalSquare,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { isInteractive, warmWindow, winAction } from "../lib/window";
import {
  editorCopy,
  editorCut,
  editorFind,
  editorPaste,
  editorRedo,
  editorSelectAll,
  editorUndo,
} from "../lib/editorActions";

type MenuItem =
  | { separator: true }
  | {
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      action: string;
      disabled?: boolean;
    };

const MENU_NAMES = ["File", "Edit", "Selection", "View", "Go", "Terminal", "Help"] as const;

export default function TopBar() {
  const s = useStudio();
  const { t } = useI18n();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    warmWindow();
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const dismiss = (event: MouseEvent) => {
      if (menusRef.current?.contains(event.target as Node)) return;
      setOpenMenu(null);
    };
    const onBlur = () => setOpenMenu(null);
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", dismiss, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", dismiss, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [openMenu]);

  const activeFile = s.openFiles.find((file) => file.path === s.activePath);
  const hasDirty = s.openFiles.some((file) => file.dirty);

  const perform = (action: string) => {
    setOpenMenu(null);
    switch (action) {
      case "openFolder": s.setDialog("open"); break;
      case "save": if (s.activePath) void s.saveFile(s.activePath); break;
      case "saveAll": void s.saveAll(); break;
      case "closeEditor": if (s.activePath) s.closeTab(s.activePath); break;
      case "closeFolder": s.closeWorkspace(); break;
      case "exit": void winAction("close"); break;
      case "undo": editorUndo(); break;
      case "redo": editorRedo(); break;
      case "cut": void editorCut(); break;
      case "copy": void editorCopy(); break;
      case "paste": void editorPaste(); break;
      case "selectAll": editorSelectAll(); break;
      case "find": editorFind(); break;
      case "explorer": s.setSidebarView("explorer"); break;
      case "search": s.openSearch(); break;
      case "output": s.setBottomTab("output"); break;
      case "problems": s.setBottomTab("problems"); break;
      case "terminal": s.setBottomTab("terminal"); break;
      case "toggleSidebar": s.toggleSidebar(); break;
      case "toggleTerminal": s.toggleTerminal(); break;
      case "clearTerminal": s.clearTerminal(); break;
      case "stopCommand": void s.stopCommand(); break;
      case "quickOpen": if (s.workspace) s.setQuickOpen(true); break;
      case "zoomIn": s.zoomIn(); break;
      case "zoomOut": s.zoomOut(); break;
      case "zoomReset": s.resetZoom(); break;
      case "settings": s.setSettingsOpen(true); break;
      case "about": s.showToast(t("msg.about")); break;
      case "shortcuts":
        s.showToast(t("msg.shortcuts"));
        break;
    }
  };

  const menus: Record<(typeof MENU_NAMES)[number], MenuItem[]> = {
    File: [
      { label: t("menu.openFolder"), icon: <FolderOpen size={13} />, shortcut: "Ctrl+O", action: "openFolder" },
      { separator: true },
      {
        label: t("menu.save"),
        icon: <Save size={13} />,
        shortcut: "Ctrl+S",
        action: "save",
        disabled: !activeFile?.dirty,
      },
      {
        label: t("menu.saveAll"),
        icon: <SaveAll size={13} />,
        shortcut: "Ctrl+Shift+S",
        action: "saveAll",
        disabled: !hasDirty,
      },
      { separator: true },
      {
        label: t("menu.closeEditor"),
        icon: <X size={13} />,
        shortcut: "Ctrl+W",
        action: "closeEditor",
        disabled: !activeFile,
      },
      {
        label: t("menu.closeFolder"),
        icon: <FolderOpen size={13} />,
        action: "closeFolder",
        disabled: !s.workspace,
      },
      { separator: true },
      { label: t("menu.exit"), icon: <MinusSquare size={13} />, action: "exit" },
    ],
    Edit: [
      { label: t("menu.undo"), icon: <Undo2 size={13} />, shortcut: "Ctrl+Z", action: "undo", disabled: !activeFile },
      { label: t("menu.redo"), icon: <Redo2 size={13} />, shortcut: "Ctrl+Y", action: "redo", disabled: !activeFile },
      { separator: true },
      { label: t("menu.cut"), icon: <Scissors size={13} />, shortcut: "Ctrl+X", action: "cut", disabled: !activeFile },
      { label: t("menu.copy"), icon: <Copy size={13} />, shortcut: "Ctrl+C", action: "copy", disabled: !activeFile },
      { label: t("menu.paste"), icon: <Copy size={13} />, shortcut: "Ctrl+V", action: "paste", disabled: !activeFile },
      { separator: true },
      { label: t("menu.find"), shortcut: "Ctrl+F", action: "find", disabled: !activeFile },
    ],
    Selection: [
      { label: t("menu.selectAll"), shortcut: "Ctrl+A", action: "selectAll", disabled: !activeFile },
    ],
    View: [
      { label: t("menu.explorer"), shortcut: "Ctrl+Shift+E", action: "explorer" },
      { label: t("menu.search"), shortcut: "Ctrl+Shift+F", action: "search" },
      { label: t("menu.problems"), shortcut: "Ctrl+Shift+M", action: "problems" },
      { label: t("menu.output"), shortcut: "Ctrl+Shift+U", action: "output" },
      { label: t("menu.terminal"), shortcut: "Ctrl+`", action: "terminal" },
      { separator: true },
      { label: t("menu.toggleSideBar"), shortcut: "Ctrl+B", action: "toggleSidebar" },
      { label: t("menu.toggleTerminal"), shortcut: "Ctrl+`", action: "toggleTerminal" },
      { separator: true },
      { label: t("menu.zoomIn"), icon: <ZoomIn size={13} />, shortcut: "Ctrl+=", action: "zoomIn" },
      { label: t("menu.zoomOut"), icon: <ZoomOut size={13} />, shortcut: "Ctrl+-", action: "zoomOut" },
      { label: t("menu.zoomReset"), shortcut: "Ctrl+0", action: "zoomReset" },
    ],
    Go: [
      {
        label: t("menu.goToFile"),
        icon: <Search size={13} />,
        shortcut: "Ctrl+P",
        action: "quickOpen",
        disabled: !s.workspace,
      },
    ],
    Terminal: [
      {
        label:
          s.bottomVisible && s.bottomTab === "terminal"
            ? t("menu.hideTerminal")
            : t("menu.showTerminal"),
        icon: <TerminalSquare size={13} />,
        shortcut: "Ctrl+`",
        action: "toggleTerminal",
        disabled: !s.workspace,
      },
      {
        label: t("menu.clearTerminal"),
        icon: <Eraser size={13} />,
        action: "clearTerminal",
      },
      {
        label: t("menu.stopCommand"),
        icon: <Square size={11} />,
        action: "stopCommand",
        disabled: s.terminalRunning === null,
      },
    ],
    Help: [
      { label: t("menu.shortcuts"), action: "shortcuts" },
      { label: t("menu.settings"), action: "settings" },
      { separator: true },
      { label: t("menu.about"), icon: <Code2 size={13} />, action: "about" },
    ],
  };

  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isInteractive(event.target)) return;
    event.preventDefault();
    void winAction("startDragging");
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isInteractive(event.target)) return;
    void winAction("toggleMaximize");
  };

  return (
    <div
      className="drag-region relative z-40 flex h-9 shrink-0 select-none items-stretch border-b border-vs-border bg-vs-titlebar text-2xs"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="no-drag flex items-center gap-2 px-3">
        <Code2 size={16} className="text-vs-accent" />
        <span className="text-xs font-semibold text-vs-strong">NPQ Code</span>
      </div>

      <div ref={menusRef} className="no-drag flex items-stretch">
        {MENU_NAMES.map((name) => (
          <div key={name} className="relative flex items-stretch">
            <button
              className={`px-2.5 text-vs-text hover:bg-vs-titlebarHover ${
                openMenu === name ? "bg-vs-titlebarHover text-vs-strong" : ""
              }`}
              onMouseEnter={() => openMenu && setOpenMenu(name)}
              onClick={() => setOpenMenu(openMenu === name ? null : name)}
            >
              {t(`menu.${name.toLowerCase()}` as TranslationKey)}
            </button>
            {openMenu === name && (
              <div className="absolute left-0 top-full z-50 min-w-[240px] rounded-b border border-vs-border bg-vs-editor py-1 text-vs-text shadow-lg">
                {menus[name].map((item, index) =>
                  "separator" in item ? (
                    <div key={index} className="my-1 h-px bg-vs-border" />
                  ) : (
                    <button
                      key={index}
                      disabled={item.disabled}
                      onClick={() => perform(item.action)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-vs-select disabled:cursor-default disabled:opacity-40"
                    >
                      <span className="grid w-4 place-items-center text-vs-dim">{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <span className="ml-6 shrink-0 text-vs-dim">{item.shortcut}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-3">
        <button
          onClick={() => (s.workspace ? s.setQuickOpen(true) : s.setDialog("open"))}
          className="no-drag flex h-6 w-full max-w-[520px] items-center gap-2 rounded border border-vs-border bg-vs-input px-2.5 text-vs-dim hover:border-vs-accent/60 hover:text-vs-text"
          title={s.workspace ? t("topbar.searchFiles") : t("topbar.openFolder")}
        >
          <Search size={12} />
          <span className="min-w-0 flex-1 truncate text-center">
            {activeFile ? activeFile.name : s.workspace ? s.workspace.name : t("topbar.openToStart")}
          </span>
          <kbd className="rounded bg-vs-sidebar px-1 text-[0.625rem] text-vs-dim">Ctrl+P</kbd>
        </button>
      </div>

      <div className="no-drag flex items-stretch">
        <button
          onClick={() => winAction("minimize")}
          title={t("window.minimize")}
          className="grid h-full w-11 place-items-center text-vs-text hover:bg-vs-titlebarHover"
        >
          <CaptionGlyph kind="minimize" />
        </button>
        <button
          onClick={() => winAction("toggleMaximize")}
          title={t("window.maximize")}
          className="grid h-full w-11 place-items-center text-vs-text hover:bg-vs-titlebarHover"
        >
          <CaptionGlyph kind="maximize" />
        </button>
        <button
          onClick={() => winAction("close")}
          title={t("window.close")}
          className="grid h-full w-11 place-items-center text-vs-text hover:bg-[#E81123] hover:text-white"
        >
          <CaptionGlyph kind="close" />
        </button>
      </div>
    </div>
  );
}

/**
 * Windows-style caption glyphs drawn on a 10×10 grid with 1px strokes. Lucide's
 * icons are designed for UI actions (its "maximize" is a diagonal expand arrow),
 * which reads oddly in a real title bar.
 */
function CaptionGlyph({ kind }: { kind: "minimize" | "maximize" | "close" }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "minimize" && <path d="M0 5.5h10" />}
      {kind === "maximize" && <rect x="0.5" y="0.5" width="9" height="9" />}
      {kind === "close" && <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" />}
    </svg>
  );
}
