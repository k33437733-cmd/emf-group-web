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
  trend?:      number;    // positive = up, negative = down
  subtitle?:   string;
  loading?:    boolean;
}

export function StatCard({ title, value, icon: Icon, colorClass = 'blue', trend, subtitle, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="card-base p-5" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between">
          <div className="skeleton skeleton-title" style={{ width: '50%' }} />
          <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }} />
        </div>
        <div className="skeleton" style={{ height: 36, width: '60%', borderRadius: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: '40%' }} />
      </div>
    );
  }

  const trendIsPositive = trend !== undefined && trend >= 0;

  return (
    <div className={`card-base card-hover card-accent-${colorClass} anim-fade-up`} style={{ padding: '20px 22px' }}>
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <div>
          <div className="text-sm text-2" style={{ marginBottom: 2 }}>{title}</div>
          {subtitle && <div className="text-xs text-3">{subtitle}</div>}
        </div>
        <div className={`icon-box icon-box-${colorClass}`}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
        {value}
      </div>
      {trend !== undefined && (
        <div style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: trendIsPositive ? 'var(--success)' : 'var(--danger)',
        }}>
          <span>{trendIsPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}%</span>
          <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>من الشهر الماضي</span>
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
        <div className="breadcrumb-trail">
          {breadcrumb.map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ color: 'var(--text-4)' }}>/</span>}
              {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>{actions}</div>}
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

export function Badge({ children, variant = 'ghost', dot = false, size = 'md' }: BadgeProps) {
  return (
    <span
      className={`badge-base badge-${variant} ${dot ? 'badge-dot' : ''}`}
      style={size === 'sm' ? { fontSize: '0.65rem', padding: '2px 7px' } : undefined}
    >
      {children}
    </span>
  );
}

/* ============================================================
   SkeletonCard — تحميل بطاقة إحصائيات
   ============================================================ */
export function SkeletonStatCard() {
  return (
    <div className="card-base" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex-between">
        <div className="skeleton skeleton-text" style={{ width: 100 }} />
        <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }} />
      </div>
      <div className="skeleton" style={{ height: 32, width: '55%', borderRadius: 6 }} />
      <div className="skeleton skeleton-text-sm" style={{ width: 80 }} />
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
        <td key={i} style={{ padding: '12px 16px' }}>
          <div className="skeleton skeleton-text" style={{ width: i === 0 ? '70%' : i % 2 === 0 ? '50%' : '60%' }} />
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
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} />
      </div>
      <div>
        <div className="empty-state-title">{title}</div>
        {desc && <p className="empty-state-desc">{desc}</p>}
      </div>
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
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
    <div className="section-header">
      <div>
        <div className="section-title">
          {Icon && <Icon size={16} style={{ color: 'var(--primary)' }} />}
          {title}
        </div>
        {subtitle && <div className="section-subtitle">{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
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
    <div style={{ marginBottom: 18 }}>
      <label className="field-label" {...labelProps}>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginRight: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 5 }}>{error}</div>
      )}
      {hint && !error && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 5 }}>{hint}</div>
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

export function UserAvatar({ name, size = 36, color = 'var(--primary)' }: UserAvatarProps) {
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
  if (!label) return <hr className="divider" />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 'var(--sp-5) 0' }}>
      <div className="divider" style={{ flex: 1, margin: 0 }} />
      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{label}</span>
      <div className="divider" style={{ flex: 1, margin: 0 }} />
    </div>
  );
}

/* ============================================================
   ProgressBar — شريط التقدم
   ============================================================ */
interface ProgressBarProps {
  value:   number;  // 0-100
  color?:  'primary' | 'success' | 'warning' | 'danger' | 'gold';
  height?: number;
  label?:  string;
}

export function ProgressBar({ value, color = 'primary', height = 6, label }: ProgressBarProps) {
  return (
    <div>
      {label && (
        <div className="flex-between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{label}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>{value}%</span>
        </div>
      )}
      <div className="progress-bar-wrapper" style={{ height }}>
        <div
          className={`progress-bar-fill progress-${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
