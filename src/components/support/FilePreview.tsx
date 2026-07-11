import { useState, useEffect, useCallback, memo } from 'react';
import { X, Send, FileText, Video, AlertCircle, Loader2 } from 'lucide-react';
import { getImageMeta, getVideoMeta, compressImage, formatDuration, formatFileSize, isImageFile, isVideoFile } from '../../lib/mediaUtils';
import type { ImageMeta, VideoMeta } from '../../lib/mediaUtils';

export interface PreviewItem {
  id: string;
  file: File;
  previewUrl: string;
  compressedFile?: File;
  meta?: ImageMeta | VideoMeta;
  metaLoading?: boolean;
  metaError?: string;
}

interface Props {
  items: PreviewItem[];
  onRemove: (id: string) => void;
  onSend: (compressedMap: Map<string, File>) => void;
  onCancel: () => void;
}

const FilePreviewCard = memo(function FilePreviewCard({ item, onRemove }: { item: PreviewItem; onRemove: () => void }) {
  const img = isImageFile(item.file);
  const vid = isVideoFile(item.file);

  const dims = item.meta && 'width' in item.meta ? item.meta as ImageMeta : null;
  const vmeta = item.meta && 'duration' in item.meta ? item.meta as VideoMeta : null;
  const thumbnailUrl = vmeta?.thumbnailBlob ? URL.createObjectURL(vmeta.thumbnailBlob) : null;

  return (
    <div style={{
      borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)',
      background: 'var(--bg-card)', width: '180px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Thumbnail / Preview */}
      <div style={{
        height: '120px', background: 'var(--bg-surface)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        {img && (
          <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {vid && thumbnailUrl && (
          <img src={thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {vid && !thumbnailUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)' }}>
            <Video size={32} />
            <span style={{ fontSize: '0.6rem' }}>فيديو</span>
          </div>
        )}
        {!img && !vid && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)' }}>
            <FileText size={32} />
            <span style={{ fontSize: '0.6rem' }}>ملف</span>
          </div>
        )}

        {/* Remove button */}
        <button onClick={onRemove}
          style={{
            position: 'absolute', top: '4px', right: '4px',
            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
            color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex',
          }}>
          <X size={12} />
        </button>

        {/* Video duration badge */}
        {vmeta && (
          <div style={{
            position: 'absolute', bottom: '4px', left: '4px',
            background: 'rgba(0,0,0,0.7)', borderRadius: '4px',
            padding: '1px 5px', fontSize: '0.58rem', color: '#fff', direction: 'ltr',
          }}>
            {formatDuration(vmeta.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.file.name}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
          {formatFileSize(item.file.size)}
          {dims && ` · ${dims.width}×${dims.height}`}
        </span>
        {item.metaLoading && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} />
            معالجة...
          </span>
        )}
        {item.metaError && (
          <span style={{ fontSize: '0.6rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <AlertCircle size={10} /> {item.metaError}
          </span>
        )}
      </div>
    </div>
  );
});

const FilePreview = memo(function FilePreview({ items, onRemove, onSend, onCancel }: Props) {
  const [compressedMap] = useState(() => new Map<string, File>());

  // Compress images and extract metadata
  useEffect(() => {
    items.forEach(async (item) => {
      if (isImageFile(item.file)) {
        try {
          const compressed = await compressImage(item.file);
          compressedMap.set(item.id, compressed);
        } catch {}
        try {
          await getImageMeta(item.file);
        } catch {}
      }
      if (isVideoFile(item.file)) {
        try {
          await getVideoMeta(item.file);
        } catch {}
      }
    });
  }, [items, compressedMap]);

  const handleSend = useCallback(() => {
    const map = new Map<string, File>();
    items.forEach(item => {
      map.set(item.id, compressedMap.get(item.id) || item.file);
    });
    onSend(map);
  }, [items, compressedMap, onSend]);

  if (items.length === 0) return null;

  return (
    <div style={{
      borderBottom: '1px solid var(--color-border)',
      padding: '12px 16px',
      background: 'var(--bg-surface)',
      animation: 'slideDown 0.2s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          معاينة الملفات ({items.length})
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onCancel}
            style={{
              background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px',
              color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 12px',
              fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
            <X size={13} /> إلغاء
          </button>
          <button onClick={handleSend}
            style={{
              background: 'var(--color-primary)', border: 'none', borderRadius: '8px',
              color: '#050816', cursor: 'pointer', padding: '6px 14px',
              fontSize: '0.72rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
            <Send size={13} /> إرسال
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {items.map((item) => (
          <FilePreviewCard
            key={item.id}
            item={item}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </div>

      <style>{`
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 300px; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
});

export default FilePreview;
