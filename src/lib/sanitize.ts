const TAG_RE = /<[^>]*>/g;
const JS_RE = /(javascript|data|vbscript):/gi;
const EVENT_RE = /\bon\w+\s*=/gi;

export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(TAG_RE, '')
    .replace(JS_RE, '')
    .replace(EVENT_RE, '');
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) return { valid: false, error: 'الملف كبير جداً (الحد الأقصى 50MB)' };
  const dangerous = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.vbs', '.ps1', '.sh'];
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  if (dangerous.includes(ext)) return { valid: false, error: 'نوع الملف غير مسموح به' };
  return { valid: true };
}

export function validateMessageContent(content: string): { valid: boolean; error?: string } {
  const maxLen = 10000;
  if (content.length > maxLen) return { valid: false, error: `الرسالة طويلة جداً (الحد الأقصى ${maxLen} حرف)` };
  if (content.trim().length === 0) return { valid: false, error: 'الرسالة فارغة' };
  return { valid: true };
}
