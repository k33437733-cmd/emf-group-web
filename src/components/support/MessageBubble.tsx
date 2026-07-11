import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Download, FileText, X, Check } from 'lucide-react';
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (message.deletedAt) {
    return (
      <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', padding: '2px 16px', opacity: 0.4 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '6px 0' }}>
          تم حذف الرسالة
        </div>
      </div>
    );
  }

  const isImage = message.type === 'image' && message.fileUrl;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start',
      padding: '2px 16px', animation: 'msgIn 0.2s ease',
    }}>
      <div style={{
        maxWidth: '75%', minWidth: '60px',
        background: isOwn ? 'var(--color-primary)' : 'var(--bg-card)',
        color: isOwn ? '#050816' : 'var(--text-primary)',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: message.type === 'image' && message.fileUrl ? '4px' : '10px 14px',
        border: isOwn ? 'none' : '1px solid var(--color-border)',
        transition: 'all 0.15s ease',
      }}>
        {isImage && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
            <img src={message.fileUrl} alt="" loading="lazy" style={{ width: '100%', maxWidth: '280px', maxHeight: '200px', objectFit: 'cover', display: 'block', borderRadius: '12px' }} />
          </div>
        )}

        {message.type === 'file' && message.fileUrl && (
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', background: isOwn ? 'rgba(0,0,0,0.1)' : 'var(--badge-bg)', color: isOwn ? '#050816' : 'var(--text-primary)', textDecoration: 'none', marginBottom: '4px', fontSize: '0.78rem' }}>
            {fileIcon(message.fileName)} <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{message.fileName || 'ملف'}</span>
            <Download size={14} />
          </a>
        )}

        {editing ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={editText} onChange={e => setEditText(e.target.value)}
              style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '0.82rem', resize: 'none', fontFamily: 'inherit', minWidth: '120px' }} />
            <button onClick={() => { onEdit(message.id, editText); setEditing(false); }} style={{ background: 'none', border: 'none', color: isOwn ? '#050816' : 'var(--color-primary)', cursor: 'pointer', padding: '2px' }}><Check size={14} /></button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><X size={14} /></button>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{formatTime(message.createdAt)}</span>
          {showStatus && isOwn && (
            <DeliveryStatus status={message.deliveryStatus} edited={!!message.editedAt} deleted={!!message.deletedAt} />
          )}
        </div>
      </div>

      {isOwn && !editing && (
        <div style={{ display: 'flex', gap: '4px', padding: '2px 4px 0', opacity: 0, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
          <button onClick={() => { setEditText(message.content); setEditing(true); }} title="تعديل" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Pencil size={11} /></button>
          <button onClick={() => onDelete(message.id)} title="حذف" style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px' }}><Trash2 size={11} /></button>
        </div>
      )}

      <style>{`@keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
