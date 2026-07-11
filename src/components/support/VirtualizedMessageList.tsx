import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage } from '../../types';

interface Props {
  messages: ChatMessage[];
  loadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  renderMessage: (msg: ChatMessage, index: number, messages: ChatMessage[]) => React.ReactNode;
  renderTyping?: React.ReactNode;
  scrollToBottom?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function VirtualizedMessageList({
  messages, loadMore, hasMore, loading,
  renderMessage, renderTyping, scrollToBottom, className, style,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const rowVirtualizer = useVirtualizer({
    count: messages.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? totalSize - virtualItems[virtualItems.length - 1].end
    : 0;

  // Auto-scroll to bottom on new messages if user is near bottom
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    if (scrollToBottom && autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const threshold = 80;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    if (loadMore && hasMore && el.scrollTop < 80) {
      loadMore();
    }
  }, [loadMore, hasMore]);

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className={className}
      style={{
        flex: 1, overflowY: 'auto', position: 'relative',
        ...style,
      }}
    >
      <div style={{
        height: totalSize, position: 'relative', width: '100%',
      }}>
        {paddingTop > 0 && <div style={{ height: paddingTop }} />}
        {virtualItems.map((virtualRow) => {
          const isLoader = virtualRow.index === messages.length;
          if (isLoader) {
            return (
              <div key="loader" style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {hasMore && !loading && (
                  <button onClick={loadMore} style={{
                    background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px',
                    padding: '6px 16px', fontSize: '0.72rem', color: 'var(--text-tertiary)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    تحميل المزيد
                  </button>
                )}
                {loading && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', animation: 'vrl-spin 0.6s linear infinite' }} />
                    جاري التحميل...
                  </div>
                )}
                {!hasMore && messages.length > 0 && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', opacity: 0.5 }}>
                    — بداية المحادثة —
                  </div>
                )}
              </div>
            );
          }
          const msg = messages[virtualRow.index];
          return (
            <div
              key={msg.id}
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderMessage(msg, virtualRow.index, messages)}
            </div>
          );
        })}
        {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
      </div>
      {renderTyping && <div ref={bottomRef}>{renderTyping}</div>}
      <style>{`@keyframes vrl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
