import { useRef, useState, useEffect } from 'react';
import { Send, Smile, Paperclip, Loader2, X } from 'lucide-react';
import { uploadImageWithCompression } from '../../lib/cloudinary';

const EMOJIS = ['😊', '😂', '👍', '❤️', '🙏', '🔥', '🎉', '✨', '🤝', '🙌', '👌', '🤔', '👋', '😍', '😎'];

interface PendingFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
  error?: boolean;
}

interface ChatInputProps {
  onSend: (text: string, imageUrls?: string[]) => void;
  placeholder?: string;
}

export default function ChatInput({ onSend, placeholder = 'اكتب رسالتك...' }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    if (fileRef.current) fileRef.current.value = '';

    const newFiles = picked.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      preview: URL.createObjectURL(f),
      uploading: true
    }));
    setFiles(prev => [...prev, ...newFiles]);

    for (const f of newFiles) {
      try {
        const url = await uploadImageWithCompression(f.file);
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, uploading: false, url } : p));
      } catch {
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, uploading: false, error: true } : p));
      }
    }
  };

  const removeFile = (id: string) => {
    const f = files.find(x => x.id === id);
    if (f) URL.revokeObjectURL(f.preview);
    setFiles(prev => prev.filter(x => x.id !== id));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() && files.length === 0) return;
    if (files.some(f => f.uploading)) return;

    const urls = files.filter(f => f.url).map(f => f.url!);
    onSend(text, urls.length > 0 ? urls : undefined);
    setText('');
    setFiles([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
      {/* File previews */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {files.map(f => (
            <div key={f.id} style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#0a1628' }}>
              <img src={f.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              {f.uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={18} className="animate-spin-fast" />
                </div>
              )}
              {f.error && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white' }}>فشل</div>
              )}
              {!f.uploading && !f.error && (
                <button type="button" onClick={() => removeFile(f.id)} style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="form-input"
            style={{ width: '100%', resize: 'none', overflow: 'hidden', padding: '10px 14px', minHeight: '44px', maxHeight: '120px', lineHeight: 1.5 }}
          />
        </div>

        {/* Emoji */}
        <div ref={emojiRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setShowEmoji(s => !s)} style={{
              width: '42px', height: '42px', borderRadius: '10px', border: '1px solid var(--border-color)',
              background: showEmoji ? 'var(--sidebar-active)' : 'transparent',
              color: showEmoji ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer'
            }}>
            <Smile size={18} />
          </button>
          {showEmoji && (
            <div style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: '8px', width: '260px', padding: '10px', background: 'var(--bg-card)',
              border: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 50,
              display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center'
            }}>
              {EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => { setText(t => t + e); setShowEmoji(false); }}
                  style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attach */}
        <div style={{ position: 'relative' }}>
          <input type="file" accept="image/*" multiple ref={fileRef} onChange={handleFilePick} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileRef.current?.click()} style={{
            width: '42px', height: '42px', borderRadius: '10px', border: '1px solid var(--border-color)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer'
          }}>
            <Paperclip size={18} />
          </button>
        </div>

        {/* Send */}
        <button type="submit" disabled={(!text.trim() && files.length === 0) || files.some(f => f.uploading)}
          className="btn btn-primary"
          style={{ width: '42px', height: '42px', borderRadius: '10px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
    </form>
  );
}
