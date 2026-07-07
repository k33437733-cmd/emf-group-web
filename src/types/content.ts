// ─── Enumerations ───────────────────────────────────────────────────────────

export type ContentType = 'video' | 'app' | 'other';

export type ContentAccessLevel = 'all' | 'agent' | 'admin';

// ─── Core Interface ───────────────────────────────────────────────────────────

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;       // bytes
  fileType: string;       // extension
  duration?: number;      // seconds, for video
  uploadedBy: string;
  uploadedByName: string;
  views: number;
  downloads: number;
  tags: string[];
  accessLevel: ContentAccessLevel;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Upload Payload ───────────────────────────────────────────────────────────

export interface CreateContentPayload {
  title: string;
  description: string;
  type: ContentType;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  duration?: number;
  uploadedBy: string;
  uploadedByName: string;
  tags?: string[];
  accessLevel?: ContentAccessLevel;
}

// ─── Update Payload ───────────────────────────────────────────────────────────

export type UpdateContentPayload = Partial<
  Pick<ContentItem, 'title' | 'description' | 'tags' | 'accessLevel' | 'isPublished' | 'thumbnailUrl'>
>;

// ─── Validation ───────────────────────────────────────────────────────────────

export const FILE_SIZE_LIMITS: Record<ContentType, number> = {
  video: 50 * 1024 * 1024,   // 50 MB
  app:   100 * 1024 * 1024,  // 100 MB
  other: 50 * 1024 * 1024,   // 50 MB
};

export const ALLOWED_EXTENSIONS: Record<ContentType, string[]> = {
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  app:   ['.apk', '.exe', '.dmg', '.zip', '.rar', '.ipa', '.msi'],
  other: [], // any extension allowed
};

export function validateContentFile(
  file: File,
  type: ContentType,
): { valid: true } | { valid: false; error: string } {
  if (file.size > FILE_SIZE_LIMITS[type]) {
    const limitMB = FILE_SIZE_LIMITS[type] / (1024 * 1024);
    return { valid: false, error: `حجم الملف يتجاوز الحد المسموح به (${limitMB} MB)` };
  }

  const allowed = ALLOWED_EXTENSIONS[type];
  if (allowed.length > 0) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      return {
        valid: false,
        error: `صيغة الملف غير مدعومة. الصيغ المقبولة: ${allowed.join(', ')}`,
      };
    }
  }

  return { valid: true };
}
