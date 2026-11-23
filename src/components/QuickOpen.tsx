import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { FileCode2, Search } from "lucide-react";
import { useStudio } from "../lib/store";
import { flattenFiles } from "../lib/api";

export default function QuickOpen() {
  const s = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const files = useMemo(
    () => flattenFiles(s.tree, s.workspace?.path ?? ""),
    [s.tree, s.workspace?.path],
  );

  const matches = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return files.slice(0, 100);
    return files
      .filter((file) => {
        const haystack = file.relative.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 100);
  }, [files, query]);

  useEffect(() => {
    if (!s.quickOpen) return;
    setQuery("");
    setSelected(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [s.quickOpen]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!s.quickOpen) return null;

  const open = (path: string) => {
    s.setQuickOpen(false);
    void s.openFile(path);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      s.setQuickOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (matches.length > 0) setSelected((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const file = matches[selected];
      if (file) open(file.path);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/20 pt-[12vh]"
      onMouseDown={() => s.setQuickOpen(false)}
    >
      <div
        className="w-[min(680px,90vw)] overflow-hidden rounded-md border border-vs-border bg-vs-editor shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-vs-border px-3 py-2">
          <Search size={14} className="text-vs-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search files by name"
            className="min-w-0 flex-1 bg-transparent text-xs text-vs-strong outline-none placeholder:text-vs-dim"
          />
          <kbd className="rounded bg-vs-sidebar px-1.5 py-0.5 text-[0.625rem] text-vs-dim">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-auto py-1">
          {matches.length === 0 && (
            <div className="px-3 py-3 text-2xs text-vs-dim">No matching files.</div>
          )}
          {matches.map((file, index) => {
            const directory =
              file.relative === file.name ? "" : file.relative.replace(/[\\/][^\\/]+$/, "");
            return (
              <button
                key={file.path}
                data-index={index}
                onMouseEnter={() => setSelected(index)}
                onClick={() => open(file.path)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
                  index === selected ? "bg-vs-select" : "hover:bg-vs-hover"
                }`}
              >
                <FileCode2 size={13} className="shrink-0 text-vs-blue" />
                <span className="truncate text-2xs font-medium text-vs-strong">{file.name}</span>
                <span className="truncate text-2xs text-vs-dim">{directory}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-vs-border px-3 py-1 text-[0.625rem] text-vs-dim">
          <span>Enter to open</span>
          <span>↑↓ to navigate</span>
          <span className="ml-auto">{matches.length} files</span>
        </div>
      </div>
    </div>
  );
}
