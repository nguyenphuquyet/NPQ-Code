import { AlertCircle, FolderOpen, Loader2, TerminalSquare, ZoomIn } from "lucide-react";
import { useStudio } from "../lib/store";

const LANGUAGE_LABEL: Record<string, string> = {
  tsx: "TypeScript React",
  ts: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript React",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  text: "Plain Text",
};

export default function StatusBar() {
  const s = useStudio();
  const active = s.openFiles.find((file) => file.path === s.activePath);
  const language = active ? LANGUAGE_LABEL[active.language] ?? "Plain Text" : "";

  return (
    <div className="flex h-6 shrink-0 select-none items-center bg-vs-status px-1 text-2xs text-white">
      <button
        className="flex h-full items-center gap-1 px-2 hover:bg-white/15"
        onClick={() => s.setSidebarView("explorer")}
        title={s.workspace?.path ?? "No folder open"}
      >
        <FolderOpen size={12} />
        <span className="max-w-[240px] truncate">{s.workspace?.name ?? "No Folder"}</span>
      </button>

      <button
        className="flex h-full items-center gap-1 px-2 hover:bg-white/15"
        onClick={() => s.setBottomTab("problems")}
        title="Problems"
      >
        <AlertCircle size={12} /> 0
      </button>

      {s.terminalRunning !== null && (
        <button
          className="flex h-full items-center gap-1 px-2 hover:bg-white/15"
          onClick={() => s.setBottomTab("terminal")}
          title="Command running — open terminal"
        >
          <Loader2 size={11} className="animate-spin" /> Running
        </button>
      )}

      <div className="flex-1" />

      {active && (
        <>
          <span className="px-2">
            Ln {s.cursor.line}, Col {s.cursor.col}
          </span>
          <span className="px-2">{language}</span>
        </>
      )}

      <span className="px-2">UTF-8</span>
      <span className="px-2">LF</span>

      <button
        className="flex h-full items-center gap-1 px-2 hover:bg-white/15"
        onClick={s.resetZoom}
        title="Reset zoom (Ctrl+0)"
      >
        <ZoomIn size={11} /> {Math.round(s.uiScale * 100)}%
      </button>

      <button
        className="flex h-full items-center gap-1 px-2 hover:bg-white/15"
        onClick={() => s.toggleTerminal()}
        title="Toggle terminal (Ctrl+`)"
      >
        <TerminalSquare size={12} />
      </button>
    </div>
  );
}
