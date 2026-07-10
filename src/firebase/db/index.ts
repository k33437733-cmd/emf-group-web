// Central re-export of all Firestore repositories.
// Application code imports from here — never from individual files directly
// when writing to the same collection from multiple services.

export * from './base';
export * from './users';
export * from './agent_status';
export * from './conversations';
export * from './messages';
export * from './tickets';
export * from './content';
export * from './audit';
export * from './canned_responses';
export * from './projects';
export * from './release_notes';

// ─── Notifications (manual re-export for backward-compat aliases) ──────────
export {
  getNotificationById,
  listNotifications,
  subscribeToNotifications,
  subscribeNotificationsFiltered,
  subscribeNotificationsPaginated,
  getUnreadCount,
  subscribeUnreadCount,
  createNotification,
  createNotificationsForMany,
  markAsRead,
  markAllAsRead,
  markAsRead as markNotificationAsRead,
  markAllAsRead as markAllNotificationsAsRead,
  deleteNotification,
  archiveNotification,
  unarchiveNotification,
  purgeExpiredNotifications,
  clearArchivedNotifications,
} from './notifications';

// ─── Backward-compatible aliases for legacy modules ─────────────────────────
export {
  subscribeToContent as subscribeToContents,
  incrementViews as incrementContentViews,
  incrementDownloads as incrementContentDownloads,
  createContent as addContentItem,
  deleteContent as deleteContentItem,
  updateContent as updateContentItem,
} from './content';

export {
  writeAuditLog as logAudit,
  subscribeToAuditLogs,
} from './audit';
