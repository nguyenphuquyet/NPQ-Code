import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ExternalLink,
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  FolderOpen,
  Image as ImageIcon,
  Minus,
  Plus,
  Scan,
} from "lucide-react";
import {
  api,
  assetUrl,
  fileName,
  formatBytes,
  isTauri,
  type FileMeta,
  type PreviewKind,
} from "../lib/api";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { useStudio, type OpenFile } from "../lib/store";

const KIND_ICON: Record<PreviewKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  binary: FileArchive,
};

const KIND_LABEL_KEY: Record<PreviewKind, TranslationKey> = {
  image: "preview.image",
  video: "preview.video",
  audio: "preview.audio",
  pdf: "preview.pdf",
  binary: "preview.binary",
};

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;

export default function MediaPreview({ file }: { file: OpenFile }) {
  const s = useStudio();
  const { t } = useI18n();
  const kind = file.preview ?? "binary";
  const Icon = KIND_ICON[kind];
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const src = useMemo(() => assetUrl(file.path), [file.path]);

  // A cached (or data URL) image can finish loading before React attaches
  // `onLoad`, so read the natural size from the node as well.
  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete || image.naturalWidth === 0) return;
    setDimensions((prev) =>
      prev && prev.width === image.naturalWidth && prev.height === image.naturalHeight
        ? prev
        : { width: image.naturalWidth, height: image.naturalHeight },
    );
  });

  useEffect(() => {
    setMeta(null);
    setFailed(false);
    setDimensions(null);
    setZoom(1);
    let cancelled = false;
    void api
      .fileMeta(file.path)
      .then((value) => {
        if (!cancelled) setMeta(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file.path]);

  const zoomBy = (factor: number) =>
    setZoom((value) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * factor * 100) / 100)));

  const openExternal = () => {
    void api.openExternal(file.path).catch((error) => s.showToast(String(error)));
  };
  const reveal = () => {
    void api.revealPath(file.path).catch((error) => s.showToast(String(error)));
  };
  const viewAsText = () => void s.openTextPreview(file.path);

  const showActions = isTauri;

  return (
    <div className="flex h-full min-h-0 flex-col bg-vs-editor">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-vs-border bg-vs-panel px-3 text-2xs">
        <Icon size={13} className="shrink-0 text-vs-accent" />
        <span className="min-w-0 truncate text-vs-strong">{file.name}</span>
        <span className="shrink-0 rounded bg-vs-badge px-1.5 py-0.5 text-vs-dim">
          {t(KIND_LABEL_KEY[kind])}
        </span>
        {meta && (
          <span className="shrink-0 text-vs-dim">
            {formatBytes(meta.size)}
            {dimensions ? ` · ${dimensions.width} × ${dimensions.height} px` : ""}
          </span>
        )}

        {kind === "image" && !failed && (
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              className="grid h-6 w-6 place-items-center rounded hover:bg-vs-hover"
              onClick={() => zoomBy(1 / 1.25)}
              title={t("preview.zoomOut")}
            >
              <Minus size={12} />
            </button>
            <span className="w-10 text-center text-vs-dim">{Math.round(zoom * 100)}%</span>
            <button
              className="grid h-6 w-6 place-items-center rounded hover:bg-vs-hover"
              onClick={() => zoomBy(1.25)}
              title={t("preview.zoomIn")}
            >
              <Plus size={12} />
            </button>
            <button
              className="grid h-6 w-6 place-items-center rounded hover:bg-vs-hover"
              onClick={() => setZoom(1)}
              title={t("preview.resetZoom")}
            >
              <Scan size={12} />
            </button>
          </div>
        )}

        <div className={`${kind === "image" && !failed ? "" : "ml-auto"} flex shrink-0 items-center gap-1`}>
          <button
            className="flex h-6 items-center gap-1 rounded px-2 hover:bg-vs-hover disabled:opacity-40"
            onClick={viewAsText}
            title={t("preview.viewAsText")}
          >
            <FileText size={12} />
            <span>{t("preview.viewAsText")}</span>
          </button>
          {showActions && (
            <>
              <button
                className="flex h-6 items-center gap-1 rounded px-2 hover:bg-vs-hover"
                onClick={reveal}
                title={t("preview.reveal")}
              >
                <FolderOpen size={12} />
              </button>
              <button
                className="flex h-6 items-center gap-1 rounded px-2 hover:bg-vs-hover"
                onClick={openExternal}
                title={t("preview.openExternal")}
              >
                <ExternalLink size={12} />
                <span>{t("preview.openExternal")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        {failed ? (
          <Notice
            icon={<AlertTriangle size={26} className="text-vs-yellow" />}
            title={t("preview.missing")}
            detail={fileName(file.path)}
          />
        ) : kind === "image" ? (
          <div className="preview-checker flex min-h-full items-center justify-center p-6">
            <img
              ref={imageRef}
              src={src}
              alt={file.name}
              className="preview-image"
              style={{
                transform: `scale(${zoom})`,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
              onLoad={(event) => {
                const image = event.currentTarget;
                setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
              }}
              onError={() => setFailed(true)}
            />
          </div>
        ) : kind === "video" ? (
          !isTauri ? (
            <Notice icon={<FileVideo size={26} className="text-vs-accent" />} title={t("preview.demoOnly")} detail={file.name} />
          ) : (
            <div className="flex h-full items-center justify-center bg-black/90 p-4">
              <video
                src={src}
                controls
                autoPlay={false}
                className="max-h-full max-w-full"
                onError={() => setFailed(true)}
              />
            </div>
          )
        ) : kind === "audio" ? (
          <div className="grid h-full place-items-center p-6">
            <div className="w-full max-w-md rounded-lg border border-vs-border bg-vs-panel p-6 text-center">
              <FileAudio size={34} className="mx-auto mb-3 text-vs-accent" />
              <p className="mb-1 truncate text-sm text-vs-strong">{file.name}</p>
              {meta && <p className="mb-4 text-2xs text-vs-dim">{formatBytes(meta.size)}</p>}
              {isTauri ? (
                <audio src={src} controls className="w-full" onError={() => setFailed(true)} />
              ) : (
                <p className="text-2xs text-vs-dim">{t("preview.demoOnly")}</p>
              )}
            </div>
          </div>
        ) : kind === "pdf" ? (
          !isTauri ? (
            <Notice icon={<FileText size={26} className="text-vs-accent" />} title={t("preview.demoOnly")} detail={file.name} />
          ) : (
            <iframe title={file.name} src={src} className="h-full w-full border-0 bg-white" />
          )
        ) : (
          <div className="grid h-full place-items-center p-6">
            <div className="w-full max-w-md rounded-lg border border-vs-border bg-vs-panel p-6 text-center">
              <FileArchive size={34} className="mx-auto mb-3 text-vs-purple" />
              <p className="mb-1 break-all text-sm text-vs-strong">{file.name}</p>
              <p className="mb-4 text-2xs text-vs-dim">
                {meta ? formatBytes(meta.size) : t("preview.loading")}
              </p>
              <p className="mb-5 text-2xs text-vs-dim">{t("preview.binaryHint")}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  className="rounded bg-vs-button px-3 py-1.5 text-2xs text-white hover:brightness-110"
                  onClick={viewAsText}
                >
                  {t("preview.viewAsText")}
                </button>
                {showActions && (
                  <>
                    <button
                      className="rounded border border-vs-border px-3 py-1.5 text-2xs hover:bg-vs-hover"
                      onClick={reveal}
                    >
                      {t("preview.reveal")}
                    </button>
                    <button
                      className="rounded border border-vs-border px-3 py-1.5 text-2xs hover:bg-vs-hover"
                      onClick={openExternal}
                    >
                      {t("preview.openExternal")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-lg border border-vs-border bg-vs-panel">
          {icon}
        </div>
        <p className="mb-1 break-all text-sm text-vs-strong">{title}</p>
        <p className="break-all text-2xs text-vs-dim">{detail}</p>
      </div>
    </div>
  );
}
