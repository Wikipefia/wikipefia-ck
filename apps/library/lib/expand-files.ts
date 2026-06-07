import { unzip } from "fflate";

/**
 * Expand any archives in a file selection into their individual entries, so
 * each ends up as its own library material. Non-archive files pass through
 * unchanged. Extraction happens entirely in the browser (fflate) — a `.zip`
 * never reaches the server; only its contents are uploaded.
 *
 * Only ZIP is handled (the common case for course-material bundles). A file
 * that looks like a zip but fails to parse is kept as-is rather than dropped.
 */

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  zip: "application/zip",
};

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function isZip(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

/** Skip directory markers, dotfiles, and OS junk inside archives. */
function shouldSkipEntry(path: string, size: number): boolean {
  if (path.endsWith("/")) return true; // directory marker
  if (size === 0) return true;
  if (path.includes("__MACOSX/")) return true;
  const base = path.split("/").pop() ?? "";
  if (!base || base.startsWith(".")) return true;
  if (base === "Thumbs.db") return true;
  return false;
}

function unzipAsync(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, files) => (err ? reject(err) : resolve(files)));
  });
}

export async function expandFiles(input: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const file of input) {
    if (!isZip(file)) {
      out.push(file);
      continue;
    }
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const entries = await unzipAsync(buf);
      for (const [path, bytes] of Object.entries(entries)) {
        if (shouldSkipEntry(path, bytes.length)) continue;
        const base = path.split("/").pop() as string;
        // `bytes` is already a fresh Uint8Array from fflate and the File/Blob
        // constructor copies it, so no extra wrapper copy is needed. The cast
        // narrows fflate's `ArrayBufferLike` buffer to the DOM `BlobPart` type.
        out.push(
          new File([bytes as Uint8Array<ArrayBuffer>], base, {
            type: guessMime(base),
          }),
        );
      }
    } catch {
      // Not a readable zip — fall back to uploading the file itself.
      out.push(file);
    }
  }
  return out;
}
