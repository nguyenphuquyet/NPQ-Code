import { useEffect } from "react";
import { Check, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useStudio } from "../lib/store";
import { LANGUAGES, useI18n } from "../lib/i18n";

export default function SettingsDialog() {
  const s = useStudio();
  const { language, setLanguage, t } = useI18n();

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
      className="fixed inset-0 z-[95] grid place-items-center bg-black/25 p-6"
      onMouseDown={() => s.setSettingsOpen(false)}
    >
      <div
        className="w-[min(480px,92vw)] overflow-hidden rounded-md border border-vs-border bg-vs-editor shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center border-b border-vs-border px-4 py-2.5">
          <h2 className="flex-1 text-xs font-semibold text-vs-strong">{t("settings.title")}</h2>
          <button
            className="grid h-6 w-6 place-items-center rounded text-vs-dim hover:bg-vs-hover hover:text-vs-text"
            title={t("settings.close")}
            onClick={() => s.setSettingsOpen(false)}
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-6 px-4 py-4">
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-2xs font-semibold text-vs-strong">{t("settings.language")}</h3>
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
            <h3 className="mb-2 text-2xs font-semibold text-vs-strong">{t("settings.appearance")}</h3>
            <div className="flex items-center gap-2 rounded border border-vs-border px-3 py-2">
              <span className="flex-1 text-2xs text-vs-text">{t("settings.zoom")}</span>
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

          <div className="flex items-center justify-between border-t border-vs-border pt-3 text-[0.625rem] text-vs-dim">
            <span>NPQ Code 1.0.0</span>
            <span>{t("settings.version")} 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
