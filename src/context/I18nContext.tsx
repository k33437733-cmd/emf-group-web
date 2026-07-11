import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Language = 'ar' | 'en';

interface I18nContextValue {
  language: Language;
  rtl: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  formatNumber: (n: number) => string;
}

const STORAGE_KEY = 'emf-language';

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Nav & Sidebar
    dashboard: 'لوحة التحكم',
    home: 'الرئيسية',
    analytics: 'التحليلات الفنية',
    users: 'إدارة الأعضاء',
    content: 'المكتبة الرقمية',
    digitalLibrary: 'المكتبة الرقمية',
    settings: 'الإعدادات العامة',
    profile: 'الملف الشخصي',
    members: 'الأعضاء',
    roles: 'الصلاحيات والأدوار',
    permissions: 'أذونات الوصول',
    logs: 'سجل النظام',
    apiKeys: 'مفاتيح الـ API',
    billing: 'الفواتير والاشتراكات',
    mainMenu: 'القائمة الرئيسية',
    managementMenu: 'إدارة الصلاحيات',
    systemMenu: 'إعدادات النظام',
    supportServices: 'خدمات الدعم',
    accountSection: 'الحساب',
    logout: 'تسجيل الخروج',
    searchPlaceholder: 'بحث سريع (Cmd+K)...',
    notifications: 'الإشعارات',
    theme: 'المظهر',
    languageName: 'العربية (AR)',
    chat: 'الشات الداخلي',
    support: 'الدعم الفني',
    projects: 'المشاريع',
    releaseNotes: 'سجل الإصدارات',
    
    // Stats Widgets
    membersCount: 'إجمالي الأعضاء',
    storageCapacity: 'سعة التخزين',
    activeToday: 'النشاط اليومي',
    growthRate: 'معدل النمو',
    vsLastMonth: 'مقارنة بالشهر الماضي',
    usedOf: 'مستخدم من',
    todayActivity: 'نشاط جديد اليوم',
    growthTrend: 'النمو هذا الشهر',

    // Dashboard UI
    recentActivity: 'سجل الأحداث الفوري',
    liveMonitor: 'مراقبة العمليات في الوقت الحقيقي',
    all: 'الكل',
    logins: 'الولوج',
    system: 'النظام',
    justNow: 'الآن',
    minAgo: 'منذ دقيقة',
    minsAgo: 'منذ {n} د',
    hourAgo: 'منذ ساعة',
    hoursAgo: 'منذ {n} س',
    daysAgo: 'منذ {n} ي',
    showAllEvents: 'عرض كل الأحداث التاريخية',
    memberGrowthChart: 'منحنى نمو الأعضاء',
    dailySignups: 'التسجيلات اليومية (آخر 30 يوم)',
    storageDistChart: 'توزيع ملفات التخزين',
    videos: 'الفيديوهات',
    apps: 'التطبيقات',
    files: 'الملفات والوثائق',
    activityHeatmap: 'خريطة تفاعل النظام',
    heatmapSubtitle: 'معدل نشاط العمليات خلال الأسابيع الأخيرة',
    
    // Members Table
    memberList: 'قائمة الأعضاء المسجلين',
    memberListSubtitle: 'إدارة وتعديل صلاحيات الأدوار وحظر الحسابات',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    role: 'الصلاحية والوظيفة',
    status: 'الحالة',
    joined: 'تاريخ الانضمام',
    actions: 'الإجراءات',
    showing: 'عرض {start} إلى {end} من {total} عضو',
    noMembersFound: 'لم يتم العثور على أي أعضاء مطابقة للبحث',
    addMemberBtn: 'إضافة عضو جديد',
    bulkImport: 'استيراد جماعي',
    sendNotification: 'إرسال إشعار',
    quickSettings: 'إعدادات سريعة',
    activeStatus: 'نشط',
    blockedStatus: 'محظور',
    roleSuperAdmin: 'مدير عام',
    roleAdmin: 'مدير النظام',
    roleUser: 'عضو مسجل',

    // Actions & Tools
    refresh: 'تحديث البيانات',
    export: 'تصدير تقرير',
    searchLabel: 'بحث سريع عن الأعضاء...',
    emptyStateCTA: 'إضافة عضو الآن',
    loadingDashboard: 'جاري تحميل لوحة التحكم الفاخرة...',
    uploadContent: 'رفع محتوى جديد',
    publishContent: 'نشر الملف',
    blockUser: 'حظر حساب',
    unblockUser: 'تفعيل الحساب',
    changeRole: 'تغيير الدور',
    confirmDelete: 'هل أنت متأكد من الحذف نهائياً؟',
    successToast: 'تمت العملية بنجاح',
    errorToast: 'حدث خطأ غير متوقع',
    warningToast: 'يرجى مراجعة المدخلات',
  },
  en: {
    // Nav & Sidebar
    dashboard: 'Dashboard',
    home: 'Home',
    analytics: 'Analytics',
    users: 'Users Management',
    content: 'Digital Library',
    digitalLibrary: 'Digital Library',
    settings: 'Settings',
    profile: 'Profile',
    members: 'Members',
    roles: 'Roles',
    permissions: 'Permissions',
    logs: 'System Logs',
    apiKeys: 'API Keys',
    billing: 'Billing',
    mainMenu: 'Main Menu',
    managementMenu: 'Management',
    systemMenu: 'System',
    supportServices: 'Support Services',
    accountSection: 'Account',
    logout: 'Logout',
    searchPlaceholder: 'Quick Search (Cmd+K)...',
    notifications: 'Notifications',
    theme: 'Appearance',
    languageName: 'English (EN)',
    chat: 'Internal Chat',
    support: 'Technical Support',
    projects: 'Projects',
    releaseNotes: 'Release Notes',

    // Stats Widgets
    membersCount: 'Total Members',
    storageCapacity: 'Storage Capacity',
    activeToday: 'Daily Activity',
    growthRate: 'Growth Rate',
    vsLastMonth: 'vs last month',
    usedOf: 'used of',
    todayActivity: 'new actions today',
    growthTrend: 'growth this month',

    // Dashboard UI
    recentActivity: 'Recent Activity Feed',
    liveMonitor: 'Real-time operations monitor',
    all: 'All',
    logins: 'Logins',
    system: 'System',
    justNow: 'Just now',
    minAgo: '1 min ago',
    minsAgo: '{n} mins ago',
    hourAgo: '1 hour ago',
    hoursAgo: '{n} hours ago',
    daysAgo: '{n} days ago',
    showAllEvents: 'View All Activity History',
    memberGrowthChart: 'Member Growth Analytics',
    dailySignups: 'Daily signups (last 30 days)',
    storageDistChart: 'Storage Distribution',
    videos: 'Videos',
    apps: 'Applications',
    files: 'Files & Documents',
    activityHeatmap: 'Activity Heatmap Grid',
    heatmapSubtitle: 'Operation logs frequency over past weeks',

    // Members Table
    memberList: 'Registered Members List',
    memberListSubtitle: 'Manage member roles, permissions, and account status',
    name: 'Full Name',
    email: 'Email Address',
    role: 'Role',
    status: 'Status',
    joined: 'Joined Date',
    actions: 'Actions',
    showing: 'Showing {start}-{end} of {total} members',
    noMembersFound: 'No members found matching filters',
    addMemberBtn: 'Add New Member',
    bulkImport: 'Bulk Import',
    sendNotification: 'Send Notification',
    quickSettings: 'Quick Settings',
    activeStatus: 'Active',
    blockedStatus: 'Blocked',
    roleSuperAdmin: 'Super Admin',
    roleAdmin: 'Administrator',
    roleUser: 'Registered Member',

    // Actions & Tools
    refresh: 'Refresh Data',
    export: 'Export Report',
    searchLabel: 'Search members...',
    emptyStateCTA: 'Add Member Now',
    loadingDashboard: 'Loading premium dashboard...',
    uploadContent: 'Upload New Content',
    publishContent: 'Publish File',
    blockUser: 'Block User',
    unblockUser: 'Unblock User',
    changeRole: 'Modify Role',
    confirmDelete: 'Are you sure you want to delete this permanently?',
    successToast: 'Operation completed successfully',
    errorToast: 'An unexpected error occurred',
    warningToast: 'Please check your inputs',
  }
};

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language;
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {}
  return 'ar'; // Default language is Arabic
}

const I18nContext = createContext<I18nContextValue>({
  language: 'ar',
  rtl: true,
  setLanguage: () => {},
  t: (key) => key,
  formatNumber: (n) => String(n),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const rtl = language === 'ar';

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {}
  }, [language, rtl]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  }, [language]);

  const formatNumber = useCallback((n: number): string => {
    if (language === 'ar') {
      // Use standard Eastern Arabic numerals option or localized standard numbers
      return n.toLocaleString('ar-EG');
    }
    return n.toLocaleString('en-US');
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, rtl, setLanguage, t, formatNumber }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
