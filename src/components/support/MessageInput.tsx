import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Smile } from 'lucide-react';

interface Props {
  onSend: (text: string, file?: File) => void;
  onTyping: (typing: boolean) => void;
  sending: boolean;
  uploadProgress: number;
  disabled?: boolean;
  rtl?: boolean;
}

const EMOJIS = ['😊','😂','❤️','🔥','👍','🎉','😍','🤔','🙏','💪','👏','😢','😡','🤯','🥳','😎','✨','💀','☀️','🌙','⭐','🌈','🍀','🎯','📌','💡','🔔','💬','📷','🎵','🚀','💯','✅','❌','⏰','🔝','👀','💎','🆕'];

export default function MessageInput({ onSend, onTyping, sending, uploadProgress, disabled, rtl = true }: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const hasContent = text.trim() || file;

  return (
    <div style={{
      borderTop: '1px solid var(--color-border)', padding: '8px 16px',
      background: 'var(--bg-surface, var(--bg-secondary))',
      direction: rtl ? 'rtl' : 'ltr',
      position: 'relative',
    }}>
      {/* Emoji picker */}
      {showEmoji && (
        <div ref={emojiRef} style={{
          position: 'absolute', bottom: '100%', left: rtl ? 'auto' : '16px',
          right: rtl ? '16px' : 'auto',
          background: 'var(--bg-elevated)', borderRadius: '12px',
          border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          padding: '8px', width: '280px', maxHeight: '180px', overflowY: 'auto',
          display: 'flex', flexWrap: 'wrap', gap: '4px', zIndex: 100,
          animation: 'popupIn 0.15s ease',
        }}>
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => insertEmoji(emoji)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                fontSize: '1.2rem', borderRadius: '6px', transition: 'background 0.1s',
                lineHeight: 1,
              }}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* File preview */}
      {file && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 10px', marginBottom: '8px',
          background: 'var(--bg-card)', borderRadius: '8px',
          border: '1px solid var(--color-border)', fontSize: '0.78rem',
        }}>
          <ImageIcon size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
            {file.name}
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
          <button onClick={() => setFile(null)}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ height: '3px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.2s' }} />
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '2px', textAlign: 'center' }}>
            جاري الرفع {uploadProgress}%
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '6px',
        border: dragOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-border)',
        borderRadius: '12px', padding: '4px 4px 4px 12px',
        background: dragOver ? 'rgba(0,210,255,0.04)' : 'var(--input-bg)',
        transition: 'all 0.15s',
      }}
        onDrop={handleFileDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>

        <textarea ref={inputRef} value={text}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={dragOver ? 'أفلت الملف هنا...' : 'اكتب رسالتك...'}
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit',
            resize: 'none', maxHeight: '120px', lineHeight: 1.5, padding: '8px 0',
          }} />

        {/* Emoji button */}
        <button onClick={() => setShowEmoji(s => !s)}
          style={{
            background: 'none', border: 'none', color: showEmoji ? 'var(--color-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0,
          }}>
          <Smile size={18} />
        </button>

        {/* File attachment button */}
        <input ref={fileRef} type="file" hidden
          onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()} disabled={sending}
          style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0,
          }}>
          <Paperclip size={18} />
        </button>

        {/* Send button */}
        <button onClick={handleSend}
          disabled={sending || disabled || !hasContent}
          style={{
            background: hasContent ? 'var(--color-primary)' : 'var(--border-color)',
            border: 'none', borderRadius: '10px',
            color: hasContent ? '#050816' : 'var(--text-tertiary)',
            cursor: (sending || disabled || !hasContent) ? 'not-allowed' : 'pointer',
            padding: '8px 10px', display: 'flex', flexShrink: 0,
            transition: 'all 0.15s', opacity: sending ? 0.6 : 1,
          }}>
          <Send size={16} />
        </button>
      </div>

      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
