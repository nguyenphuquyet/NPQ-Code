import { GitBranch, Blocks, TerminalSquare } from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";
import ProjectTree from "./ProjectTree";
import SearchPanel from "./SearchPanel";

export default function Sidebar() {
  const s = useStudio();
  const { t } = useI18n();

  if (s.sidebarView === "explorer") return <ProjectTree />;
  if (s.sidebarView === "search") return <SearchPanel />;

  if (s.sidebarView === "git") {
    return (
      <div className="flex h-full flex-col bg-vs-sidebar">
        <div className="flex h-7 shrink-0 items-center px-3 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
          {t("sidebar.sourceControl")}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-2xs text-vs-dim">
          <GitBranch size={32} className="text-vs-dim/60" />
          <p>{t("sidebar.gitMessage")}</p>
          <button
            onClick={() => s.toggleTerminal()}
            className="flex items-center gap-1.5 rounded border border-vs-border bg-vs-editor px-3 py-1.5 text-vs-text hover:bg-vs-hover"
          >
            <TerminalSquare size={13} /> {t("sidebar.openTerminal")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-vs-sidebar">
      <div className="flex h-7 shrink-0 items-center px-3 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
        {t("sidebar.extensions")}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-2xs text-vs-dim">
        <Blocks size={32} className="text-vs-dim/60" />
        <p>{t("sidebar.extensionsMessage")}</p>
      </div>
    </div>
  );
}
