/**
 * AI Config Resolution Helper
 *
 * Resolves the effective AI configuration for a user, optionally scoped
 * to a specific WhatsApp account. Per-account config takes priority,
 * falling back to the user-level default AIConfig.
 */

import { prisma } from '../../utils/database.js';

export interface ResolvedAIConfig {
  enabled: boolean;
  activeAgentId: string | null;
  temperature: number;
  filterWords: any;
  timezone: string;
  workingHours: any;
  escalationKeywords: any;
  escalationAutoAssign: boolean;
  source: 'whatsapp_account' | 'user_default';
}

/**
 * Resolve AI config for a given user, optionally scoped to a WhatsApp account.
 *
 * Priority:
 * 1. WhatsAppAccountAIConfig (per-account override) if whatsappAccountId is provided
 * 2. If whatsappAccountId is provided but no per-account config exists → return null
 *    (AI is not assigned to this number, so it should not respond)
 * 3. AIConfig (user-level default) only when no whatsappAccountId is specified
 *    (used for test-chat and other non-number-specific contexts)
 */
export async function resolveAIConfig(
  userId: string,
  whatsappAccountId?: string | null
): Promise<ResolvedAIConfig | null> {
  // 1. Try per-account config if whatsappAccountId is given
  if (whatsappAccountId) {
    const accountConfig = await prisma.whatsAppAccountAIConfig.findUnique({
      where: {
        userId_whatsappAccountId: { userId, whatsappAccountId },
      },
    });

    if (accountConfig) {
      // Type assertion needed until Prisma client is regenerated with new fields
      const config = accountConfig as typeof accountConfig & {
        timezone?: string;
        workingHours?: any;
        escalationKeywords?: any;
        escalationAutoAssign?: boolean;
      };
      return {
        enabled: config.enabled,
        activeAgentId: config.activeAgentId,
        temperature: config.temperature,
        filterWords: config.filterWords,
        timezone: config.timezone ?? 'Asia/Jakarta',
        workingHours: config.workingHours ?? null,
        escalationKeywords: config.escalationKeywords ?? null,
        escalationAutoAssign: config.escalationAutoAssign ?? true,
        source: 'whatsapp_account',
      };
    }

    // No per-account config for this number → AI not assigned, don't respond
    return null;
  }

  // 2. Fall back to user-level AIConfig (only when no whatsappAccountId specified)
  const userConfig = await prisma.aIConfig.findUnique({
    where: { userId },
  });

  if (!userConfig) return null;

  // Type assertion needed until Prisma client is regenerated with new fields
  const config = userConfig as typeof userConfig & {
    timezone?: string;
    workingHours?: any;
    escalationKeywords?: any;
    escalationAutoAssign?: boolean;
  };

  return {
    enabled: config.enabled,
    activeAgentId: config.activeAgentId,
    temperature: config.temperature,
    filterWords: config.filterWords,
    timezone: config.timezone ?? 'Asia/Jakarta',
    workingHours: config.workingHours ?? null,
    escalationKeywords: config.escalationKeywords ?? null,
    escalationAutoAssign: config.escalationAutoAssign ?? true,
    source: 'user_default',
  };
}
