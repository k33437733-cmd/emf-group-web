import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Pencil, Trash2, Download, X, Check, CornerUpLeft, Expand, Forward } from 'lucide-react';
import type { ChatMessage } from '../../types';
import DeliveryStatus from './DeliveryStatus';
import { getFileIcon, getFileLabel } from '../../lib/fileTypeIcons';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onForward?: (msg: ChatMessage) => void;
  showStatus?: boolean;
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"])/g;
const CODE_BLOCK_RE = /```(\w*)\n?([\s\S]*?)```/g;

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']);

function isAudio(name?: string) { const e = name?.split('.').pop()?.toLowerCase(); return e ? AUDIO_EXTS.has(e) : false; }
function isVideo(name?: string) { const e = name?.split('.').pop()?.toLowerCase(); return e ? VIDEO_EXTS.has(e) : false; }

function renderContent(content: string): (string | React.JSX.Element)[] {
  const parts: (string | React.JSX.Element)[] = [];
  let lastIdx = 0;
  let codeMatch: RegExpExecArray | null;

  // First, extract code blocks
  const codeBlocks: { start: number; end: number; el: React.JSX.Element }[] = [];
  const codeRe = new RegExp(CODE_BLOCK_RE.source, 'g');
  while ((codeMatch = codeRe.exec(content)) !== null) {
    const lang = codeMatch[1] || 'plaintext';
    const code = codeMatch[2].replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBlocks.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
      el: (
        <pre key={`cb-${codeMatch.index}`} style={{
          background: 'var(--bg-code, #0d1117)', color: '#c9d1d9',
          borderRadius: '8px', padding: '10px 14px', overflowX: 'auto',
          fontSize: '0.72rem', direction: 'ltr', textAlign: 'left',
          margin: '6px 0', border: '1px solid var(--color-border)',
        }}>
          {lang && <div style={{ fontSize: '0.6rem', color: '#8b949e', marginBottom: '4px' }}>{lang}</div>}
          <code style={{ fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace", whiteSpace: 'pre' }}>{code}</code>
        </pre>
      ),
    });
  }

  if (codeBlocks.length === 0) {
    // Simple text with link detection
    const segments = content.split(URL_RE);
    segments.forEach((seg, i) => {
      if (URL_RE.test(seg)) {
        URL_RE.lastIndex = 0;
        parts.push(<a key={i} href={seg} target="_blank" rel="noopener noreferrer"
          style={{ color: isOwn ? '#050816' : 'var(--color-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>
          {seg}
        </a>);
      } else {
        parts.push(seg);
      }
    });
    return parts;
  }

  // Mixed code blocks and text
  let ptr = 0;
  let key = 0;
  for (const cb of codeBlocks) {
    if (cb.start > ptr) {
      const text = content.slice(ptr, cb.start);
      const segments = text.split(URL_RE);
      segments.forEach((seg, i) => {
        if (URL_RE.test(seg)) {
          URL_RE.lastIndex = 0;
          parts.push(<a key={`${key}-${i}`} href={seg} target="_blank" rel="noopener noreferrer"
            style={{ color: isOwn ? '#050816' : 'var(--color-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>
            {seg}
          </a>);
        } else {
          parts.push(seg);
        }
      });
    }
    parts.push(cb.el);
    ptr = cb.end;
    key++;
  }
  if (ptr < content.length) {
    const text = content.slice(ptr);
    const segments = text.split(URL_RE);
    segments.forEach((seg, i) => {
      if (URL_RE.test(seg)) {
        URL_RE.lastIndex = 0;
        parts.push(<a key={`end-${i}`} href={seg} target="_blank" rel="noopener noreferrer"
          style={{ color: isOwn ? '#050816' : 'var(--color-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>
          {seg}
        </a>);
      } else {
        parts.push(seg);
      }
    });
  }
  return parts;
}

function MessageBubbleInner({ message, isOwn, onDelete, onEdit, showStatus }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [lightbox, setLightbox] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (message.deletedAt) {
    return (
      <div style={{
        display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start',
        padding: '2px 16px', opacity: 0.35,
      }}>
        <div style={{
          fontSize: '0.7rem', color: 'var(--text-tertiary)',
          fontStyle: 'italic', padding: '4px 0',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Trash2 size={10} /> تم حذف الرسالة
        </div>
      </div>
    );
  }

  const fileName = message.fileName || '';
  const fileUrl = message.fileUrl || '';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start',
      padding: '1px 16px',
      animation: 'msgIn 0.2s ease',
      position: 'relative',
    }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}>

      {/* Reply indicator */}
      {message.replyTo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '2px 10px', marginBottom: '2px',
          borderRadius: '6px 6px 0 0',
          background: isOwn ? 'rgba(0,0,0,0.08)' : 'var(--badge-bg)',
          fontSize: '0.62rem', color: 'var(--text-tertiary)',
          maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          borderRight: '2px solid var(--color-primary)',
        }}>
          <CornerUpLeft size={10} />
          {message.replyTo}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '75%', minWidth: '60px',
        background: isOwn ? 'var(--color-primary)' : 'var(--bg-card)',
        color: isOwn ? '#050816' : 'var(--text-primary)',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: (fileUrl && !isVideo(fileName) && !isAudio(fileName)) ? '4px' : '10px 14px',
        border: isOwn ? 'none' : '1px solid var(--color-border)',
        boxShadow: isOwn ? '0 1px 4px rgba(0,210,255,0.2)' : '0 1px 2px rgba(0,0,0,0.06)',
        transition: 'all 0.15s ease',
      }}>

        {/* Image */}
        {fileUrl && IMAGE_EXTS.has(fileName.split('.').pop()?.toLowerCase() || '') && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '4px', position: 'relative' }}>
            <img src={fileUrl} alt="" loading="lazy"
              style={{ width: '100%', maxWidth: '280px', maxHeight: '200px', objectFit: 'cover', display: 'block', borderRadius: '12px', cursor: 'pointer' }}
              onClick={() => setLightbox(fileUrl)} />
          </div>
        )}

        {/* Video */}
        {fileUrl && isVideo(fileName) && (
          <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '4px', maxWidth: '320px' }}>
            <video src={fileUrl} controls preload="metadata"
              style={{ width: '100%', display: 'block', borderRadius: '8px', background: '#000' }}>
              متصفحك لا يدعم تشغيل الفيديو
            </video>
          </div>
        )}

        {/* Audio */}
        {fileUrl && isAudio(fileName) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
            borderRadius: '8px', background: isOwn ? 'rgba(0,0,0,0.08)' : 'var(--badge-bg)',
            marginBottom: '4px', minWidth: '200px',
          }}>
            <audio src={fileUrl} controls preload="none"
              style={{ width: '100%', height: '32px' }}>
              متصفحك لا يدعم تشغيل الصوت
            </audio>
          </div>
        )}

        {/* File (non-image, non-video, non-audio) */}
        {fileUrl && !IMAGE_EXTS.has(fileName.split('.').pop()?.toLowerCase() || '') && !isVideo(fileName) && !isAudio(fileName) && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
              borderRadius: '8px', background: isOwn ? 'rgba(0,0,0,0.1)' : 'var(--badge-bg)',
              color: isOwn ? '#050816' : 'var(--text-primary)',
              textDecoration: 'none', marginBottom: '4px', fontSize: '0.78rem',
            }}>
            {getFileIcon(fileName)}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: isOwn ? '#050816' : 'var(--color-primary)', color: '#fff', borderRadius: '4px', padding: '2px 5px', fontSize: '0.6rem', fontWeight: 600, flexShrink: 0 }}>
                {getFileLabel(fileName)}
              </span>
              {fileName || 'ملف'}
            </span>
            <Download size={14} style={{ flexShrink: 0 }} />
          </a>
        )}

        {/* Text content */}
        {editing ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={editText} onChange={e => setEditText(e.target.value)}
              style={{
                flex: 1, background: 'var(--input-bg)',
                border: '1px solid var(--color-border)', borderRadius: '8px',
                padding: '6px 8px', color: 'var(--text-primary)',
                fontSize: '0.82rem', resize: 'none', fontFamily: 'inherit',
                minWidth: '120px',
              }} />
            <button onClick={() => { onEdit(message.id, editText); setEditing(false); }}
              style={{ background: 'none', border: 'none', color: isOwn ? '#050816' : 'var(--color-primary)', cursor: 'pointer', padding: '2px' }}>
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {renderContent(message.content)}
          </div>
        )}

        {/* Time + Status */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
          {message.editedAt && (
            <span style={{ fontSize: '0.55rem', opacity: 0.5, color: isOwn ? '#050816' : 'var(--text-tertiary)' }}>
              edited
            </span>
          )}
          <span style={{ fontSize: '0.6rem', opacity: 0.6, color: isOwn ? '#050816' : 'var(--text-tertiary)' }}>
            {formatTime(message.createdAt)}
          </span>
          {showStatus && isOwn && (
            <DeliveryStatus status={message.deliveryStatus} edited={!!message.editedAt} deleted={!!message.deletedAt} />
          )}
        </div>
      </div>

      {/* Actions */}
      {!editing && showActions && (
        <div style={{ display: 'flex', gap: '4px', padding: '2px 4px 0', animation: 'fadeIn 0.12s ease' }}>
          {isOwn && (
            <>
              <button onClick={() => { setEditText(message.content); setEditing(true); }} title="تعديل"
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '3px', display: 'flex' }}>
                <Pencil size={12} />
              </button>
              <button onClick={() => onDelete(message.id)} title="حذف"
                style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '3px', display: 'flex' }}>
                <Trash2 size={12} />
              </button>
            </>
          )}
          {onForward && (
            <button onClick={() => onForward(message)} title="توجيه"
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '3px', display: 'flex' }}>
              <Forward size={12} />
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox('')} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}

      <style>{`
        @keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default memo(MessageBubbleInner, (prev, next) => {
  return prev.message.id === next.message.id
    && prev.message.content === next.message.content
    && prev.message.editedAt === next.message.editedAt
    && prev.message.deletedAt === next.message.deletedAt
    && prev.message.deliveryStatus === next.message.deliveryStatus
    && prev.isOwn === next.isOwn
    && prev.showStatus === next.showStatus;
});
