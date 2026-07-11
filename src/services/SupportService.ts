import type { ChatMessage, UserProfile, Conversation } from '../types';
import { messageRepository, conversationRepository, userRepository } from '../repositories';
import { sanitizeText, validateFile, validateMessageContent } from '../lib/sanitize';
import { checkRateLimit } from '../lib/rateLimit';
import { enqueueAudit, createAuditEntry } from '../audit/auditService';
import { startMark, endMark } from '../lib/performance';

export class SupportService {
  static async sendMessage(
    user: UserProfile,
    conversationId: string,
    content: string,
    files?: File[],
  ): Promise<void> {
    const key = `send:${user.uid}`;
    if (!checkRateLimit(key)) throw new Error('الرجاء الانتظار قبل إرسال رسالة أخرى');

    const validContent = validateMessageContent(content);
    if (!validContent.valid) throw new Error(validContent.error);

    const sanitized = sanitizeText(content.trim());

    startMark('sendMsg');

    try {
      if (files && files.length > 0) {
        for (const file of files) {
          const validation = validateFile(file);
          if (!validation.valid) throw new Error(validation.error);
        }
        for (const file of files) {
          const msgType = file.type.startsWith('image/') ? 'image' as const : 'file' as const;
          await messageRepository.send(conversationId, user, '', msgType, {
            fileUrl: '', fileName: file.name, fileSize: file.size, fileType: file.type,
          });
        }
      }
      if (sanitized) {
        await messageRepository.send(conversationId, user, sanitized, 'text');
      }

      enqueueAudit(createAuditEntry('message.sent', user.uid, user.name || '', {
        targetId: conversationId, targetType: 'conversation',
        details: { contentLength: sanitized.length, hasFiles: !!files?.length },
      }));
    } finally {
      endMark('sendMsg', true);
    }
  }

  static async deleteMessage(user: UserProfile, messageId: string): Promise<void> {
    await messageRepository.delete(messageId, user.uid);
    enqueueAudit(createAuditEntry('message.deleted', user.uid, user.name || '', {
      targetId: messageId, targetType: 'message',
    }));
  }

  static async editMessage(user: UserProfile, messageId: string, content: string): Promise<void> {
    const sanitized = sanitizeText(content.trim());
    await messageRepository.edit(messageId, user.uid, sanitized);
    enqueueAudit(createAuditEntry('message.edited', user.uid, user.name || '', {
      targetId: messageId, targetType: 'message',
    }));
  }

  static async addReaction(user: UserProfile, conversationId: string, messageId: string, emoji: string): Promise<void> {
    await messageRepository.addReaction(messageId, conversationId, user.uid, emoji);
  }

  static async transferConversation(user: UserProfile, conversationId: string, newUid: string, newName: string): Promise<void> {
    await conversationRepository.transfer(conversationId, newUid, newName, user.uid);
    enqueueAudit(createAuditEntry('conversation.transferred', user.uid, user.name || '', {
      targetId: conversationId, targetType: 'conversation',
      details: { toUid: newUid, toName: newName },
    }));
  }

  static async archiveConversation(user: UserProfile, conversationId: string): Promise<void> {
    await conversationRepository.archive(conversationId);
    enqueueAudit(createAuditEntry('conversation.archived', user.uid, user.name || '', {
      targetId: conversationId, targetType: 'conversation',
    }));
  }

  static async toggleImportant(user: UserProfile, conversationId: string, important: boolean): Promise<void> {
    await conversationRepository.toggleImportant(conversationId, important);
    enqueueAudit(createAuditEntry('conversation.important', user.uid, user.name || '', {
      targetId: conversationId, targetType: 'conversation',
      details: { important },
    }));
  }

  static async muteConversation(user: UserProfile, conversationId: string, mute: boolean): Promise<void> {
    if (mute) await conversationRepository.mute(conversationId);
    else await conversationRepository.unmute(conversationId);
    enqueueAudit(createAuditEntry('conversation.muted', user.uid, user.name || '', {
      targetId: conversationId, targetType: 'conversation',
      details: { mute },
    }));
  }

  static async ensureConversation(user: UserProfile): Promise<string> {
    return conversationRepository.ensureSupport(user);
  }

  static async getMessage(conversationId: string, messageId: string): Promise<ChatMessage | null> {
    return messageRepository.getById(conversationId, messageId);
  }
}
