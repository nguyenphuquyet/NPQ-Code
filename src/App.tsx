import { useEffect, useRef, useState } from "react";
import { useStudio } from "./lib/store";
import { api } from "./lib/api";
import TopBar from "./components/TopBar";
import ActivityBar from "./components/ActivityBar";
import Sidebar from "./components/Sidebar";
import EditorArea from "./components/EditorArea";
import BottomPanel from "./components/BottomPanel";
import StatusBar from "./components/StatusBar";
import WelcomeScreen from "./components/WelcomeScreen";
import QuickOpen from "./components/QuickOpen";
import SettingsDialog from "./components/SettingsDialog";

// Bumped when the default panel sizes change so a stored layout from an older
// build does not pin the old size.
const LAYOUT_KEY = "npqcode.layout.v3";

const LEFT_MIN = 180;
const LEFT_MAX = 520;
const LEFT_DEFAULT = 260;

type StoredLayout = { leftWidth?: number; bottomHeight?: number };

function readLayout(): StoredLayout {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as StoredLayout | null;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function clampLayout(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export default function App() {
  const s = useStudio();
  const [leftWidth, setLeftWidth] = useState(() =>
    clampLayout(readLayout().leftWidth, LEFT_MIN, LEFT_MAX, LEFT_DEFAULT),
  );
  const [bottomHeight, setBottomHeight] = useState(() =>
    clampLayout(readLayout().bottomHeight, 120, 560, 240),
  );
  const dragging = useRef<null | "left" | "bottom">(null);
  // Distance between the pointer and the sidebar's left edge, captured on
  // mouse-down so the divider tracks the cursor exactly.
  const dragOffset = useRef(0);

  // Panel sizes survive a restart, like the rest of the session.
  useEffect(() => {
    try {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify({ leftWidth, bottomHeight }));
    } catch {
      /* storage unavailable */
    }
  }, [leftWidth, bottomHeight]);

  // "Open Folder" from the menu / welcome screen.
  useEffect(() => {
    if (s.dialog !== "open") return;
    void (async () => {
      const directory = await api.pickDirectory();
      if (directory) await s.openWorkspace(directory);
      s.setDialog(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.dialog]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current) return;
      if (dragging.current === "left") {
        setLeftWidth(
          Math.max(LEFT_MIN, Math.min(LEFT_MAX, event.clientX - dragOffset.current)),
        );
      }
      if (dragging.current === "bottom") {
        setBottomHeight(Math.max(120, Math.min(560, window.innerHeight - event.clientY - 24)));
      }
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-vs-sidebar text-vs-text">
      <TopBar />

      {!s.workspace ? (
        <div className="min-h-0 flex-1">
          <WelcomeScreen />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <ActivityBar />

          {s.sidebarVisible && (
            <>
              <div style={{ width: leftWidth }} className="min-w-0 shrink-0">
                <Sidebar />
              </div>
              <div
                className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-vs-accent/40"
                onMouseDown={(event) => {
                  dragging.current = "left";
                  dragOffset.current = event.clientX - leftWidth;
                }}
              />
            </>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <EditorArea />
            </div>

            {s.bottomVisible && (
              <div
                className="h-1 shrink-0 cursor-row-resize bg-transparent hover:bg-vs-accent/40"
                onMouseDown={() => (dragging.current = "bottom")}
              />
            )}
            {s.bottomVisible && (
              <div style={{ height: bottomHeight }} className="min-h-0 shrink-0">
                <BottomPanel onHide={() => s.setBottomVisible(false)} />
              </div>
            )}
          </div>
        </div>
      )}

      <StatusBar />
      <QuickOpen />
      <SettingsDialog />
      {s.toast && <Toast message={s.toast} />}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-10 left-1/2 z-[100] -translate-x-1/2 rounded border border-vs-border border-l-2 border-l-vs-accent bg-vs-editor px-4 py-2 text-2xs text-vs-strong shadow-xl">
      {message}
    </div>
  );
}
