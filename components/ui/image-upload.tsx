"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getUploadSignature } from "@/lib/media/get-upload-signature";
import { deleteAsset } from "@/lib/media/delete-asset";

export type ImageData = {
  imageUrl: string;
  imagePublicId: string;
};

type ImageUploadProps = {
  value?: ImageData | null;
  onChange: (value: ImageData | null) => void;
  productId?: string;
  className?: string;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function ImageUpload({
  value,
  onChange,
  productId,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);

  const [preview, setPreview] = useState<string | null>(value?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  });

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only JPG, PNG, and WebP files are allowed.";
    }
    if (file.size > MAX_SIZE) {
      return "File must be under 5MB.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setProgress(0);
    setUploading(true);

    try {
      const sigResult = await getUploadSignature();
      if ("error" in sigResult) {
        setError(sigResult.error);
        return;
      }

      const { signature, timestamp, cloudName, apiKey, folder } = sigResult;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("api_key", apiKey);
      formData.append("folder", folder);
      formData.append("allowed_formats", "jpg,png,webp");
      formData.append("max_file_size", "5242880");

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      const result = await new Promise<{ secure_url: string; public_id: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", url);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.error?.message ?? "Upload failed"));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error("Network error during upload."));
          xhr.send(formData);
        },
      );

      const prev = valueRef.current;
      if (prev?.imagePublicId && productId) {
        deleteAsset(prev.imagePublicId, productId).catch(() => {});
      }

      onChange({ imageUrl: result.secure_url, imagePublicId: result.public_id });
      setPreview(result.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleRemove() {
    if (value?.imagePublicId && productId) {
      await deleteAsset(value.imagePublicId, productId);
    }
    onChange(null);
    setPreview(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {error && (
        <div className="flex items-center justify-between rounded-[var(--radius)] border border-badge-error-bg bg-badge-error-bg px-4 py-2 text-sm text-badge-error-fg">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-4 text-sm font-semibold hover:underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {preview ? (
        <div className="relative group rounded-[var(--radius)] border border-border overflow-hidden bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Product preview"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-[var(--radius)] bg-white/90 px-4 py-2 text-sm font-medium text-foreground hover:bg-white transition-colors cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="rounded-[var(--radius)] bg-destructive/90 px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center h-48 rounded-[var(--radius)] border-2 border-dashed transition-colors cursor-pointer",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-card",
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-2 w-48 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted">{progress}% uploaded</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="text-sm">Drop an image or click to browse</span>
              <span className="text-xs">JPG, PNG, or WebP &middot; Max 5MB</span>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
