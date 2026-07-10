import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { UserProfile } from '../types/auth';
import type { ContentItem } from '../types/content';
import type { AuditLog } from '../types/audit';

export type DatePreset = 'today' | '7d' | '30d' | '90d' | 'year' | 'custom';

export interface DateRange {
  preset: DatePreset;
  start: Date;
  end: Date;
}

export interface KpiData {
  label: string;
  value: number;
  trend: number;
  icon: string;
  color: string;
  sparklineData: number[];
  prefix?: string;
  suffix?: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ContentDistribution {
  name: string;
  value: number;
  color: string;
}

export interface StorageData {
  used: number;
  total: number;
  videos: number;
  apps: number;
  files: number;
}

export interface ActivityEvent {
  id: string;
  type: 'register' | 'upload_video' | 'upload_app' | 'upload_file' | 'delete' | 'project' | 'ticket' | 'chat';
  user: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

function getRange(preset: DatePreset, customStart?: Date, customEnd?: Date): DateRange {
  if (preset === 'custom' && customStart && customEnd) {
    return { preset, start: customStart, end: customEnd };
  }
  const now = new Date();
  const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let s: Date;
  switch (preset) {
    case 'today': s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case '7d': s = new Date(e.getTime() - 6 * 86400000); s.setHours(0,0,0,0); break;
    case '30d': s = new Date(e.getTime() - 29 * 86400000); s.setHours(0,0,0,0); break;
    case '90d': s = new Date(e.getTime() - 89 * 86400000); s.setHours(0,0,0,0); break;
    case 'year': s = new Date(now.getFullYear(), 0, 1); break;
    default: s = new Date(e.getTime() - 29 * 86400000); s.setHours(0,0,0,0);
  }
  return { preset, start: s, end: e };
}

const DAY_MS = 86400000;
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

function fillDateGaps(data: TimeSeriesPoint[], start: Date, end: Date): TimeSeriesPoint[] {
  const map = new Map<string, number>();
  for (const p of data) map.set(p.date, p.value);
  const result: TimeSeriesPoint[] = [];
  const totalDays = daysBetween(start, end);
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) ?? 0 });
  }
  return result;
}

function computeTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function computeSparkline(data: TimeSeriesPoint[]): number[] {
  const len = Math.min(data.length, 30);
  if (len === 0) return [];
  const step = Math.max(1, Math.floor(data.length / len));
  const result: number[] = [];
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i].value);
  }
  if (result.length < 2 && data.length > 0) result.push(data[data.length - 1].value);
  return result;
}

export interface AnalyticsState {
  loading: boolean;
  dateRange: DateRange;
  kpiCards: KpiData[];
  membersGrowth: TimeSeriesPoint[];
  contentUploads: { date: string; videos: number; apps: number; files: number }[];
  viewsAnalytics: { daily: TimeSeriesPoint[]; weekly: TimeSeriesPoint[]; monthly: TimeSeriesPoint[]; total: number; growth: number };
  downloadsAnalytics: { daily: TimeSeriesPoint[]; currentMonth: number; previousMonth: number; growth: number };
  userActivity: { hour: number; day: string; count: number }[];
  mostViewed: { name: string; views: number; type: string }[];
  contentDistribution: ContentDistribution[];
  roleDistribution: ContentDistribution[];
  storage: StorageData;
  timeline: ActivityEvent[];
  setDateRange: (preset: DatePreset, customStart?: Date, customEnd?: Date) => void;
}

export function useAnalytics(): AnalyticsState {
  const [dateRange, setDateRangeState] = useState<DateRange>(() => getRange('30d'));
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    unsubs.push(onSnapshot(usersQ, snap => {
      setUsers(snap.docs.map(d => ({ ...d.data() }) as UserProfile));
    }, err => console.error('[Analytics] users error:', err)));

    const contentsQ = query(collection(db, 'contents'), orderBy('createdAt', 'desc'));
    unsubs.push(onSnapshot(contentsQ, snap => {
      setContents(snap.docs.map(d => ({ ...d.data() }) as ContentItem));
    }, err => console.error('[Analytics] contents error:', err)));

    const auditQ = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(200));
    unsubs.push(onSnapshot(auditQ, snap => {
      setAuditLogs(snap.docs.map(d => ({ ...d.data() }) as AuditLog));
    }, err => console.error('[Analytics] audit error:', err)));

    setLoading(false);

    return () => { unsubs.forEach(u => u()); };
  }, []);

  const setDateRange = (preset: DatePreset, customStart?: Date, customEnd?: Date) => {
    setDateRangeState(getRange(preset, customStart, customEnd));
  };

  const previousRange = useMemo(() => {
    const span = dateRange.end.getTime() - dateRange.start.getTime();
    return { start: new Date(dateRange.start.getTime() - span), end: new Date(dateRange.end.getTime() - span) };
  }, [dateRange]);

  const isInRange = (item: { createdAt?: string }, range: DateRange | { start: Date; end: Date }) => {
    if (!item.createdAt) return false;
    const t = new Date(item.createdAt).getTime();
    return t >= range.start.getTime() && t <= range.end.getTime();
  };

  const isInCurrent = (item: { createdAt?: string }) => isInRange(item, dateRange);
  const isInPrevious = (item: { createdAt?: string }) => isInRange(item, previousRange);

  const membersGrowth = useMemo((): TimeSeriesPoint[] => {
    const registrations: TimeSeriesPoint[] = [];
    const days = new Map<string, number>();
    for (const u of users) {
      if (!u.createdAt) continue;
      const d = u.createdAt.slice(0, 10);
      days.set(d, (days.get(d) ?? 0) + 1);
    }
    for (const [date, value] of days) registrations.push({ date, value });
    registrations.sort((a, b) => a.date.localeCompare(b.date));
    return fillDateGaps(registrations, dateRange.start, dateRange.end);
  }, [users, dateRange]);

  const contentUploads = useMemo(() => {
    const map = new Map<string, { videos: number; apps: number; files: number }>();
    for (const c of contents) {
      if (!c.createdAt) continue;
      const d = c.createdAt.slice(0, 10);
      const entry = map.get(d) ?? { videos: 0, apps: 0, files: 0 };
      if (c.type === 'video') entry.videos++;
      else if (c.type === 'app') entry.apps++;
      else entry.files++;
      map.set(d, entry);
    }
    const result: { date: string; videos: number; apps: number; files: number }[] = [];
    const days = daysBetween(dateRange.start, dateRange.end);
    for (let i = 0; i <= days; i++) {
      const d = new Date(dateRange.start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      const entry = map.get(d) ?? { videos: 0, apps: 0, files: 0 };
      result.push({ date: d, ...entry });
    }
    return result;
  }, [contents, dateRange]);

  const viewsAnalytics = useMemo(() => {
    const daily = new Map<string, number>();
    const weekly = new Map<string, number>();
    const monthly = new Map<string, number>();
    let total = 0;
    for (const c of contents) {
      total += c.views || 0;
    }
    for (const c of contents) {
      if (!c.createdAt) continue;
      const d = c.createdAt.slice(0, 10);
      const views = c.views || 0;
      daily.set(d, (daily.get(d) ?? 0) + views);
      const weekKey = getWeekKey(c.createdAt);
      weekly.set(weekKey, (weekly.get(weekKey) ?? 0) + views);
      const monthKey = c.createdAt.slice(0, 7);
      monthly.set(monthKey, (monthly.get(monthKey) ?? 0) + views);
    }
    const dailyData: TimeSeriesPoint[] = [];
    const days = daysBetween(dateRange.start, dateRange.end);
    for (let i = 0; i <= days; i++) {
      const d = new Date(dateRange.start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      dailyData.push({ date: d, value: daily.get(d) ?? 0 });
    }
    const currentContents = contents.filter(isInCurrent);
    const previousContents = contents.filter(isInPrevious);
    const currentViews = currentContents.reduce((a, c) => a + (c.views || 0), 0);
    const previousViews = previousContents.reduce((a, c) => a + (c.views || 0), 0);
    return {
      daily: dailyData,
      weekly: Array.from(weekly.entries()).map(([date, value]) => ({ date, value })),
      monthly: Array.from(monthly.entries()).map(([date, value]) => ({ date, value })),
      total,
      growth: computeTrend(currentViews, previousViews),
    };
  }, [contents, dateRange]);

  const downloadsAnalytics = useMemo(() => {
    const daily = new Map<string, number>();
    for (const c of contents) {
      if (!c.createdAt) continue;
      const d = c.createdAt.slice(0, 10);
      daily.set(d, (daily.get(d) ?? 0) + (c.downloads || 0));
    }
    const dailyData: TimeSeriesPoint[] = [];
    const days = daysBetween(dateRange.start, dateRange.end);
    for (let i = 0; i <= days; i++) {
      const d = new Date(dateRange.start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      dailyData.push({ date: d, value: daily.get(d) ?? 0 });
    }
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let currentMonth = 0, previousMonth = 0;
    for (const c of contents) {
      if (!c.createdAt) continue;
      const t = new Date(c.createdAt).getTime();
      if (t >= currentMonthStart.getTime() && t <= currentMonthEnd.getTime()) {
        currentMonth += c.downloads || 0;
      } else if (t >= previousMonthStart.getTime() && t < currentMonthStart.getTime()) {
        previousMonth += c.downloads || 0;
      }
    }
    return { daily: dailyData, currentMonth, previousMonth, growth: computeTrend(currentMonth, previousMonth) };
  }, [contents, dateRange]);

  const userActivity = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    const dayCounts: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    for (const log of auditLogs) {
      if (!log.createdAt) continue;
      const d = new Date(log.createdAt);
      hourCounts[d.getHours()]++;
      const dayKey = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      dayCounts[dayKey]++;
    }
    const result: { hour: number; day: string; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      for (const [day, count] of Object.entries(dayCounts)) {
        result.push({ hour: h, day, count: Math.round((hourCounts[h] * count) / Math.max(1, Object.values(dayCounts).reduce((a, b) => a + b, 0))) });
      }
    }
    return result;
  }, [auditLogs]);

  const mostViewed = useMemo(() => {
    const sorted = [...contents].sort((a, b) => (b.views || 0) - (a.views || 0));
    return sorted.slice(0, 10).map(c => ({
      name: c.title || '',
      views: c.views || 0,
      type: c.type || 'other',
    }));
  }, [contents]);

  const contentDistribution = useMemo((): ContentDistribution[] => {
    const counts: Record<string, number> = { video: 0, app: 0, other: 0 };
    for (const c of contents) {
      if (c.type === 'video') counts.video++;
      else if (c.type === 'app') counts.app++;
      else counts.other++;
    }
    const total = counts.video + counts.app + counts.other;
    return [
      { name: 'فيديو', value: total ? Math.round((counts.video / total) * 100) : 0, color: 'var(--accent-purple)' },
      { name: 'تطبيقات', value: total ? Math.round((counts.app / total) * 100) : 0, color: 'var(--accent-cyan)' },
      { name: 'ملفات', value: total ? Math.round((counts.other / total) * 100) : 0, color: 'var(--accent-emerald)' },
    ];
  }, [contents]);

  const roleDistribution = useMemo((): ContentDistribution[] => {
    const counts: Record<string, number> = { super_admin: 0, admin: 0, agent: 0, user: 0 };
    for (const u of users) {
      counts[u.role] = (counts[u.role] ?? 0) + 1;
    }
    const total = users.length || 1;
    return [
      { name: 'مدير عام', value: Math.round((counts.super_admin / total) * 100), color: 'var(--accent-amber)' },
      { name: 'مدير', value: Math.round((counts.admin / total) * 100), color: 'var(--accent-cyan)' },
      { name: 'وكيل', value: Math.round((counts.agent / total) * 100), color: 'var(--accent-blue)' },
      { name: 'عضو', value: Math.round((counts.user / total) * 100), color: 'var(--accent-emerald)' },
    ];
  }, [users]);

  const storage = useMemo((): StorageData => {
    const STORAGE_LIMIT = 10 * 1024 * 1024 * 1024;
    let videos = 0, apps = 0, files = 0;
    for (const c of contents) {
      const size = c.fileSize || 0;
      if (c.type === 'video') videos += size;
      else if (c.type === 'app') apps += size;
      else files += size;
    }
    const used = videos + apps + files;
    return { used, total: STORAGE_LIMIT, videos, apps, files };
  }, [contents]);

  const timeline = useMemo((): ActivityEvent[] => {
    const events: ActivityEvent[] = [];
    for (const log of auditLogs) {
      if (!log.createdAt) continue;
      const desc = log.description || '';
      let type: ActivityEvent['type'] = 'chat';
      let icon = 'MessageSquare';
      let color = 'var(--accent-blue)';
      if (desc.includes('تسجيل') || desc.includes('register') || desc.includes('login')) {
        type = 'register'; icon = 'UserPlus'; color = 'var(--accent-emerald)';
      } else if (desc.includes('رفع') || desc.includes('upload')) {
        if (desc.includes('فيديو')) { type = 'upload_video'; icon = 'Film'; color = 'var(--accent-purple)'; }
        else if (desc.includes('تطبيق')) { type = 'upload_app'; icon = 'Package'; color = 'var(--accent-cyan)'; }
        else { type = 'upload_file'; icon = 'FileText'; color = 'var(--accent-blue)'; }
      } else if (desc.includes('حذف')) {
        type = 'delete'; icon = 'Trash2'; color = 'var(--accent-red)';
      } else if (desc.includes('مشروع') || desc.includes('project')) {
        type = 'project'; icon = 'FolderKanban'; color = 'var(--accent-amber)';
      } else if (desc.includes('تذكرة') || desc.includes('ticket')) {
        type = 'ticket'; icon = 'Ticket'; color = 'var(--accent-gold)';
      }
      events.push({
        id: log.id, type, user: log.userName || '', description: desc, timestamp: log.createdAt, icon, color,
      });
    }
    for (const u of users) {
      if (!u.createdAt) continue;
      events.push({
        id: `reg_${u.uid}`, type: 'register', user: u.name || '', description: `تسجيل عضو جديد: ${u.name || ''}`,
        timestamp: u.createdAt, icon: 'UserPlus', color: 'var(--accent-emerald)',
      });
    }
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events.slice(0, 50);
  }, [auditLogs, users]);

  const kpiCards = useMemo((): KpiData[] => {
    const now = new Date();
    const cmStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const pmEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const newUsersThisMonth = users.filter(u => u.createdAt && new Date(u.createdAt) >= cmStart).length;
    const newUsersLastMonth = users.filter(u => u.createdAt && new Date(u.createdAt) >= pmStart && new Date(u.createdAt) <= pmEnd).length;
    const usersTrend = computeTrend(newUsersThisMonth, newUsersLastMonth);

    const newContentThisMonth = contents.filter(c => c.createdAt && new Date(c.createdAt) >= cmStart).length;
    const newContentLastMonth = contents.filter(c => c.createdAt && new Date(c.createdAt) >= pmStart && new Date(c.createdAt) <= pmEnd).length;
    const contentTrend = computeTrend(newContentThisMonth, newContentLastMonth);

    const totalViews = contents.reduce((a, c) => a + (c.views || 0), 0);
    const currentViews = contents.filter(c => c.createdAt && new Date(c.createdAt) >= dateRange.start).reduce((a, c) => a + (c.views || 0), 0);
    const previousViews = contents.filter(c => c.createdAt && new Date(c.createdAt) >= previousRange.start && new Date(c.createdAt) <= previousRange.end).reduce((a, c) => a + (c.views || 0), 0);

    const totalDownloads = contents.reduce((a, c) => a + (c.downloads || 0), 0);
    const currentDownloads = contents.filter(c => c.createdAt && new Date(c.createdAt) >= dateRange.start).reduce((a, c) => a + (c.downloads || 0), 0);
    const previousDownloads = contents.filter(c => c.createdAt && new Date(c.createdAt) >= previousRange.start && new Date(c.createdAt) <= previousRange.end).reduce((a, c) => a + (c.downloads || 0), 0);

    return [
      { label: 'إجمالي الأعضاء', value: users.length, trend: usersTrend, icon: 'Users', color: 'var(--accent-blue)', sparklineData: computeSparkline(membersGrowth) },
      { label: 'إجمالي المحتوى', value: contents.length, trend: contentTrend, icon: 'Film', color: 'var(--accent-purple)', sparklineData: computeSparkline(contentUploads.map(c => ({ date: c.date, value: c.videos + c.apps + c.files }))) },
      { label: 'إجمالي المشاهدات', value: totalViews, trend: computeTrend(currentViews, previousViews), icon: 'Eye', color: 'var(--accent-amber)', sparklineData: computeSparkline(viewsAnalytics.daily) },
      { label: 'إجمالي التنزيلات', value: totalDownloads, trend: computeTrend(currentDownloads, previousDownloads), icon: 'Download', color: 'var(--accent-emerald)', sparklineData: computeSparkline(downloadsAnalytics.daily) },
    ];
  }, [users, contents, membersGrowth, contentUploads, viewsAnalytics, downloadsAnalytics, dateRange, previousRange]);

  return {
    loading,
    dateRange,
    kpiCards,
    membersGrowth,
    contentUploads,
    viewsAnalytics,
    downloadsAnalytics,
    userActivity,
    mostViewed,
    contentDistribution,
    roleDistribution,
    storage,
    timeline,
    setDateRange,
  };
}

function getWeekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}
