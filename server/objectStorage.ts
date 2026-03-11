import { createClient } from "@supabase/supabase-js";
import { Response } from "express";
import { randomUUID } from "crypto";

// Two buckets in Supabase Storage:
//   nexahrsoft-public  — public read (logos, favicons, clock-in logos)
//   nexahrsoft-private — private (MC docs, receipts, employee documents)
const PUBLIC_BUCKET = "nexahrsoft-public";
const PRIVATE_BUCKET = "nexahrsoft-private";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
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

  // Upload to public bucket — returns a permanent public URL
  async uploadPublicFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    subfolder: string = "company-branding"
  ): Promise<string> {
    const supabase = getSupabaseClient();
    const objectId = randomUUID();
    const extension = filename.split(".").pop() || "";
    const storagePath = `${subfolder}/${objectId}.${extension}`;

    const { error } = await supabase.storage
      .from(PUBLIC_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data } = supabase.storage
      .from(PUBLIC_BUCKET)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  // Upload to private bucket — returns an internal path for later retrieval
  async uploadPrivateFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    subfolder: string = "leave-mc"
  ): Promise<string> {
    const supabase = getSupabaseClient();
    const objectId = randomUUID();
    const extension = filename.split(".").pop() || "";
    const storagePath = `${subfolder}/${objectId}.${extension}`;

    const { error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    // Store as /private-objects/subfolder/file so existing DB records stay compatible
    return `/private-objects/${storagePath}`;
  }

  // Returns a short-lived signed URL for private file download
  async getPrivateSignedUrl(filePath: string, expiresInSec = 900): Promise<string | null> {
    const supabase = getSupabaseClient();
    const storagePath = filePath.replace(/^\/private-objects\//, "");

    const { data, error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(storagePath, expiresInSec);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  // Stream a private file through Express (no signed URL exposed to client)
  async downloadObject(filePath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      const supabase = getSupabaseClient();
      const storagePath = filePath.replace(/^\/private-objects\//, "");

      const { data, error } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .download(storagePath);

      if (error || !data) {
        if (!res.headersSent) res.status(404).json({ error: "File not found" });
        return;
      }

      const ext = ("." + storagePath.split(".").pop()).toLowerCase();
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

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.set({
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error downloading file" });
    }
  }

  // Used for legacy disk-path checks — always returns null (no local disk)
  async getPrivateFilePath(_filePath: string): Promise<string | null> {
    return null;
  }

  async deletePrivateFile(filePath: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const storagePath = filePath.replace(/^\/private-objects\//, "");
      await supabase.storage.from(PRIVATE_BUCKET).remove([storagePath]);
    } catch {
      // ignore if not found
    }
  }

  normalizePublicAssetPath(rawPath: string): string {
    return rawPath;
  }
}
