import { useEffect, useState } from "react";
import {
  Check,
  Info,
  Keyboard,
  Languages,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { LANGUAGES, useI18n, type TranslationKey } from "../lib/i18n";
import { THEMES, useTheme } from "../lib/theme";

type Tab = "appearance" | "about";

const TABS: { id: Tab; key: TranslationKey; icon: typeof Palette }[] = [
  { id: "appearance", key: "settings.tabAppearance", icon: Palette },
  { id: "about", key: "settings.tabAbout", icon: Info },
];

const SHORTCUTS: { keys: string; label: TranslationKey }[] = [
  { keys: "Ctrl+P", label: "shortcut.goToFile" },
  { keys: "Ctrl+Shift+F", label: "shortcut.searchInFolder" },
  { keys: "Ctrl+S", label: "shortcut.saveFile" },
  { keys: "Ctrl+`", label: "shortcut.toggleTerminal" },
  { keys: "Ctrl+B", label: "shortcut.toggleSideBar" },
  { keys: "Ctrl+Shift+E", label: "shortcut.explorer" },
];

export default function SettingsDialog() {
  const s = useStudio();
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>("appearance");

  useEffect(() => {
    if (!s.settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") s.setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.settingsOpen, s.setSettingsOpen]);

  if (!s.settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/30 p-6"
      onMouseDown={() => s.setSettingsOpen(false)}
    >
      <div
        className="flex h-[min(560px,88vh)] w-[min(820px,94vw)] flex-col overflow-hidden rounded-lg border border-vs-border bg-vs-editor shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-vs-border px-4">
          <Settings2 size={16} className="text-vs-accent" />
          <h2 className="flex-1 text-xs font-semibold uppercase tracking-wide text-vs-strong">
            {t("settings.title")}
          </h2>
          <span className="hidden text-[0.625rem] text-vs-dim sm:block">
            {t("settings.subtitle")}
          </span>
          <button
            className="ml-2 grid h-6 w-6 place-items-center rounded text-vs-dim hover:bg-vs-hover hover:text-vs-text"
            title={t("settings.close")}
            onClick={() => s.setSettingsOpen(false)}
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Sidebar navigation */}
          <nav
            role="tablist"
            className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-vs-border bg-vs-sidebar p-2"
          >
            {TABS.map((item) => {
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-2xs ${
                    active
                      ? "bg-vs-select font-medium text-vs-strong"
                      : "text-vs-dim hover:bg-vs-hover hover:text-vs-text"
                  }`}
                >
                  <item.icon size={14} className={active ? "text-vs-accent" : ""} />
                  <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "appearance" && (
            <div className="space-y-6">
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="flex items-center gap-1.5 text-2xs font-semibold text-vs-strong">
                    <Palette size={13} /> {t("settings.theme")}
                  </h3>
                  <span className="text-[0.625rem] text-vs-dim">{t("settings.themeHint")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {THEMES.map((item) => {
                    const active = item.id === theme;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setTheme(item.id)}
                        className={`overflow-hidden rounded border text-left ${
                          active
                            ? "border-vs-accent text-vs-strong"
                            : "border-vs-border text-vs-text hover:border-vs-dim"
                        }`}
                      >
                        <span
                          className="relative block h-10 w-full border-b border-black/10"
                          style={{ background: item.preview.background }}
                        >
                          <span
                            className="absolute inset-y-0 left-0 w-3"
                            style={{ background: item.preview.sidebar }}
                          />
                          <span
                            className="absolute left-4 top-2 h-1.5 w-7 rounded-sm"
                            style={{ background: item.preview.accent }}
                          />
                          <span className="absolute left-4 top-4 h-1 w-5 rounded-sm bg-current opacity-30" />
                        </span>
                        <span className="flex items-center gap-1 px-2 py-1.5">
                          <span className="min-w-0 flex-1 truncate text-2xs">
                            {t(`theme.${item.id}` as TranslationKey)}
                          </span>
                          {active && <Check size={12} className="shrink-0 text-vs-accent" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="flex items-center gap-1.5 text-2xs font-semibold text-vs-strong">
                    <Languages size={13} /> {t("settings.language")}
                  </h3>
                  <span className="text-[0.625rem] text-vs-dim">{t("settings.languageHint")}</span>
                </div>
                <div className="overflow-hidden rounded border border-vs-border">
                  {LANGUAGES.map((item) => {
                    const active = item.id === language;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setLanguage(item.id)}
                        className={`flex w-full items-center gap-2 border-b border-vs-border px-3 py-2 text-left text-2xs last:border-0 ${
                          active ? "bg-vs-select text-vs-strong" : "text-vs-text hover:bg-vs-hover"
                        }`}
                      >
                        <span className="grid w-4 place-items-center text-vs-accent">
                          {active && <Check size={13} />}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="rounded bg-vs-badge px-1.5 text-[0.625rem] text-vs-dim">
                          {item.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold text-vs-strong">
                  <Settings2 size={13} /> {t("settings.zoom")}
                </h3>
                <div className="flex items-center gap-2 rounded border border-vs-border px-3 py-2">
                  <span className="flex-1 text-2xs text-vs-text">{t("settings.zoomHint")}</span>
                  <button
                    className="grid h-6 w-6 place-items-center rounded border border-vs-border text-vs-text hover:bg-vs-hover"
                    title={t("settings.zoomOut")}
                    onClick={s.zoomOut}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-12 text-center font-mono text-2xs text-vs-strong">
                    {Math.round(s.uiScale * 100)}%
                  </span>
                  <button
                    className="grid h-6 w-6 place-items-center rounded border border-vs-border text-vs-text hover:bg-vs-hover"
                    title={t("settings.zoomIn")}
                    onClick={s.zoomIn}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    className="ml-1 flex items-center gap-1 rounded px-1.5 py-1 text-2xs text-vs-accent hover:bg-vs-hover"
                    onClick={s.resetZoom}
                  >
                    <RotateCcw size={11} /> {t("settings.reset")}
                  </button>
                </div>
              </section>
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-6">
              <section className="flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-vs-border bg-vs-sidebar">
                  <Palette size={26} className="text-vs-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-vs-strong">NPQ Code</h3>
                  <p className="text-2xs text-vs-dim">{t("welcome.tagline")}</p>
                  <p className="mt-1 text-[0.625rem] text-vs-dim">
                    {t("settings.version")} 1.0.0 · {t("settings.aboutStack")}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold text-vs-strong">
                  <Keyboard size={13} /> {t("welcome.shortcuts")}
                </h3>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {SHORTCUTS.map((shortcut) => (
                    <div
                      key={shortcut.keys}
                      className="flex items-center justify-between border-b border-vs-border py-1.5 text-2xs last:border-0"
                    >
                      <span className="truncate text-vs-text">{t(shortcut.label)}</span>
                      <kbd className="ml-2 shrink-0 rounded border border-vs-border bg-vs-sidebar px-1.5 py-0.5 text-[0.625rem] text-vs-dim">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex h-9 shrink-0 items-center justify-between border-t border-vs-border bg-vs-panel px-4 text-[0.625rem] text-vs-dim">
          <span>
            NPQ Code 1.0.0 · {t(`theme.${theme}` as TranslationKey)}
          </span>
          <button
            className="rounded bg-vs-button px-3 py-1 text-2xs font-medium text-white hover:opacity-90"
            onClick={() => s.setSettingsOpen(false)}
          >
            {t("settings.close")}
          </button>
        </footer>
      </div>
    </div>
  );
}
