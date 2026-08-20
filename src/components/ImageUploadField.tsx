import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Single-image picker with a live preview and a cancel/remove control so users
 * can verify the selected image (and back out) before it is uploaded. When no
 * new file is chosen, an optional `existingUrl` is shown so edits keep context.
 */
export function SingleImageInput({
  file,
  onFileChange,
  existingUrl,
  accept = "image/*",
  disabled,
  className,
  aspectClassName = "aspect-video",
  emptyLabel = "Click to select an image",
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingUrl?: string | null;
  accept?: string;
  disabled?: boolean;
  className?: string;
  aspectClassName?: string;
  emptyLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shownUrl = preview ?? existingUrl ?? null;

  const openPicker = () => inputRef.current?.click();

  return (
    <div className={cn("mt-1", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          onFileChange(e.target.files?.[0] ?? null);
          // Allow re-selecting the same filename after a cancel.
          e.target.value = "";
        }}
      />

      {shownUrl ? (
        <div className="overflow-hidden rounded-md border">
          <div className={cn("relative w-full bg-muted", aspectClassName)}>
            <img
              src={shownUrl}
              alt="Selected preview"
              className="h-full w-full object-cover"
            />
            {file && (
              <button
                type="button"
                onClick={() => onFileChange(null)}
                disabled={disabled}
                aria-label="Remove selected image"
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 shadow hover:bg-background"
              >
                <X className="h-4 w-4 text-destructive" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 p-2">
            <span className="truncate text-xs text-muted-foreground">
              {file ? file.name : "Current image"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={openPicker}
            >
              <Upload className="h-3.5 w-3.5" />
              {file ? "Change" : "Replace"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary",
            aspectClassName,
          )}
        >
          <ImagePlus className="h-6 w-6" />
          <span>{emptyLabel}</span>
        </button>
      )}
    </div>
  );
}

/**
 * Multi-image picker with per-image previews and a remove control on each, so a
 * wrong selection can be cancelled before upload.
 */
export function MultiImageInput({
  files,
  onFilesChange,
  max = 8,
  accept = "image/*",
  disabled,
  className,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  max?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const removeAt = (index: number) =>
    onFilesChange(files.filter((_, i) => i !== index));

  return (
    <div className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4", className)}>
      {previews.map((src, i) => (
        <div
          key={src}
          className="relative aspect-square overflow-hidden rounded-lg border"
        >
          <img src={src} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => removeAt(i)}
            disabled={disabled}
            aria-label="Remove image"
            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 shadow hover:bg-background"
          >
            <X className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      ))}

      {files.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <div className="text-center">
            <ImagePlus className="mx-auto h-6 w-6" />
            <span className="text-xs">Add photos</span>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          onFilesChange([...files, ...selected].slice(0, max));
          e.target.value = "";
        }}
      />
    </div>
  );
}
