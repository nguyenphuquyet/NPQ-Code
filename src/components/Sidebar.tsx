import { GitBranch, Blocks, TerminalSquare } from "lucide-react";
import { useStudio } from "../lib/store";
import ProjectTree from "./ProjectTree";
import SearchPanel from "./SearchPanel";

export default function Sidebar() {
  const s = useStudio();

  if (s.sidebarView === "explorer") return <ProjectTree />;
  if (s.sidebarView === "search") return <SearchPanel />;

  if (s.sidebarView === "git") {
    return (
      <div className="flex h-full flex-col bg-vs-sidebar">
        <div className="flex h-7 shrink-0 items-center px-3 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
          Source Control
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-2xs text-vs-dim">
          <GitBranch size={32} className="text-vs-dim/60" />
          <p>
            Git is not embedded in this editor. Run Git commands in the integrated
            terminal — the folder you opened is the working directory.
          </p>
          <button
            onClick={() => s.toggleTerminal()}
            className="flex items-center gap-1.5 rounded border border-vs-border bg-vs-editor px-3 py-1.5 text-vs-text hover:bg-vs-hover"
          >
            <TerminalSquare size={13} /> Open Terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-vs-sidebar">
      <div className="flex h-7 shrink-0 items-center px-3 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
        Extensions
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-2xs text-vs-dim">
        <Blocks size={32} className="text-vs-dim/60" />
        <p>
          NPQ Code keeps a small core: files, tabs, search and a terminal. Use the
          project's own tooling for everything else.
        </p>
      </div>
    </div>
  );
}
