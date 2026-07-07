// Central re-export of all Firestore repositories.
// Application code imports from here — never from individual files directly
// when writing to the same collection from multiple services.

export * from './base';
export * from './users';
export * from './agent_status';
export * from './conversations';
export * from './messages';
export * from './tickets';
export * from './notifications';
export * from './content';
export * from './audit';
export * from './canned_responses';

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
