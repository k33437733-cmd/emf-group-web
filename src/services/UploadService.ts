import { uploadAttachment } from '../firebase/support';
import { compressImage } from '../lib/mediaUtils';
import { validateFile } from '../lib/sanitize';
import { startMark, endMark } from '../lib/performance';

export type UploadProgressCallback = (pct: number) => void;
export type UploadResult = { url: string; file: File };

export class UploadService {
  static async uploadSingle(
    file: File,
    onProgress?: UploadProgressCallback,
    signal?: AbortSignal,
  ): Promise<string> {
    const validation = validateFile(file);
    if (!validation.valid) throw new Error(validation.error);

    startMark('uploadFile');

    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImage(file);
      } catch {
        // Fallback to original
      }
    }

    try {
      const handle = uploadAttachment(fileToUpload, (pct) => {
        onProgress?.(pct);
      }, signal);
      const url = await handle.promise;
      return url;
    } finally {
      endMark('uploadFile', true);
    }
  }

  static cancelUpload(uploadId: string): void {
    // Cancellation is handled via AbortSignal per-upload
  }
}
