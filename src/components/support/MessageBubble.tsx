import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Download, FileText, X, Check, CornerUpLeft } from 'lucide-react';
import type { ChatMessage } from '../../types';
import DeliveryStatus from './DeliveryStatus';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  showStatus?: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function fileIcon(fileName?: string) {
  if (!fileName) return <FileText size={16} />;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return null;
  return <FileText size={16} />;
}

export default function MessageBubble({ message, isOwn, onDelete, onEdit, showStatus }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
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
          <Trash2 size={10} />
          {message.createdAt.includes('deleted') ? ' ' : 'تم حذف الرسالة'}
        </div>
      </div>
    );
  }

  const isImage = message.type === 'image' && message.fileUrl;

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
          borderRight: `2px solid var(--color-primary)`,
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
        padding: message.type === 'image' && message.fileUrl ? '4px' : '10px 14px',
        border: isOwn ? 'none' : '1px solid var(--color-border)',
        boxShadow: isOwn ? '0 1px 4px rgba(0,210,255,0.2)' : '0 1px 2px rgba(0,0,0,0.06)',
        transition: 'all 0.15s ease',
      }}>
        {isImage && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
            <img src={message.fileUrl} alt="" loading="lazy"
              style={{
                width: '100%', maxWidth: '280px', maxHeight: '200px',
                objectFit: 'cover', display: 'block', borderRadius: '12px',
                cursor: 'pointer',
              }}
              onClick={() => window.open(message.fileUrl, '_blank')} />
          </div>
        )}

        {message.type === 'file' && message.fileUrl && (
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
              borderRadius: '8px',
              background: isOwn ? 'rgba(0,0,0,0.1)' : 'var(--badge-bg)',
              color: isOwn ? '#050816' : 'var(--text-primary)',
              textDecoration: 'none', marginBottom: '4px', fontSize: '0.78rem',
            }}>
            {fileIcon(message.fileName)}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message.fileName || 'ملف'}
            </span>
            <Download size={14} />
          </a>
        )}

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
            {message.content}
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

      {/* Actions (edit/delete) - shown on hover */}
      {isOwn && !editing && showActions && (
        <div style={{
          display: 'flex', gap: '4px', padding: '2px 4px 0',
          animation: 'fadeIn 0.12s ease',
        }}>
          <button onClick={() => { setEditText(message.content); setEditing(true); }}
            title="تعديل"
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '3px', display: 'flex' }}>
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(message.id)} title="حذف"
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '3px', display: 'flex' }}>
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
