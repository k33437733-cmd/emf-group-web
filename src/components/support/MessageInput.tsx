import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  onSend: (text: string, file?: File) => void;
  onTyping: (typing: boolean) => void;
  sending: boolean;
  uploadProgress: number;
  disabled?: boolean;
  rtl?: boolean;
}

export default function MessageInput({ onSend, onTyping, sending, uploadProgress, disabled, rtl = true }: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = useCallback(() => {
    if (sending || disabled || (!text.trim() && !file)) return;
    onSend(text.trim(), file || undefined);
    setText('');
    setFile(null);
    if (typingRef.current) { onTyping(false); typingRef.current = false; }
    inputRef.current?.focus();
  }, [text, file, sending, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (val: string) => {
    setText(val);
    if (!typingRef.current && val) { typingRef.current = true; onTyping(true); }
    if (!val && typingRef.current) { typingRef.current = false; onTyping(false); }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  return (
    <div style={{
      borderTop: '1px solid var(--color-border)', padding: '12px 16px',
      background: 'var(--bg-surface, var(--bg-secondary))',
      direction: rtl ? 'rtl' : 'ltr',
    }}>
      {file && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', marginBottom: '8px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
          <ImageIcon size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{file.name}</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px' }}><X size={14} /></button>
        </div>
      )}

      {uploadProgress > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.2s' }} />
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '2px', textAlign: 'center' }}>جاري الرفع {uploadProgress}%</div>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '8px',
        border: dragOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-border)',
        borderRadius: '12px', padding: '4px 4px 4px 12px',
        background: dragOver ? 'rgba(0,210,255,0.04)' : 'var(--input-bg)',
        transition: 'all 0.15s',
      }}
        onDrop={handleFileDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
        <textarea ref={inputRef} value={text} onChange={e => handleChange(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={dragOver ? 'أفلت الملف هنا...' : 'اكتب رسالتك...'}
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit',
            resize: 'none', maxHeight: '120px', lineHeight: 1.5, padding: '8px 0',
          }} />

        <input ref={fileRef} type="file" hidden onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()} disabled={sending}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
          <Paperclip size={18} />
        </button>
        <button onClick={handleSend} disabled={sending || disabled || (!text.trim() && !file)}
          style={{
            background: text.trim() || file ? 'var(--color-primary)' : 'var(--border-color)',
            border: 'none', borderRadius: '10px', color: text.trim() || file ? '#050816' : 'var(--text-tertiary)',
            cursor: (sending || disabled || (!text.trim() && !file)) ? 'not-allowed' : 'pointer',
            padding: '8px 10px', display: 'flex', flexShrink: 0,
            transition: 'all 0.15s', opacity: sending ? 0.6 : 1,
          }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
