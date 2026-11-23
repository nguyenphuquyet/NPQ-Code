import { Code2, FolderGit2, FolderOpen, Trash2 } from "lucide-react";
import { useStudio } from "../lib/store";

const SHORTCUTS = [
  { keys: "Ctrl+P", label: "Go to file" },
  { keys: "Ctrl+Shift+F", label: "Search in folder" },
  { keys: "Ctrl+S", label: "Save file" },
  { keys: "Ctrl+`", label: "Toggle terminal" },
  { keys: "Ctrl+B", label: "Toggle side bar" },
  { keys: "Ctrl+Shift+E", label: "Explorer" },
];

export default function WelcomeScreen() {
  const s = useStudio();

  return (
    <div className="h-full overflow-auto bg-vs-editor">
      <div className="mx-auto grid max-w-5xl gap-12 px-10 py-14 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-xl border border-vs-border bg-vs-sidebar">
              <Code2 size={28} className="text-vs-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-vs-strong">NPQ Code</h1>
              <p className="text-2xs text-vs-dim">A lightweight code editor for your folders</p>
            </div>
          </div>

          <h2 className="mb-3 text-xs font-semibold text-vs-strong">Start</h2>
          <div className="space-y-1 text-2xs">
            <button
              onClick={() => s.setDialog("open")}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-vs-accent hover:bg-vs-hover"
            >
              <FolderOpen size={15} />
              <span className="font-medium">Open Folder…</span>
            </button>
          </div>

          <div className="mt-8 mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-vs-strong">Recent</h2>
            {s.recent.length > 0 && (
              <button
                className="text-2xs text-vs-dim hover:text-vs-text"
                onClick={() => {
                  for (const item of s.recent) s.removeRecent(item.path);
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-vs-border">
            {s.recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-2xs text-vs-dim">
                Folders you open will show up here.
              </div>
            ) : (
              s.recent.map((item) => (
                <div
                  key={item.path}
                  className="group flex cursor-pointer items-center gap-3 border-b border-vs-border px-4 py-2.5 last:border-0 hover:bg-vs-hover"
                  onClick={() => void s.openWorkspace(item.path)}
                >
                  <FolderGit2 size={15} className="shrink-0 text-vs-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-2xs font-medium text-vs-strong">{item.name}</div>
                    <div className="truncate text-[0.625rem] text-vs-dim">{item.path}</div>
                  </div>
                  <button
                    className="grid h-6 w-6 place-items-center rounded text-vs-dim opacity-0 hover:bg-vs-badge group-hover:opacity-100"
                    title="Remove from recent"
                    onClick={(event) => {
                      event.stopPropagation();
                      s.removeRecent(item.path);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="text-2xs">
          <h2 className="mb-3 text-xs font-semibold text-vs-strong">Keyboard shortcuts</h2>
          <div className="overflow-hidden rounded-md border border-vs-border">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.keys}
                className="flex items-center justify-between border-b border-vs-border px-4 py-2 last:border-0"
              >
                <span className="text-vs-text">{shortcut.label}</span>
                <kbd className="rounded border border-vs-border bg-vs-sidebar px-1.5 py-0.5 text-[0.625rem] text-vs-dim">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-md border border-vs-border p-4 leading-relaxed text-vs-dim">
            Open any folder, edit its files with syntax highlighting, search across the
            tree, and run commands in the integrated terminal. Nothing else is bolted on.
          </div>
        </section>
      </div>
    </div>
  );
}
