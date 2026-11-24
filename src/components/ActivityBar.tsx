import { Blocks, Files, GitBranch, Info, Search, Settings } from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n, type TranslationKey } from "../lib/i18n";
import type { SidebarView } from "../lib/store";

const VIEWS: { id: SidebarView; key: TranslationKey; icon: typeof Files }[] = [
  { id: "explorer", key: "activity.explorer", icon: Files },
  { id: "search", key: "activity.search", icon: Search },
  { id: "git", key: "activity.sourceControl", icon: GitBranch },
  { id: "extensions", key: "activity.extensions", icon: Blocks },
];

export default function ActivityBar() {
  const s = useStudio();
  const { t } = useI18n();
  const gitStatus = s.git.status;
  const gitCount = gitStatus
    ? gitStatus.staged.length + gitStatus.changes.length + gitStatus.untracked.length
    : 0;

  const select = (view: SidebarView) => {
    if (s.sidebarVisible && s.sidebarView === view) {
      s.toggleSidebar();
      return;
    }
    if (view === "search") s.openSearch();
    else s.setSidebarView(view);
  };

  return (
    <div className="flex w-11 shrink-0 flex-col items-center border-r border-vs-border bg-vs-activity py-1">
      {VIEWS.map((view) => {
        const active = s.sidebarVisible && s.sidebarView === view.id;
        return (
          <button
            key={view.id}
            title={t(view.key)}
            onClick={() => select(view.id)}
            className={`relative mb-1 grid h-9 w-full place-items-center ${
              active ? "text-vs-strong" : "text-vs-dim hover:text-vs-strong"
            }`}
          >
            {active && <span className="absolute left-0 h-full w-0.5 bg-vs-accent" />}
            <view.icon size={23} strokeWidth={1.9} />
            {view.id === "git" && gitCount > 0 && (
              <span className="absolute bottom-0.5 right-1 min-w-[16px] rounded-full bg-vs-accent px-1 text-center text-[9px] font-semibold leading-[14px] text-white">
                {gitCount > 99 ? "99+" : gitCount}
              </span>
            )}
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        title={t("activity.info")}
        onClick={() => s.showToast(t("activity.infoMessage"))}
        className="mb-1 grid h-9 w-full place-items-center text-vs-dim hover:text-vs-strong"
      >
        <Info size={22} strokeWidth={1.9} />
      </button>
      <button
        title={t("activity.settings")}
        onClick={() => s.setSettingsOpen(true)}
        className="mb-1 grid h-9 w-full place-items-center text-vs-dim hover:text-vs-strong"
      >
        <Settings size={22} strokeWidth={1.9} />
      </button>
    </div>
  );
}
