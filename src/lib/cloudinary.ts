import { uploadFile } from '../firebase/storage';

export async function uploadImageWithCompression(file: File, onProgress?: (pct: number) => void): Promise<string> {
  let imageToUpload = file;

  if (file.type.startsWith('image/')) {
    try {
      const { default: imageCompression } = await import('browser-image-compression');
      imageToUpload = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
    } catch {
      // fallback: upload original
    }
  }

  return uploadFile(imageToUpload, 'other', (pct) => onProgress?.(pct));
}
