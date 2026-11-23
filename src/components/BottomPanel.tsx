import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Eraser,
  Loader2,
  ScrollText,
  Square,
  TerminalSquare,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n, type TranslationKey } from "../lib/i18n";
import type { BottomTab } from "../lib/store";
import { useContextMenu } from "./ContextMenu";
import { copyText } from "../lib/clipboard";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

const TABS: { id: BottomTab; key: TranslationKey; icon: typeof TerminalSquare }[] = [
  { id: "problems", key: "panel.problems", icon: AlertCircle },
  { id: "output", key: "panel.output", icon: ScrollText },
  { id: "terminal", key: "panel.terminal", icon: TerminalSquare },
];

export default function BottomPanel({ onHide }: { onHide: () => void }) {
  const s = useStudio();
  const { t } = useI18n();
  const ctx = useContextMenu();
  const terminalLogRef = useRef<HTMLDivElement>(null);
  const outputLogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (terminalLogRef.current) {
      terminalLogRef.current.scrollTop = terminalLogRef.current.scrollHeight;
    }
  }, [s.terminal, s.bottomTab, s.bottomVisible]);

  useEffect(() => {
    if (outputLogRef.current) {
      outputLogRef.current.scrollTop = outputLogRef.current.scrollHeight;
    }
  }, [s.output]);

  useEffect(() => {
    if (s.bottomTab === "terminal" && s.bottomVisible) inputRef.current?.focus();
  }, [s.bottomTab, s.bottomVisible]);

  const copyLog = () => void copyText(s.terminal.map((line) => line.line).join("\n"));

  const onLogContextMenu = (event: ReactMouseEvent) => {
    ctx.open(event, [
      {
        label: t("panel.copyLog"),
        icon: <ClipboardCopy size={12} />,
        disabled: s.terminal.length === 0,
        action: copyLog,
      },
      {
        label: t("panel.clear"),
        icon: <Eraser size={12} />,
        disabled: s.terminal.length === 0,
        action: s.clearTerminal,
      },
      { separator: true },
      {
        label: t("panel.stopRunning"),
        icon: <Square size={11} />,
        disabled: s.terminalRunning === null,
        action: () => void s.stopCommand(),
      },
    ]);
  };

  const submit = () => {
    const value = command.trim();
    if (!value) return;
    setHistory((prev) => [...prev.slice(-99), value]);
    setHistoryIndex(-1);
    setCommand("");
    void s.runCommand(value);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (history.length === 0) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setCommand(history[next]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setCommand("");
      } else {
        setHistoryIndex(next);
        setCommand(history[next]);
      }
    } else if (event.key === "l" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      s.clearTerminal();
    }
  };

  const clearCurrent = () => {
    if (s.bottomTab === "terminal") s.clearTerminal();
    else if (s.bottomTab === "output") s.clearOutput();
  };

  return (
    <div className="flex h-full flex-col border-t border-vs-border bg-vs-panel">
      <div className="flex h-8 shrink-0 items-center border-b border-vs-border px-1">
        {TABS.map((tab) => {
          const active = s.bottomTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => s.setBottomTab(tab.id)}
              className={`flex h-8 items-center gap-1.5 border-b-2 px-3 text-2xs ${
                active
                  ? "border-vs-accent text-vs-strong"
                  : "border-transparent text-vs-dim hover:text-vs-text"
              }`}
            >
              <tab.icon size={12} />
              {t(tab.key)}
              {tab.id === "terminal" && s.terminalRunning !== null && (
                <Loader2 size={11} className="animate-spin text-vs-accent" />
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        {s.bottomTab === "terminal" && s.terminalRunning !== null && (
          <button
            className="mr-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs text-vs-red hover:bg-vs-hover"
            onClick={() => void s.stopCommand()}
            title={t("panel.stopRunning")}
          >
            <Square size={10} /> {t("panel.stop")}
          </button>
        )}
        <button
          className="grid h-6 w-6 place-items-center rounded text-vs-dim hover:bg-vs-hover hover:text-vs-text"
          onClick={clearCurrent}
          title={t("panel.clear")}
        >
          <Eraser size={13} />
        </button>
        <button
          className="grid h-6 w-6 place-items-center rounded text-vs-dim hover:bg-vs-hover hover:text-vs-text"
          onClick={onHide}
          title={t("panel.hidePanel")}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-vs-editor">
        <div className={s.bottomTab === "problems" ? "h-full" : "hidden"}>
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-2xs text-vs-dim">
            <CheckCircle2 size={22} className="text-vs-green" />
            <span>{t("panel.noProblems")}</span>
          </div>
        </div>

        <div className={s.bottomTab === "output" ? "h-full" : "hidden"}>
          <div
            ref={outputLogRef}
            className="h-full overflow-auto px-3 py-2 font-mono text-2xs leading-relaxed"
          >
            {s.output.length === 0 && (
              <div className="text-vs-dim">{t("panel.noOutput")}</div>
            )}
            {s.output.map((line, index) => (
              <div
                key={index}
                className={
                  line.stream === "error"
                    ? "text-vs-red"
                    : line.stream === "info"
                      ? "text-vs-text"
                      : "text-vs-dim"
                }
              >
                {line.line || "\u00A0"}
              </div>
            ))}
          </div>
        </div>

        <div className={s.bottomTab === "terminal" ? "h-full" : "hidden"}>
          <div
            className="flex h-full flex-col"
            onClick={(event) => {
              if ((event.target as HTMLElement).tagName !== "INPUT") inputRef.current?.focus();
            }}
          >
            <div
              ref={terminalLogRef}
              onContextMenu={onLogContextMenu}
              className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-2xs leading-relaxed"
            >
              {s.terminal.length === 0 && (
                <div className="text-vs-dim">{t("panel.terminalHint")}</div>
              )}
              {s.terminal.map((line, index) => (
                <div
                  key={index}
                  className={
                    line.stream === "stderr" || line.stream === "error"
                      ? "text-vs-red"
                      : line.stream === "info"
                        ? "text-vs-accent"
                        : line.stream === "system"
                          ? "text-vs-dim"
                          : "text-vs-text"
                  }
                >
                  <span className="whitespace-pre-wrap break-all">{line.line || "\u00A0"}</span>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-vs-border px-3 py-1.5">
              <span className="shrink-0 font-mono text-2xs text-vs-green">
                {s.workspace?.name ?? "shell"}
                <span className="text-vs-dim"> $</span>
              </span>
              <input
                ref={inputRef}
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t("panel.commandPlaceholder")}
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent font-mono text-2xs text-vs-text outline-none placeholder:text-vs-dim"
              />
              {s.terminalRunning !== null && (
                <span className="flex shrink-0 items-center gap-1 text-2xs text-vs-dim">
                  <Loader2 size={10} className="animate-spin" /> {t("panel.running")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
