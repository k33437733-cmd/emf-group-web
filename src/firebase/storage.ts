// Limits in Bytes
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_APP_SIZE = 100 * 1024 * 1024;  // 100MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB for other files

const SUPABASE_URL = 'https://jnmmqhldvvqppduzehcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubW1xaGxkdnZxcHBkdXplaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDc5MzMsImV4cCI6MjA5ODcyMzkzM30.i8C032wZMh2DreZjY7bXv_9UVd-c-DA9X0xJrD8qbn4';

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Validate file type and size before upload
 */
export function validateFile(file: File, type: 'video' | 'app' | 'other'): { isValid: boolean; error?: string } {
  const size = file.size;

  if (type === 'video') {
    if (size > MAX_VIDEO_SIZE) {
      return { isValid: false, error: 'حجم الفيديو يتخطى الحد المسموح به (50 ميجابايت)' };
    }
    // Simple mime check or extension check
    if (!file.type.startsWith('video/') && !['.mp4', '.mov', '.avi', '.mkv'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      return { isValid: false, error: 'يجب اختيار ملف فيديو صالح (مثل MP4, MOV, AVI)' };
    }
  } else if (type === 'app') {
    if (size > MAX_APP_SIZE) {
      return { isValid: false, error: 'حجم التطبيق يتخطى الحد المسموح به (100 ميجابايت)' };
    }
    const appExtensions = ['.apk', '.exe', '.dmg', '.zip', '.rar', '.ipa', '.msi'];
    if (!appExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return { isValid: false, error: 'صيغة تطبيق غير صالحة. المسموح به: (APK, EXE, DMG, ZIP, RAR, IPA)' };
    }
  } else {
    if (size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'حجم الملف يتخطى الحد المسموح به (50 ميجابايت)' };
    }
  }

  return { isValid: true };
}

/**
 * Upload file to Supabase Storage with progress callback
 */
export function uploadFile(
  file: File, 
  category: 'video' | 'app' | 'other', 
  onProgress: UploadProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check validation first
    const val = validateFile(file, category);
    if (!val.isValid) {
      reject(new Error(val.error || 'Invalid file'));
      return;
    }

    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    
    // Path inside storage bucket 'contents'
    const storagePath = `${category}/${uniqueFileName}`;
    const url = `${SUPABASE_URL}/storage/v1/object/contents/${storagePath}`;

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(Math.round(progress));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Successfully uploaded, get public URL
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/contents/${storagePath}`;
        resolve(publicUrl);
      } else {
        console.error("Upload failed", xhr.responseText);
        reject(new Error(`فشل رفع الملف: خطأ في الخادم`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("خطأ في الشبكة أثناء رفع الملف"));
    });

    xhr.open("POST", url, true);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFileFromStorage(fileUrl: string): Promise<void> {
  try {
    const urlPattern = /\/object\/public\/contents\/(.+)$/;
    const match = fileUrl.match(urlPattern);
    
    if (match && match[1]) {
      const filePath = match[1];
      const deleteUrl = `${SUPABASE_URL}/storage/v1/object/contents/${filePath}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to delete file:', await response.text());
      }
    }
  } catch (error) {
    console.error('Failed to delete file from storage:', error);
  }
}

/* 
========================================================================
ملاحظة للتعديل المستقبلي إلى Cloudinary (إذا رغبت في التبديل للخيارات المجانية الخارجية):
========================================================================

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'YOUR_CLOUDINARY_PRESET'); // من إعدادات كلاوديناري
  
  const response = await fetch('https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.secure_url;
}
*/
