import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import FilePreview from './FilePreview';
import ReplyPreview from './ReplyPreview';
import type { PreviewItem } from './FilePreview';
import type { ChatMessage } from '../../types';

interface Props {
  onSend: (text: string, files?: File[]) => void;
  onTyping: (typing: boolean) => void;
  sending: boolean;
  uploadProgress: number;
  disabled?: boolean;
  rtl?: boolean;
  isAdmin?: boolean;
  isInternal?: boolean;
  onToggleInternal?: () => void;
  replyToMsg?: ChatMessage | null;
  onCancelReply?: () => void;
}

const EMOJIS = ['😊','😂','❤️','🔥','👍','🎉','😍','🤔','🙏','💪','👏','😢','😡','🤯','🥳','😎','✨','💀','☀️','🌙','⭐','🌈','🍀','🎯','📌','💡','🔔','💬','📷','🎵','🚀','💯','✅','❌','⏰','🔝','👀','💎','🆕','🥺','😱','🤗','😈','👻','👽','🤖','🎃','💥','🔥','⭐','🎶','💝','🖤','💚','💙','💜','🤍','🤎','💕','💗','💖','✨','🌟','💫','🎊','🎉','🎁','🏆','🥇','🥈','🥉','⚽','🏀','🎮','🎲','♟️','🎯','🎨','🎭','🎤','🎧','🎸','🎹','🥁','🎷','🎺','📱','💻','🖥️','⌨️','🖱️','📀','💿','📹','📸','📽️','🎬','☎️','📞','📟','📠','🔊','📢','📣','🔔','🔕','🎵','🎶','💬','💭','🗨️','🗯️','💤','💢','💦','💨'];

const MessageInput = memo(function MessageInput({ onSend, onTyping, sending, uploadProgress, disabled, rtl = true, isAdmin, isInternal, onToggleInternal, replyToMsg, onCancelReply }: Props) {
  const [text, setText] = useState('');
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        setPreviewItems(prev => [...prev, ...pastedFiles.map(f => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, file: f, previewUrl: URL.createObjectURL(f) }))]);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleSend = useCallback(() => {
    if (sending || disabled || (!text.trim() && previewItems.length === 0)) return;
    if (previewItems.length > 0) return;
    onSend(text.trim(), undefined);
    setText('');
    if (typingRef.current) { onTyping(false); typingRef.current = false; }
    inputRef.current?.focus();
  }, [text, previewItems, sending, disabled, onSend]);

  const handlePreviewSend = useCallback((compressedMap: Map<string, File>) => {
    if (sending || disabled) return;
    const files = previewItems.map(item => compressedMap.get(item.id) || item.file);
    onSend(text.trim(), files);
    setText('');
    setPreviewItems([]);
    previewItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    if (typingRef.current) { onTyping(false); typingRef.current = false; }
    inputRef.current?.focus();
  }, [text, previewItems, sending, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (val: string) => {
    setText(val);
    if (!typingRef.current && val) { typingRef.current = true; onTyping(true); }
    if (!val && typingRef.current) { typingRef.current = false; onTyping(false); }
  };

  // File handlers
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const items: PreviewItem[] = Array.from(newFiles).map(f => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setPreviewItems(prev => [...prev, ...items]);
  }, []);

  const removePreviewItem = useCallback((id: string) => {
    setPreviewItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const cancelPreview = useCallback(() => {
    previewItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setPreviewItems([]);
  }, [previewItems]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const hasContent = text.trim() || previewItems.length > 0;

  return (
    <div style={{
      borderTop: '1px solid var(--color-border)', padding: '8px 16px',
      background: 'var(--bg-surface, var(--bg-secondary))',
      direction: rtl ? 'rtl' : 'ltr',
      position: 'relative',
    }}>
      {showEmoji && (
        <div ref={emojiRef} style={{
          position: 'absolute', bottom: '100%', left: rtl ? 'auto' : '16px',
          right: rtl ? '16px' : 'auto',
          background: 'var(--bg-elevated)', borderRadius: '12px',
          border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          padding: '8px', width: '300px', maxHeight: '200px', overflowY: 'auto',
          display: 'flex', flexWrap: 'wrap', gap: '2px', zIndex: 100,
          animation: 'popupIn 0.15s ease',
        }}>
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => insertEmoji(emoji)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '1.1rem', borderRadius: '6px', lineHeight: 1 }}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* File Preview Dialog */}
      {previewItems.length > 0 && (
        <FilePreview
          items={previewItems}
          onRemove={removePreviewItem}
          onSend={handlePreviewSend}
          onCancel={cancelPreview}
        />
      )}

      {/* Voice Recorder */}
      {showVoice && (
        <VoiceRecorder
          onSend={(file) => {
            setPreviewItems(prev => [...prev, {
              id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
              file,
              previewUrl: file.type.startsWith('audio/') ? '' : URL.createObjectURL(file),
            }]);
            setShowVoice(false);
          }}
          onCancel={() => setShowVoice(false)}
          disabled={sending}
        />
      )}

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

      {/* Reply preview */}
      {replyToMsg && onCancelReply && (
        <ReplyPreview message={replyToMsg} onCancel={onCancelReply} rtl={rtl} />
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '4px',
        border: dragOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-border)',
        borderRadius: '12px', padding: '2px 4px 2px 12px',
        background: dragOver ? 'rgba(0,210,255,0.04)' : 'var(--input-bg)',
        transition: 'all 0.15s',
      }}
        onDrop={handleFileDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>

        <textarea ref={inputRef} value={text}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={dragOver ? 'أفلت الملفات هنا...' : 'اكتب رسالتك...'}
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit',
            resize: 'none', maxHeight: '120px', lineHeight: 1.5, padding: '8px 0',
          }} />

        {/* Internal notes toggle */}
        {isAdmin && onToggleInternal && (
          <button onClick={onToggleInternal} title={isInternal ? 'ملاحظة داخلية (مرئية للمسؤولين فقط)' : 'رسالة عادية'}
            style={{
              background: isInternal ? 'rgba(245,158,11,0.15)' : 'none',
              border: 'none', borderRadius: '6px',
              color: isInternal ? '#F59E0B' : 'var(--text-tertiary)',
              cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0,
              fontSize: '0.55rem', fontWeight: 600,
            }}>
            {isInternal ? 'داخلي' : 'عام'}
          </button>
        )}

        {/* Emoji */}
        <button onClick={() => setShowEmoji(s => !s)}
          style={{ background: 'none', border: 'none', color: showEmoji ? 'var(--color-primary)' : 'var(--text-tertiary)', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
          <Smile size={18} />
        </button>

        {/* Attachment */}
        <input ref={fileRef} type="file" multiple hidden
          onChange={e => { if (e.target.files && e.target.files.length > 0) addFiles(e.target.files); }} />
        <button onClick={() => fileRef.current?.click()} disabled={sending}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
          <Paperclip size={18} />
        </button>

        {/* Voice recording */}
        <button onClick={() => setShowVoice(v => !v)} disabled={sending}
          style={{
            background: showVoice ? 'var(--color-primary)' : 'none',
            border: 'none', borderRadius: '8px',
            color: showVoice ? '#050816' : 'var(--text-tertiary)',
            cursor: sending ? 'not-allowed' : 'pointer',
            padding: '6px', display: 'flex', flexShrink: 0,
            transition: 'all 0.15s',
          }}>
          <Mic size={18} />
        </button>

        {/* Send */}
        <button onClick={handleSend}
          disabled={sending || disabled || !text.trim()}
          style={{
            background: text.trim() ? 'var(--color-primary)' : 'var(--border-color)',
            border: 'none', borderRadius: '10px',
            color: text.trim() ? '#050816' : 'var(--text-tertiary)',
            cursor: (sending || disabled || !text.trim()) ? 'not-allowed' : 'pointer',
            padding: '8px 10px', display: 'flex', flexShrink: 0,
            transition: 'all 0.15s', opacity: sending ? 0.6 : 1,
          }}>
          <Send size={16} />
        </button>
      </div>

      <style>{`
        @keyframes popupIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
});

export default MessageInput;
