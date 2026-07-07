import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToSupportConversations } from '../../firebase/db/conversations';
import { subscribeToAgentTickets } from '../../firebase/db/tickets';
import { Search, X, Bell, Filter, MessageSquare } from 'lucide-react';
import NotificationCard from './NotificationCard';
import type { Conversation } from '../../types/chat';
import type { Ticket, TicketPriority, TicketStatus } from '../../types/support';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Filter type ───────────────────────────────────────────────────────────────

type FilterPreset = 'all' | 'unread' | TicketPriority;

// ─── Joined item ───────────────────────────────────────────────────────────────

interface NotificationItem {
  conversationId: string;
  ticketId: string;
  customerId: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSenderId: string;
  unreadCount: number;
  priority: TicketPriority;
  status: TicketStatus;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function findCustomerId(conv: Conversation, agentId: string): string | null {
  // The customer is the member whose role !== agent/admin/super_admin
  for (const uid of conv.members) {
    const role = conv.memberRoles?.[uid];
    if (role && !['admin', 'super_admin', 'agent'].includes(role)) return uid;
  }
  // Fallback: the member that isn't the current agent
  return conv.members.find(m => m !== agentId) ?? null;
}

function findCustomerName(conv: Conversation, customerId: string | null): string {
  if (customerId && conv.memberNames?.[customerId]) return conv.memberNames[customerId];
  return conv.memberNames ? Object.values(conv.memberNames)[0] ?? 'عميل' : 'عميل';
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterPreset>('all');
  const [loading, setLoading] = useState(true);

  const agentId = user?.uid;

  // ── Subscriptions ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);

    const unsubConvs = subscribeToSupportConversations(agentId, (list) => {
      setConversations(list);
      setLoading(false);
    });

    const unsubTickets = subscribeToAgentTickets(agentId, (list) => {
      setTickets(list);
    });

    return () => {
      unsubConvs();
      unsubTickets();
    };
  }, [agentId]);

  // ── Focus/ESC ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    // Small delay to let the portal mount
    const t = setTimeout(() => searchRef.current?.focus(), 100);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  // ── Body scroll lock ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // ── Join conversations ↔ tickets ──────────────────────────────────────────

  const ticketMap = useMemo(() => {
    const map = new Map<string, Ticket>();
    for (const t of tickets) map.set(t.id, t);
    return map;
  }, [tickets]);

  const items: NotificationItem[] = useMemo(() => {
    if (!agentId) return [];
    const result: NotificationItem[] = [];

    for (const conv of conversations) {
      if (conv.type !== 'support' || conv.status !== 'active') continue;
      if (!conv.ticketId) continue;

      const ticket = ticketMap.get(conv.ticketId);
      if (!ticket) continue;

      const customerId = findCustomerId(conv, agentId) ?? '';
      const customerName = findCustomerName(conv, customerId);

      result.push({
        conversationId: conv.id,
        ticketId: conv.ticketId,
        customerId,
        customerName,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        lastMessageSenderId: conv.lastMessageSenderId,
        unreadCount: conv.unreadCount?.[agentId] ?? 0,
        priority: ticket.priority,
        status: ticket.status,
      });
    }

    // Sort: unread first, then by time
    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    return result;
  }, [conversations, ticketMap, agentId]);

  // ── Search + Filter ─────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let list = items;

    // Filter preset
    if (filter === 'unread') {
      list = list.filter(i => i.unreadCount > 0);
    } else if (filter !== 'all') {
      list = list.filter(i => i.priority === filter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        i =>
          i.customerName.toLowerCase().includes(q) ||
          i.lastMessage.toLowerCase().includes(q),
      );
    }

    return list;
  }, [items, filter, searchQuery]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchRef.current?.focus();
  }, []);

  // ── Filter chip config ──────────────────────────────────────────────────────

  type ChipDef = { key: FilterPreset; label: string; color?: string };
  const chips: ChipDef[] = [
    { key: 'all',   label: 'الكل' },
    { key: 'unread', label: 'غير مقروء' },
    { key: 'urgent', label: 'عاجل',   color: '#ef4444' },
    { key: 'high',   label: 'عالي',   color: '#f59e0b' },
    { key: 'normal', label: 'عادي',   color: '#3b82f6' },
    { key: 'low',    label: 'منخفض',  color: '#6b7280' },
  ];

  const unreadTotal = useMemo(() => items.reduce((s, i) => s + i.unreadCount, 0), [items]);

  // ── Loading state ───────────────────────────────────────────────────────────

  const isLoading = loading && conversations.length === 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="مركز الإشعارات"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      {/* ── Drawer panel ─────────────────────────────── */}
      <div
        className="animate-fade"
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.98), rgba(7, 18, 34, 0.96))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(56, 189, 248, 0.08)',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(56, 189, 248, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} color="#38bdf8" />
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              مركز الإشعارات
            </span>
            {unreadTotal > 0 && (
              <span
                style={{
                  background: 'var(--accent-red, #ef4444)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '8px',
                  lineHeight: '18px',
                }}
              >
                {unreadTotal}
              </span>
            )}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--text-muted, #6b7280)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.color = 'var(--text-muted, #6b7280)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search ──────────────────────────────────── */}
        <div style={{ padding: '12px 20px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '0 12px',
              transition: 'border-color 0.2s ease',
            }}
          >
            <Search size={16} color="var(--text-muted, #6b7280)" style={{ flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="ابحث باسم العميل أو الرسالة..."
              aria-label="بحث في الإشعارات"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                padding: '10px 0',
                fontFamily: 'inherit',
                direction: 'rtl',
              }}
              onFocus={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'rgba(56, 189, 248, 0.3)';
              }}
              onBlur={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.06)';
              }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                aria-label="مسح البحث"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #6b7280)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Filter chips ───────────────────────────── */}
        <div
          style={{
            padding: '0 20px 12px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {chips.map((chip) => {
            const active = filter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: active
                    ? `1px solid ${chip.color ?? 'rgba(56, 189, 248, 0.4)'}`
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  background: active
                    ? `${chip.color ?? 'rgba(56, 189, 248, 0.15)'}22`
                    : 'rgba(255, 255, 255, 0.03)',
                  color: active ? (chip.color ?? '#38bdf8') : 'var(--text-secondary, #9ca3af)',
                  fontSize: '0.72rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* ── Notification list ──────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 12px 20px',
          }}
        >
          {isLoading ? (
            // Loading state
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div
                className="animate-spin-fast"
                style={{
                  width: '28px',
                  height: '28px',
                  border: '2px solid rgba(255, 255, 255, 0.06)',
                  borderTopColor: '#38bdf8',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                }}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6b7280)' }}>
                جاري التحميل...
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            // Empty state
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                {searchQuery || filter !== 'all' ? (
                  <Filter size={24} color="#6b7280" />
                ) : (
                  <MessageSquare size={24} color="#6b7280" />
                )}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary, #9ca3af)', marginBottom: '4px' }}>
                {searchQuery || filter !== 'all'
                  ? 'لا توجد نتائج مطابقة'
                  : 'لا توجد محادثات'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)' }}>
                {searchQuery || filter !== 'all'
                  ? 'حاول تغيير معايير البحث أو التصفية'
                  : 'عندما يرسل لك عميل رسالة، ستظهر هنا'}
              </div>
            </div>
          ) : (
            // List
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredItems.map((item) => (
                <NotificationCard
                  key={item.conversationId}
                  conversationId={item.conversationId}
                  customerName={item.customerName}
                  lastMessage={item.lastMessage}
                  lastMessageTime={item.lastMessageTime}
                  unreadCount={item.unreadCount}
                  priority={item.priority}
                  status={item.status}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
