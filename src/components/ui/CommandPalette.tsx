import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Settings, FileText, Sparkles, MessageSquare, HeadphonesIcon, FolderKanban, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  category: 'pages' | 'actions' | 'members';
  title: string;
  subtitle?: string;
  shortcut?: string[];
  action: () => void;
  icon: any;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t, rtl } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock list of members for demo search
  const members = [
    { name: 'أحمد محمود', email: 'ahmed@emf.com', role: 'admin' },
    { name: 'سارة العتيبي', email: 'sara@emf.com', role: 'super_admin' },
    { name: 'جون دو', email: 'john@emf.com', role: 'user' },
    { name: 'علي حسن', email: 'ali@emf.com', role: 'user' },
  ];

  const commands: CommandItem[] = [
    // Pages Navigation
    {
      id: 'nav-dashboard',
      category: 'pages',
      title: t('dashboard'),
      subtitle: 'Go to main management console',
      icon: Sparkles,
      action: () => { navigate('/dashboard'); onClose(); }
    },
    {
      id: 'nav-content',
      category: 'pages',
      title: t('content'),
      subtitle: 'Browse security camera files and videos',
      icon: FileText,
      action: () => { navigate('/content'); onClose(); }
    },
    {
      id: 'nav-chat',
      category: 'pages',
      title: t('chat'),
      subtitle: 'Open developer and client communication room',
      icon: MessageSquare,
      action: () => { navigate('/chat'); onClose(); }
    },
    {
      id: 'nav-support',
      category: 'pages',
      title: t('support'),
      subtitle: 'Technical support chat area',
      icon: HeadphonesIcon,
      action: () => { navigate('/support'); onClose(); }
    },
    {
      id: 'nav-projects',
      category: 'pages',
      title: t('projects'),
      subtitle: 'EMF ongoing installations and tasks',
      icon: FolderKanban,
      action: () => { navigate('/projects'); onClose(); }
    },
    // System Actions
    {
      id: 'act-add-member',
      category: 'actions',
      title: t('addMemberBtn'),
      subtitle: 'Create a new team user invitation',
      shortcut: ['N'],
      icon: User,
      action: () => {
        // We will dispatch a custom event or navigate
        navigate('/dashboard');
        const event = new CustomEvent('open-add-member');
        window.dispatchEvent(event);
        onClose();
      }
    },
    {
      id: 'act-settings',
      category: 'actions',
      title: t('settings'),
      subtitle: 'Modify platform security and look',
      shortcut: [','],
      icon: Settings,
      action: () => { navigate('/settings'); onClose(); }
    },
    {
      id: 'act-clean-logs',
      category: 'actions',
      title: 'عرض سجل النظام',
      subtitle: 'View raw audit trails',
      icon: ShieldAlert,
      action: () => { navigate('/dashboard'); onClose(); }
    }
  ];

  // Dynamically append members as search results
  members.forEach((m, idx) => {
    commands.push({
      id: `member-${idx}`,
      category: 'members',
      title: m.name,
      subtitle: `${m.email} (${m.role === 'admin' ? 'مدير' : 'عضو'})`,
      icon: User,
      action: () => {
        navigate(`/dashboard`);
        onClose();
      }
    });
  });

  const filtered = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.subtitle?.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          filtered[activeIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filtered]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        background: 'rgba(2, 6, 23, 0.65)',
        backdropFilter: 'blur(12px)',
        direction: rtl ? 'rtl' : 'ltr',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="glass-card animate-scale"
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-hover)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--border-color)',
          gap: 'var(--space-3)',
        }}>
          <Search size={20} style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder={rtl ? 'ابحث عن صفحة، عضو، أو إجراء...' : 'Type a command or search...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveIndex(0); }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--badge-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}>ESC</span>
        </div>

        {/* Results List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: 'var(--space-8) var(--space-4)',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
            }}>
              {rtl ? 'لا توجد نتائج مطابقة لبحثك' : 'No results found'}
            </div>
          ) : (
            <>
              {/* Grouping results by category */}
              {['pages', 'actions', 'members'].map(category => {
                const catItems = filtered.filter(c => c.category === category);
                if (catItems.length === 0) return null;
                return (
                  <div key={category} style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--accent-indigo)',
                      textTransform: 'uppercase',
                      padding: '8px 12px',
                      letterSpacing: '0.05em',
                      textAlign: rtl ? 'right' : 'left',
                    }}>
                      {category === 'pages' ? (rtl ? 'الصفحات' : 'Pages') :
                       category === 'actions' ? (rtl ? 'الإجراءات السريعة' : 'Actions') :
                       (rtl ? 'الأعضاء' : 'Members')}
                    </div>
                    {catItems.map(cmd => {
                      const absoluteIndex = filtered.indexOf(cmd);
                      const isSelected = absoluteIndex === activeIndex;
                      const Icon = cmd.icon;

                      return (
                        <div
                          key={cmd.id}
                          onClick={cmd.action}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'var(--sidebar-active)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            borderRight: isSelected && rtl ? '3px solid var(--accent-indigo)' : '3px solid transparent',
                            borderLeft: isSelected && !rtl ? '3px solid var(--accent-indigo)' : '3px solid transparent',
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'rgba(79, 70, 229, 0.2)' : 'var(--badge-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                          }}>
                            <Icon size={16} />
                          </div>
                          <div style={{ flex: 1, textAlign: rtl ? 'right' : 'left' }}>
                            <div style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 600,
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-primary)',
                            }}>{cmd.title}</div>
                            {cmd.subtitle && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-tertiary)',
                              }}>{cmd.subtitle}</div>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <div style={{
                              display: 'flex',
                              gap: '2px',
                            }}>
                              {cmd.shortcut.map(key => (
                                <kbd key={key} style={{
                                  fontSize: '0.65rem',
                                  padding: '2px 6px',
                                  background: 'var(--border-color)',
                                  borderRadius: '4px',
                                  color: 'var(--text-secondary)',
                                }}>{key}</kbd>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
