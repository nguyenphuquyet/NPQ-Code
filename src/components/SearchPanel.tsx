import { useEffect, useRef, useState } from "react";
import { CaseSensitive, Loader2, RefreshCw, Search, X } from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { relativePath } from "../lib/api";

function Highlight({ text, query, caseSensitive }: { text: string; query: string; caseSensitive: boolean }) {
  if (!query) return <>{text}</>;
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const index = haystack.indexOf(needle);
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-[#FFE9A8] text-vs-strong">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

export default function SearchPanel() {
  const s = useStudio();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  // A fresh folder starts with a fresh search.
  useEffect(() => {
    setQuery("");
  }, [s.workspace?.path]);

  // Ctrl+Shift+F / activity-bar click asks the panel to take focus.
  useEffect(() => {
    if (s.searchFocusNonce > 0) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [s.searchFocusNonce]);

  useEffect(() => {
    if (!s.workspace) return;
    const timer = window.setTimeout(() => {
      void s.searchWorkspace(query, caseSensitive);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, s.workspace?.path]);

  const resultCount = s.search.results.reduce((total, file) => total + file.hits.length, 0);

  return (
    <div className="flex h-full flex-col bg-vs-sidebar">
      <div className="flex h-7 shrink-0 items-center gap-1 px-2 text-2xs font-semibold uppercase tracking-wide text-vs-dim">
        <span className="flex-1">{t("search.title")}</span>
        <button
          className="grid h-5 w-5 place-items-center rounded hover:bg-vs-hover"
          title={t("search.refresh")}
          onClick={() => void s.searchWorkspace(query, caseSensitive)}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="space-y-2 px-2 pb-2">
        <div className="flex items-center gap-1 rounded border border-vs-border bg-vs-input px-2 py-1 focus-within:border-vs-accent">
          <Search size={12} className="shrink-0 text-vs-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              s.workspace ? t("search.placeholder") : t("search.placeholderDisabled")
            }
            disabled={!s.workspace}
            className="min-w-0 flex-1 bg-transparent text-2xs text-vs-text outline-none placeholder:text-vs-dim disabled:opacity-60"
          />
          {query && (
            <button
              className="grid h-4 w-4 place-items-center rounded text-vs-dim hover:bg-vs-hover"
              title={t("search.clear")}
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X size={11} />
            </button>
          )}
          <button
            className={`grid h-4 w-4 place-items-center rounded ${
              caseSensitive ? "bg-vs-select text-vs-accent" : "text-vs-dim hover:bg-vs-hover"
            }`}
            title={t("search.matchCase")}
            onClick={() => setCaseSensitive((value) => !value)}
          >
            <CaseSensitive size={13} />
          </button>
        </div>

        {s.search.running && (
          <div className="flex items-center gap-1.5 text-2xs text-vs-dim">
            <Loader2 size={11} className="animate-spin" /> {t("search.searching")}
          </div>
        )}
        {!s.search.running && query && s.search.error && (
          <div className="text-2xs text-vs-red">{s.search.error}</div>
        )}
        {!s.search.running && query && !s.search.error && resultCount > 0 && (
          <div className="text-2xs text-vs-dim">
            {resultCount === 1 && s.search.results.length === 1
              ? t("search.resultsOne")
              : t("search.resultsMany", {
                  count: resultCount,
                  files: s.search.results.length,
                })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-2">
        {!s.workspace && (
          <div className="px-3 py-2 text-2xs text-vs-dim">{t("search.noFolder")}</div>
        )}
        {s.workspace && query && !s.search.running && !s.search.error && resultCount === 0 && (
          <div className="px-3 py-2 text-2xs text-vs-dim">{t("search.noResults")}</div>
        )}
        {s.search.results.map((file) => {
          const relative = relativePath(s.workspace?.path ?? "", file.path);
          const directory =
            relative === file.name ? "" : relative.replace(/[\\/][^\\/]+$/, "");
          return (
          <div key={file.path} className="mb-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-2xs">
              <span className="truncate font-medium text-vs-strong">{file.name}</span>
              <span className="truncate text-vs-dim">{directory}</span>
              <span className="ml-auto shrink-0 rounded-full bg-vs-badge px-1.5 text-[0.625rem] text-vs-dim">
                {file.hits.length}
              </span>
            </div>
            {file.hits.map((hit) => (
              <button
                key={`${file.path}:${hit.line}:${hit.column}`}
                onClick={() => void s.openFileAt(file.path, hit.line, hit.column)}
                className="flex w-full items-start gap-2 py-[2px] pl-6 pr-2 text-left hover:bg-vs-hover"
                title={`${file.path}:${hit.line}:${hit.column}`}
              >
                <span className="w-7 shrink-0 text-right font-mono text-[0.625rem] text-vs-dim">
                  {hit.line}
                </span>
                <span className="min-w-0 flex-1 truncate whitespace-pre font-mono text-2xs text-vs-text">
                  <Highlight text={hit.content} query={query} caseSensitive={caseSensitive} />
                </span>
              </button>
            ))}
          </div>
          );
        })}
      </div>
    </div>
  );
}
