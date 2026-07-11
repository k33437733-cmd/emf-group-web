import { FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet, File } from 'lucide-react';
import type { ReactNode } from 'react';

const ICON_COLORS: Record<string, string> = {
  pdf: '#EF4444',
  doc: '#2563EB', docx: '#2563EB',
  xls: '#16A34A', xlsx: '#16A34A',
  ppt: '#F97316', pptx: '#F97316',
  zip: '#D97706', rar: '#D97706', '7z': '#D97706', tar: '#D97706', gz: '#D97706',
  apk: '#22C55E',
  json: '#8B5CF6',
  log: '#6B7280',
  txt: '#9CA3AF',
  csv: '#16A34A',
  mp4: '#DC2626', webm: '#DC2626', mov: '#DC2626', avi: '#DC2626',
  mp3: '#F59E0B', wav: '#F59E0B', ogg: '#F59E0B', flac: '#F59E0B',
  js: '#EAB308', ts: '#2563EB', py: '#16A34A', java: '#F97316',
  html: '#E34F26', css: '#1572B6',
  psd: '#2D2D2D', ai: '#FF9A00',
};

export function getFileIcon(fileName?: string): ReactNode {
  if (!fileName) return <File size={20} />;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const color = ICON_COLORS[ext] || 'var(--text-tertiary)';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <FileImage size={20} style={{ color }} />;
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(ext)) {
    return <FileVideo size={20} style={{ color }} />;
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return <FileAudio size={20} style={{ color }} />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <FileArchive size={20} style={{ color }} />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'rb', 'go', 'rs', 'swift', 'kt', 'scala'].includes(ext)) {
    return <FileCode size={20} style={{ color }} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={20} style={{ color }} />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText size={20} style={{ color }} />;
  }
  return <FileText size={20} style={{ color }} />;
}

export function getFileLabel(fileName?: string): string {
  if (!fileName) return 'ملف';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const labels: Record<string, string> = {
    pdf: 'PDF', doc: 'DOC', docx: 'DOCX',
    xls: 'XLS', xlsx: 'XLSX',
    ppt: 'PPT', pptx: 'PPTX',
    zip: 'ZIP', rar: 'RAR', '7z': '7Z', tar: 'TAR',
    apk: 'APK',
    json: 'JSON', log: 'LOG', txt: 'TXT', csv: 'CSV',
    mp4: 'MP4', mp3: 'MP3',
    js: 'JS', ts: 'TS', py: 'PY', html: 'HTML', css: 'CSS',
  };
  return labels[ext] || ext.toUpperCase() || 'ملف';
}
