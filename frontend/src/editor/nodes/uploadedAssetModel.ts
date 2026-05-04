export type UploadedAssetType = "image" | "audio" | "video" | "file";

export type UploadedAssetEnvelope = {
  kind: "uploaded_file";
  name: string;
  mimeType: string;
  size: number;
  detectedType: UploadedAssetType;
  content: string;
  encoding: "text" | "data_url";
};

const IMAGE_ACCEPT = "image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.heic,.heif";
const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.amr";
const VIDEO_ACCEPT = "video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi,.3gp,.3gpp,.ogv,.mpg,.mpeg";
const DOCUMENT_ACCEPT = [
  "application/pdf",
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".jsonl",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".htm",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
  ".pages",
  ".numbers",
  ".key",
].join(",");
const GENERIC_FILE_ACCEPT = [IMAGE_ACCEPT, AUDIO_ACCEPT, VIDEO_ACCEPT, DOCUMENT_ACCEPT].join(",");

export function isUploadedAssetStateType(stateType: string): stateType is UploadedAssetType {
  return stateType === "image" || stateType === "audio" || stateType === "video" || stateType === "file";
}

export function detectUploadedAssetTypeFromFileName(fileName: string, mimeType = ""): UploadedAssetType {
  const normalizedMimeType = mimeType.toLowerCase().trim();
  if (normalizedMimeType.startsWith("image/")) {
    return "image";
  }
  if (normalizedMimeType.startsWith("audio/")) {
    return "audio";
  }
  if (normalizedMimeType.startsWith("video/")) {
    return "video";
  }

  const normalized = fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg|heic|heif)$/.test(normalized)) {
    return "image";
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|amr)$/.test(normalized)) {
    return "audio";
  }
  if (/\.(mp4|mov|webm|mkv|avi|m4v|3gp|3gpp|ogv|mpg|mpeg)$/.test(normalized)) {
    return "video";
  }
  return "file";
}

export function tryParseUploadedAssetEnvelope(value: unknown): UploadedAssetEnvelope | null {
  const parsed = typeof value === "string" ? tryParseJson(value) : value;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Partial<UploadedAssetEnvelope>;
  const detectedType = String(candidate.detectedType ?? "");
  const encoding = candidate.encoding;
  if (
    candidate.kind !== "uploaded_file" ||
    typeof candidate.name !== "string" ||
    typeof candidate.mimeType !== "string" ||
    typeof candidate.size !== "number" ||
    !Number.isFinite(candidate.size) ||
    !isUploadedAssetStateType(detectedType) ||
    typeof candidate.content !== "string" ||
    (encoding !== "text" && encoding !== "data_url")
  ) {
    return null;
  }

  return {
    kind: "uploaded_file",
    name: candidate.name,
    mimeType: candidate.mimeType,
    size: candidate.size,
    detectedType,
    content: candidate.content,
    encoding,
  };
}

export async function createUploadedAssetEnvelope(file: File): Promise<UploadedAssetEnvelope> {
  const detectedType = detectUploadedAssetTypeFromFileName(file.name, file.type);
  const encoding = detectedType === "file" && isTextLikeUploadedFile(file) ? "text" : "data_url";

  return {
    kind: "uploaded_file",
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    detectedType,
    content: encoding === "text" ? await file.text() : await fileToDataUrl(file),
    encoding,
  };
}

export function resolveUploadedAssetInputAccept(assetType: UploadedAssetType | null) {
  switch (assetType) {
    case "image":
      return IMAGE_ACCEPT;
    case "audio":
      return AUDIO_ACCEPT;
    case "video":
      return VIDEO_ACCEPT;
    default:
      return GENERIC_FILE_ACCEPT;
  }
}

export function resolveUploadedAssetLabel(assetType: UploadedAssetType | null) {
  switch (assetType) {
    case "image":
      return "image";
    case "audio":
      return "audio clip";
    case "video":
      return "video";
    default:
      return "file";
  }
}

export function resolveUploadedAssetSummary(asset: UploadedAssetEnvelope | null) {
  if (!asset) {
    return "";
  }
  return `${asset.mimeType} · ${Math.max(1, Math.round(asset.size / 1024))} KB`;
}

export function resolveUploadedAssetTextPreview(asset: UploadedAssetEnvelope | null) {
  if (!asset || asset.encoding !== "text") {
    return "";
  }
  return asset.content.slice(0, 3000);
}

export function resolveUploadedAssetDescription(asset: UploadedAssetEnvelope | null, assetType: UploadedAssetType | null) {
  if (asset) {
    return `Stored as ${asset.detectedType} upload. ${resolveUploadedAssetSummary(asset)}`;
  }

  switch (assetType) {
    case "image":
      return "Upload a reference image for this workflow.";
    case "audio":
      return "Upload an audio clip that this workflow should read.";
    case "video":
      return "Upload a video asset that this workflow should inspect.";
    default:
      return "Upload a file to seed this workflow.";
  }
}

async function fileToDataUrl(file: File) {
  if (typeof FileReader !== "undefined") {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(reader.error || new Error("Failed to read file.")));
      reader.readAsDataURL(file);
    });
  }

  const base64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
  return `data:${file.type || "application/octet-stream"};base64,${base64}`;
}

function isTextLikeUploadedFile(file: File) {
  const normalizedMimeType = file.type.toLowerCase().trim();
  if (normalizedMimeType.startsWith("text/")) {
    return true;
  }
  if (
    normalizedMimeType === "application/json" ||
    normalizedMimeType === "application/xml" ||
    normalizedMimeType === "application/javascript" ||
    normalizedMimeType === "application/x-javascript" ||
    normalizedMimeType === "application/x-ndjson" ||
    normalizedMimeType.endsWith("+json") ||
    normalizedMimeType.endsWith("+xml")
  ) {
    return true;
  }

  return /\.(txt|md|markdown|csv|tsv|json|jsonl|yaml|yml|xml|html|htm|css|js|jsx|ts|tsx|py|java|c|cc|cpp|h|hpp|cs|go|rs|rb|php|sh|bash|zsh|fish|bat|cmd|ps1|sql|log|ini|toml|env|gitignore)$/i.test(
    file.name,
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
