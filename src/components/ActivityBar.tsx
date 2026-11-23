import { Blocks, Files, GitBranch, Info, Search, Settings } from "lucide-react";
import { useStudio } from "../lib/store";
import type { SidebarView } from "../lib/store";

const VIEWS: { id: SidebarView; label: string; icon: typeof Files }[] = [
  { id: "explorer", label: "Explorer", icon: Files },
  { id: "search", label: "Search", icon: Search },
  { id: "git", label: "Source Control", icon: GitBranch },
  { id: "extensions", label: "Extensions", icon: Blocks },
];

export default function ActivityBar() {
  const s = useStudio();

  const select = (view: SidebarView) => {
    if (s.sidebarVisible && s.sidebarView === view) {
      s.toggleSidebar();
      return;
    }
    if (view === "search") s.openSearch();
    else s.setSidebarView(view);
  };

  return (
    <div className="flex w-10 shrink-0 flex-col items-center border-r border-vs-border bg-vs-activity py-1">
      {VIEWS.map((view) => {
        const active = s.sidebarVisible && s.sidebarView === view.id;
        return (
          <button
            key={view.id}
            title={view.label}
            onClick={() => select(view.id)}
            className={`relative mb-1 grid h-9 w-full place-items-center ${
              active ? "text-vs-strong" : "text-vs-dim hover:text-vs-strong"
            }`}
          >
            {active && <span className="absolute left-0 h-full w-0.5 bg-vs-accent" />}
            <view.icon size={19} />
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        title="Info"
        onClick={() =>
          s.showToast("NPQ Code — open a folder, edit, and run commands in the terminal")
        }
        className="mb-1 grid h-9 w-full place-items-center text-vs-dim hover:text-vs-strong"
      >
        <Info size={18} />
      </button>
      <button
        title="Settings"
        onClick={() => s.showToast("Settings live in your project files and the Status Bar")}
        className="mb-1 grid h-9 w-full place-items-center text-vs-dim hover:text-vs-strong"
      >
        <Settings size={18} />
      </button>
    </div>
  );
}
