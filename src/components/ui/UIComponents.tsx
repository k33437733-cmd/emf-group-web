import type { ReactNode, LabelHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================
   StatCard — بطاقة إحصائيات احترافية
   ============================================================ */
interface StatCardProps {
  title:       string;
  value:       string | number;
  icon:        LucideIcon;
  colorClass?: 'blue' | 'green' | 'purple' | 'amber' | 'danger' | 'info' | 'gold' | 'orange';
  trend?:      number;
  subtitle?:   string;
  loading?:    boolean;
}

const accentMap: Record<string, string> = {
  blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6', amber: '#f59e0b',
  danger: '#ef4444', info: '#3b82f6', gold: '#f1c40f', orange: '#f97316',
};

export function StatCard({ title, value, icon: Icon, colorClass = 'blue', trend, subtitle, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="card-base" style={{ padding: 'var(--space-5)', gap: 'var(--space-3)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '50%', height: 14, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
        </div>
        <div className="skeleton" style={{ height: 36, width: '60%', borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 'var(--radius-sm)' }} />
      </div>
    );
  }

  const trendIsPositive = trend !== undefined && trend >= 0;
  const accent = accentMap[colorClass] || accentMap.blue;

  return (
    <div className="card-base" style={{ padding: 'var(--space-5) var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '2px' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{subtitle}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-lg)',
          background: `${accent}14`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: accent, flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ fontSize: 'var(--text-4xl)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
        {value}
      </div>
      {trend !== undefined && (
        <div style={{
          marginTop: 'var(--space-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: trendIsPositive ? 'var(--accent-emerald)' : 'var(--accent-red)',
        }}>
          <span>{trendIsPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}%</span>
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>من الشهر الماضي</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PageHeader — رأس الصفحة
   ============================================================ */
interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  actions?:  ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="page-header-breadcrumb">
          {breadcrumb.map((item, i) => (
            <span key={i} className="page-header-breadcrumb-item">
              {i > 0 && <span className="page-header-breadcrumb-separator">/</span>}
              {item.href ? (
                <a href={item.href}>{item.label}</a>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="page-header-content">
        <div>
          <div className="page-header-chip">لوحة تحكم EMF Group</div>
          <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
          {subtitle && <p className="body-text page-header-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Badge — شارة حالة
   ============================================================ */
interface BadgeProps {
  children:  ReactNode;
  variant?:  'blue' | 'green' | 'red' | 'amber' | 'purple' | 'info' | 'gold' | 'ghost';
  dot?:      boolean;
  size?:     'sm' | 'md';
}

const badgeVariants: Record<string, { bg: string; color: string; border: string }> = {
  blue:   { bg: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', border: 'rgba(59,130,246,0.2)' },
  green:  { bg: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', border: 'rgba(16,185,129,0.2)' },
  red:    { bg: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: 'rgba(239,68,68,0.2)' },
  amber:  { bg: 'rgba(245,158,11,0.1)', color: 'var(--accent-amber)', border: 'rgba(245,158,11,0.2)' },
  purple: { bg: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)', border: 'rgba(139,92,246,0.2)' },
  info:   { bg: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', border: 'rgba(6,182,212,0.2)' },
  gold:   { bg: 'rgba(241,196,15,0.1)', color: 'var(--accent-gold)', border: 'rgba(241,196,15,0.2)' },
  ghost:  { bg: 'var(--badge-bg)', color: 'var(--text-secondary)', border: 'var(--border-color)' },
};

export function Badge({ children, variant = 'ghost', dot = false, size = 'md' }: BadgeProps) {
  const v = badgeVariants[variant] || badgeVariants.ghost;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      padding: size === 'sm' ? '2px 7px' : '3px 10px',
      borderRadius: 'var(--radius-full)',
      background: v.bg,
      border: `1px solid ${v.border}`,
      color: v.color,
      fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.color, display: 'inline-block' }} />}
      {children}
    </span>
  );
}

/* ============================================================
   SkeletonStatCard — تحميل بطاقة إحصائيات
   ============================================================ */
export function SkeletonStatCard() {
  return (
    <div className="card-base" style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
      </div>
      <div className="skeleton" style={{ height: 32, width: '55%', borderRadius: 'var(--radius-sm)' }} />
      <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 'var(--radius-sm)' }} />
    </div>
  );
}

/* ============================================================
   SkeletonRow — تحميل صف جدول
   ============================================================ */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div className="skeleton" style={{ width: i === 0 ? '70%' : i % 2 === 0 ? '50%' : '60%', height: 14, borderRadius: 'var(--radius-sm)' }} />
        </td>
      ))}
    </tr>
  );
}

/* ============================================================
   EmptyState — حالة فارغة
   ============================================================ */
interface EmptyStateProps {
  icon:      LucideIcon;
  title:     string;
  desc?:     string;
  action?:   ReactNode;
}

export function EmptyState({ icon: Icon, title, desc, action }: EmptyStateProps) {
  return (
    <div className="card-base" style={{
      padding: 'var(--space-16) var(--space-8)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-4)',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 'var(--radius-2xl)',
        background: 'var(--badge-bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
      }}>
        <Icon size={28} />
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{title}</div>
        {desc && <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-tertiary)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>{desc}</p>}
      </div>
      {action && <div style={{ marginTop: 'var(--space-1)' }}>{action}</div>}
    </div>
  );
}

/* ============================================================
   SectionHeader — رأس قسم
   ============================================================ */
interface SectionHeaderProps {
  title:     string;
  subtitle?: string;
  icon?:     LucideIcon;
  actions?:  ReactNode;
}

export function SectionHeader({ title, subtitle, icon: Icon, actions }: SectionHeaderProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)',
    }}>
      <div>
        <div style={{
          fontSize: 'var(--text-2xl)', fontWeight: 'var(--fw-semibold)',
          color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        }}>
          {Icon && <Icon size={16} style={{ color: 'var(--accent-blue)' }} />}
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>}
    </div>
  );
}

/* ============================================================
   FieldGroup — مجموعة حقل إدخال
   ============================================================ */
interface FieldGroupProps {
  label:     string;
  htmlFor?:  string;
  required?: boolean;
  children:  ReactNode;
  error?:    string;
  hint?:     string;
}

export function FieldGroup({ label, htmlFor, required, children, error, hint }: FieldGroupProps) {
  const labelProps: LabelHTMLAttributes<HTMLLabelElement> = {};
  if (htmlFor) labelProps.htmlFor = htmlFor;

  return (
    <div className="form-group">
      <label className="form-label" {...labelProps}>
        {label}
        {required && <span style={{ color: 'var(--accent-red)', marginRight: 'var(--space-1)' }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-red)', marginTop: 'var(--space-1)' }}>{error}</div>
      )}
      {hint && !error && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>{hint}</div>
      )}
    </div>
  );
}

/* ============================================================
   UserAvatar — صورة المستخدم
   ============================================================ */
interface UserAvatarProps {
  name:   string;
  size?:  number;
  color?: string;
}

export function UserAvatar({ name, size = 36, color = 'var(--accent-blue)' }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div style={{
      width:           size,
      height:          size,
      borderRadius:    '50%',
      background:      `${color}22`,
      border:          `2px solid ${color}44`,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      color:           color,
      fontWeight:      700,
      fontSize:        size > 40 ? '0.9rem' : '0.72rem',
      flexShrink:      0,
      letterSpacing:   '0.5px',
    }}>
      {initials || '?'}
    </div>
  );
}

/* ============================================================
   Divider — خط فاصل
   ============================================================ */
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: 'var(--space-5) 0' }}>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />
    </div>
  );
}

/* ============================================================
   ProgressBar — شريط التقدم
   ============================================================ */
interface ProgressBarProps {
  value:   number;
  color?:  'primary' | 'success' | 'warning' | 'danger' | 'gold';
  height?: number;
  label?:  string;
}

const progressColors: Record<string, string> = {
  primary: 'var(--accent-blue)',
  success: 'var(--accent-emerald)',
  warning: 'var(--accent-amber)',
  danger: 'var(--accent-red)',
  gold: 'var(--accent-gold)',
};

export function ProgressBar({ value, color = 'primary', height = 6, label }: ProgressBarProps) {
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>{value}%</span>
        </div>
      )}
      <div style={{ height, background: 'var(--badge-bg)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          background: progressColors[color] || progressColors.primary,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}
