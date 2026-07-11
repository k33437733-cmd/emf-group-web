import imageCompression from 'browser-image-compression';

export interface ImageMeta { width: number; height: number }
export interface VideoMeta { duration: number; thumbnailBlob: Blob }

export async function compressImage(file: File, maxWidthOrHeight = 1920, maxSizeMB = 1): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const compressed = await imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true });
    return compressed.size < file.size ? compressed : file;
  } catch { return file }
}

export function getImageMeta(file: File): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export function getVideoMeta(file: File, seekTo = 0.5): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.currentTime = Math.min(seekTo, duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); }
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        video.remove();
        if (blob) resolve({ duration: video.duration, thumbnailBlob: blob });
        else reject(new Error('Thumbnail generation failed'));
      }, 'image/jpeg', 0.7);
    };

    video.onerror = () => { URL.revokeObjectURL(url); video.remove(); reject(new Error('Failed to load video')); };
    video.src = url;
  });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTS.includes(getExtension(file.name));
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || VIDEO_EXTS.includes(getExtension(file.name));
}
