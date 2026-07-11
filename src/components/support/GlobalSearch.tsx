import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MessageSquare, FileText, Image, Video, Mic, User, ArrowRight } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { ChatMessage, Conversation } from '../../types';

interface Props {
  conversations: Conversation[];
  onSelectConversation?: (id: string) => void;
  onSelectMessage?: (convId: string, msgId: string) => void;
  onClose: () => void;
}

type SearchTab = 'all' | 'messages' | 'files' | 'images' | 'videos' | 'voice' | 'customers';

interface SearchResult {
  id: string;
  type: 'message' | 'file' | 'image' | 'video' | 'voice' | 'customer';
  conversationId: string;
  conversationName: string;
  content: string;
  preview: string;
  timestamp: string;
  senderName?: string;
  matchField?: string;
}

const tabs: { key: SearchTab; label: string; icon: any }[] = [
  { key: 'all', label: 'الكل', icon: Search },
  { key: 'messages', label: 'رسائل', icon: MessageSquare },
  { key: 'files', label: 'ملفات', icon: FileText },
  { key: 'images', label: 'صور', icon: Image },
  { key: 'videos', label: 'فيديو', icon: Video },
  { key: 'voice', label: 'صوتي', icon: Mic },
  { key: 'customers', label: 'عملاء', icon: User },
];

export default function GlobalSearch({ conversations, onSelectConversation, onClose }: Props) {
  const [query_text, setQueryText] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const kw = q.toLowerCase();
    const res: SearchResult[] = [];

    try {
      // Search conversations by name/member
      conversations.forEach(c => {
        const cName = c.name || c.groupName || c.memberNames?.[c.members[0]] || '';
        if (cName.toLowerCase().includes(kw)) {
          res.push({
            id: c.id, type: 'customer', conversationId: c.id, conversationName: cName,
            content: cName, preview: c.lastMessage, timestamp: c.lastMessageTime, matchField: 'اسم العميل',
          });
        }
      });

      // Search messages from support_messages
      const msgQuery = query(
        collection(db, 'support_messages'),
        where('conversationId', 'in', conversations.map(c => c.id).slice(0, 10)),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      const msgSnap = await getDocs(msgQuery);
      msgSnap.docs.forEach(d => {
        const msg = d.data() as ChatMessage;
        if (!msg.content?.toLowerCase().includes(kw)) return;

        // Filter by tab
        if (activeTab === 'files' && msg.type !== 'file') return;
        if (activeTab === 'images' && msg.type !== 'image') return;
        if (activeTab === 'videos' && msg.type !== 'video') return;
        if (activeTab === 'voice' && msg.type !== 'voice') return;
        if (activeTab === 'messages' && msg.type !== 'text') return;

        const conv = conversations.find(c => c.id === msg.conversationId);
        res.push({
          id: msg.id, type: (msg.type as any) || 'message', conversationId: msg.conversationId,
          conversationName: conv?.name || conv?.memberNames?.[conv.members[0]] || 'محادثة',
          content: msg.content || msg.fileName || '', preview: msg.content?.slice(0, 100) || msg.fileName || '',
          timestamp: msg.createdAt, senderName: msg.senderName, matchField: 'نص الرسالة',
        });
      });

      // Search file names
      if (activeTab === 'all' || activeTab === 'files') {
        msgSnap.docs.forEach(d => {
          const msg = d.data() as ChatMessage;
          if (msg.fileName?.toLowerCase().includes(kw) && !res.some(r => r.id === msg.id)) {
            const conv = conversations.find(c => c.id === msg.conversationId);
            res.push({
              id: msg.id, type: 'file', conversationId: msg.conversationId,
              conversationName: conv?.name || 'محادثة',
              content: msg.fileName, preview: msg.content || '', timestamp: msg.createdAt, senderName: msg.senderName, matchField: 'اسم الملف',
            });
          }
        });
      }
    } catch {}

    setResults(res.slice(0, 50));
    setSearching(false);
  }, [conversations, activeTab]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query_text), 300);
    return () => clearTimeout(t);
  }, [query_text, doSearch]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', paddingTop: '80px',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '560px', maxHeight: '70vh', background: 'var(--bg-elevated)',
        borderRadius: '16px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)', border: '1px solid var(--color-border)',
        animation: 'slideDown 0.2s ease',
      }}>
        {/* Search input */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: '26px', top: '22px', color: 'var(--text-tertiary)' }} />
          <input ref={inputRef} value={query_text} onChange={e => setQueryText(e.target.value)}
            placeholder="ابحث في الرسائل والملفات والعملاء..."
            style={{
              width: '100%', background: 'var(--input-bg)', border: '1px solid var(--color-border)',
              borderRadius: '10px', padding: '10px 36px 10px 10px', color: 'var(--text-primary)',
              fontSize: '0.82rem', outline: 'none',
            }} />
          {query_text && (
            <button onClick={() => { setQueryText(''); setResults([]); }}
              style={{ position: 'absolute', left: '26px', top: '22px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', padding: '6px 12px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
              borderRadius: '8px', border: 'none', background: activeTab === tab.key ? 'var(--sidebar-active)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.7rem', fontWeight: activeTab === tab.key ? 600 : 400, whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}>
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px', minHeight: '100px' }}>
          {searching && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>جاري البحث...</div>
          )}
          {!searching && query_text && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
              لا توجد نتائج لـ "{query_text}"
            </div>
          )}
          {!query_text && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>
              ابدأ الكتابة للبحث في المحادثات والملفات
            </div>
          )}
          {results.map(r => (
            <div key={`${r.conversationId}_${r.id}`} onClick={() => onSelectConversation?.(r.conversationId)} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
              borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-active)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {/* Icon */}
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {r.type === 'message' && <MessageSquare size={14} />}
                {r.type === 'file' && <FileText size={14} />}
                {r.type === 'image' && <Image size={14} />}
                {r.type === 'video' && <Video size={14} />}
                {r.type === 'voice' && <Mic size={14} />}
                {r.type === 'customer' && <User size={14} />}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.conversationName}</span>
                  {r.matchField && <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', background: 'var(--badge-bg)', borderRadius: '4px', padding: '1px 5px' }}>{r.matchField}</span>}
                  {r.senderName && <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>{r.senderName}</span>}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }}>
                  {r.preview || r.content}
                </div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>
                  {formatTime(r.timestamp)}
                </div>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
