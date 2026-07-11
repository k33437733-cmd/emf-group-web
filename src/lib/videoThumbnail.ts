export async function generateVideoThumbnail(source: string | File): Promise<string | null> {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
  const src = objectUrl ?? source;

  video.src = src as string;

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
        video.onseeked = null;
      };

      video.onloadedmetadata = () => {
        try {
          const duration = Number.isFinite(video.duration) ? video.duration : 0;
          const seekTime = duration > 0 ? Math.min(0.5, duration * 0.1) : 0.1;
          video.currentTime = seekTime;
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onseeked = () => {
        cleanup();
        resolve();
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('failed to load video for thumbnail extraction'));
      };
    });

    const canvas = document.createElement('canvas');
    const width = 640;
    const height = Math.max(360, Math.round((width * video.videoHeight) / Math.max(video.videoWidth, 1)));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error('Failed to generate video thumbnail:', error);
    return null;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
