import { cn } from "@/shared/lib/utils";

type MediaKind = "image" | "video" | "audio";

type MediaViewerProps = {
  url: string;
  fileName: string;
  kind: MediaKind;
  fill?: boolean;
};

export function MediaViewer({
  url,
  fileName,
  kind,
  fill = false,
}: MediaViewerProps) {
  if (kind === "image") {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center overflow-auto p-4",
          fill ? "h-full" : "min-h-[32rem]"
        )}
      >
        <img
          src={url}
          alt={fileName}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center bg-black/90 p-4",
          fill ? "h-full" : "min-h-[32rem]"
        )}
      >
        <video
          src={url}
          controls
          className="max-h-full max-w-full"
          title={fileName}
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center p-8",
        fill ? "h-full" : "min-h-[32rem]"
      )}
    >
      <audio src={url} controls className="w-full max-w-lg" title={fileName}>
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
