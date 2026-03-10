import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Response } from "express";
import { randomUUID } from "crypto";

// Use process.cwd() so paths are consistent in both dev (tsx server/index.ts)
// and production (node dist/index.js) — both run from the project root.
function getPublicUploadsDir(): string {
  return path.join(process.cwd(), "dist", "public", "uploads");
}

function getPrivateUploadsDir(): string {
  return path.join(process.cwd(), "private-uploads");
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  async uploadPublicFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    subfolder: string = "company-branding"
  ): Promise<string> {
    const objectId = randomUUID();
    const extension = filename.split(".").pop() || "";
    const dir = path.join(getPublicUploadsDir(), subfolder);
    await fsp.mkdir(dir, { recursive: true });
    const savedFilename = `${objectId}.${extension}`;
    await fsp.writeFile(path.join(dir, savedFilename), buffer);
    return `/uploads/${subfolder}/${savedFilename}`;
  }

  async uploadPrivateFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    subfolder: string = "leave-mc"
  ): Promise<string> {
    const objectId = randomUUID();
    const extension = filename.split(".").pop() || "";
    const dir = path.join(getPrivateUploadsDir(), subfolder);
    await fsp.mkdir(dir, { recursive: true });
    const savedFilename = `${objectId}.${extension}`;
    await fsp.writeFile(path.join(dir, savedFilename), buffer);
    return `/private-objects/${subfolder}/${savedFilename}`;
  }

  async getPrivateFilePath(filePath: string): Promise<string | null> {
    const relativePath = filePath.replace(/^\/private-objects\//, "");
    const fullPath = path.join(getPrivateUploadsDir(), relativePath);
    try {
      await fsp.access(fullPath);
      return fullPath;
    } catch {
      return null;
    }
  }

  async downloadObject(filePath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      const stats = await fsp.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".pdf": "application/pdf",
        ".webp": "image/webp",
      };
      res.set({
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Content-Length": String(stats.size),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });
      const stream = fs.createReadStream(filePath);
      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error downloading file" });
    }
  }

  async deletePrivateFile(filePath: string): Promise<void> {
    const relativePath = filePath.replace(/^\/private-objects\//, "");
    const fullPath = path.join(getPrivateUploadsDir(), relativePath);
    try {
      await fsp.unlink(fullPath);
    } catch {
      // ignore if not found
    }
  }

  normalizePublicAssetPath(rawPath: string): string {
    // No cloud storage URLs to normalize — return path as-is
    return rawPath;
  }
}
