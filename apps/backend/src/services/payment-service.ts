/**
 * PaymentService
 * 
 * Handles payment transactions for subscription upgrades using multiple payment gateways.
 * Manages payment creation, callback processing, subscription activation, and payment history.
 * Uses PaymentGatewayManager for provider routing and multi-gateway support.
 * 
 * Requirements: 2.2, 2.3, 2.6, 4.5, 5.1-5.7, 6.1-6.6, 7.1-7.5, 8.1-8.5, 9.1-9.2
 */

import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { auditLog } from '../utils/auditLog.js';
import { duitkuService, type DuitkuCallbackPayload } from './duitku-service.js';
import { adminSettingsService } from './admin/settings-service.js';
import { adminSubscriptionPlansService } from './admin/subscription-plans-service.js';
import { emailService } from './email/EmailService.js';
import { paymentGatewayManager } from './payment/gateway-manager.js';
import { duitkuProvider } from './payment/providers/duitku-provider.js';
import { notificationService } from './notification-service.js';
import type { DuitkuSettings } from '../types/admin-settings.js';
import type { PaymentProvider, PaymentMethod } from './payment/types.js';

// Register providers on module load
// This ensures providers are available when the service is used
if (!paymentGatewayManager.isProviderRegistered('duitku')) {
  paymentGatewayManager.registerProvider(duitkuProvider);
}

// Type definitions matching Prisma schema
type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
type SubscriptionTier = 'FREE' | 'BASIC' | 'LITE' | 'PRO';

// =============================================================================
// Types and Interfaces
// =============================================================================

// Valid duration months for subscription
export const VALID_DURATION_MONTHS = [1, 3, 6, 12] as const;
export type DurationMonths = typeof VALID_DURATION_MONTHS[number];

export interface CreatePaymentParams {
  userId: string;
  targetTier: 'BASIC' | 'LITE' | 'PRO';
  durationMonths: DurationMonths; // 1, 3, 6, or 12 months
  providerId?: string; // Optional: specific provider to use, defaults to system default
  paymentMethod?: PaymentMethod; // Optional: payment method, defaults to QRIS
  locale?: string; // Optional: locale for redirect URL (e.g., 'en', 'id')
}

/**
 * Validate that durationMonths is one of the allowed values
 */
export function isValidDurationMonths(value: number): value is DurationMonths {
  return VALID_DURATION_MONTHS.includes(value as DurationMonths);
}

export interface CreatePaymentResponse {
  success: boolean;
  orderId?: string;
  qrString?: string;
  qrUrl?: string;
  vaNumber?: string; // For VA payments
  paymentUrl?: string; // For Invoice/Payment Link - redirect user here
  amount?: number;
  expiresAt?: Date;
  providerId?: string; // Provider that processed the payment
  error?: string;
  errorCode?: string;
}

export interface PaymentHistoryItem {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  targetTier: string;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PricingInfo {
  basic: {
    price: number;
    features: string[];
  };
  lite: {
    price: number;
    features: string[];
  };
  pro: {
    price: number;
    features: string[];
  };
}

export interface TransactionStatusResponse {
  status: PaymentStatus;
  paidAt: Date | null;
  amount: number;
  targetTier: SubscriptionTier;
}

// =============================================================================
// PaymentService Class
// =============================================================================

export class PaymentService {

  // ===========================================================================
  // Pricing Methods (Task 3.1)
  // Requirements: 2.6, 4.3
  // ===========================================================================

  /**
   * Get subscription pricing from subscription plans config
   * Falls back to duitku settings for backward compatibility
   * Returns pricing for LITE and PRO tiers with features
   */
  async getPricing(): Promise<PricingInfo> {
    try {
      // Primary: Read from subscription_plans category
      const plansConfig = await adminSubscriptionPlansService.getPlans();
      
      return {
        basic: {
          price: plansConfig.basic.price,
          features: plansConfig.basic.features,
        },
        lite: {
          price: plansConfig.lite.price,
          features: plansConfig.lite.features,
        },
        pro: {
          price: plansConfig.pro.price,
          features: plansConfig.pro.features,
        },
      };
    } catch (plansError) {
      logger.warn('Failed to get pricing from subscription plans, trying duitku settings', {
        error: plansError instanceof Error ? plansError.message : 'Unknown error',
      });

      // Fallback: Read from duitku settings for backward compatibility
      try {
        const settings = await adminSettingsService.getDecryptedSettings<DuitkuSettings>('duitku');
        
        return {
          basic: {
            price: 25000,
            features: [
              'Semua fitur FREE',
              'API Access',
              'Webhook Integration',
              '2 Team Members',
            ],
          },
          lite: {
            price: settings.litePriceMonthly || 99000,
            features: [
              'Semua fitur FREE',
              'Unlimited pesan',
              '1 AI Agent',
              '5 Knowledge Documents',
              '2 API Keys',
              '3 Webhook Endpoints',
              'n8n Integration',
            ],
          },
          pro: {
            price: settings.proPriceMonthly || 299000,
            features: [
              'Semua fitur LITE',
              '10 AI Agents',
              '50 Knowledge Documents',
              '10 API Keys',
              '20 Webhook Endpoints',
            ],
          },
        };
      } catch (duitkuError) {
        logger.error('Failed to get pricing from both sources', {
          plansError: plansError instanceof Error ? plansError.message : 'Unknown error',
          duitkuError: duitkuError instanceof Error ? duitkuError.message : 'Unknown error',
        });
        
        // Return default pricing on error
        return {
          basic: {
            price: 25000,
            features: [
              'Semua fitur FREE',
              'API Access',
              'Webhook Integration',
              '2 Team Members',
            ],
          },
          lite: {
            price: 99000,
            features: [
              'Semua fitur FREE',
              'Unlimited pesan',
              '1 AI Agent',
              '5 Knowledge Documents',
              '2 API Keys',
              '3 Webhook Endpoints',
              'n8n Integration',
            ],
          },
          pro: {
            price: 299000,
            features: [
              'Semua fitur LITE',
              '10 AI Agents',
              '50 Knowledge Documents',
              '10 API Keys',
              '20 Webhook Endpoints',
            ],
          },
        };
      }
    }
  }

  /**
   * Generate unique order ID for payment transaction
   * Format: KC-{timestamp}-{random}
   * Requirements: 5.2
   */
  generateOrderId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `KC-${timestamp}-${random}`;
  }

  // ===========================================================================
  // Payment Creation (Task 3.2)
  // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
  // ===========================================================================

  /**
   * Create a new payment transaction
   * Validates user eligibility, creates transaction record, and generates payment via provider
   * Now supports multi-duration subscriptions (1, 3, 6, or 12 months)
   * Uses PaymentGatewayManager for provider routing
   * 
   * Requirements: 2.2, 2.3, 7.1, 7.2
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
    const { userId, targetTier, durationMonths, providerId: requestedProviderId, paymentMethod = 'QRIS' } = params;

    try {
      // Validate durationMonths
      if (!isValidDurationMonths(durationMonths)) {
        return {
          success: false,
          error: 'Durasi tidak valid. Pilih 1, 3, 6, atau 12 bulan',
          errorCode: 'INVALID_DURATION',
        };
      }

      // Get the payment provider (use requested or default)
      let provider: PaymentProvider | undefined;
      let providerId: string;

      if (requestedProviderId) {
        provider = paymentGatewayManager.getProvider(requestedProviderId);
        if (!provider) {
          return {
            success: false,
            error: `Provider ${requestedProviderId} tidak ditemukan`,
            errorCode: 'PROVIDER_NOT_FOUND',
          };
        }
        providerId = requestedProviderId;
      } else {
        provider = await paymentGatewayManager.getDefaultProvider();
        if (!provider) {
          return {
            success: false,
            error: 'Tidak ada payment gateway yang aktif',
            errorCode: 'NO_ACTIVE_PROVIDER',
          };
        }
        providerId = provider.providerId;
      }

      // Check if provider is configured
      const isConfigured = await provider.isConfigured();
      if (!isConfigured) {
        return {
          success: false,
          error: 'Payment gateway belum dikonfigurasi',
          errorCode: 'PROVIDER_NOT_CONFIGURED',
        };
      }

      // Check if provider supports the requested payment method
      const supportedMethods = provider.getPaymentMethods();
      if (!supportedMethods.includes(paymentMethod)) {
        return {
          success: false,
          error: `Metode pembayaran ${paymentMethod} tidak didukung oleh ${provider.displayName}`,
          errorCode: 'UNSUPPORTED_PAYMENT_METHOD',
        };
      }

      // Validate user exists and check current tier
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      // Check if user is already on target tier or higher
      const currentTier = user.subscription?.tier || 'FREE';
      if (this.isSameTierOrHigher(currentTier, targetTier)) {
        return {
          success: false,
          error: 'Anda sudah berlangganan paket ini atau lebih tinggi',
          errorCode: 'ALREADY_SUBSCRIBED',
        };
      }

      // Get pricing with duration options from subscription plans service
      const tier = targetTier.toLowerCase() as 'basic' | 'lite' | 'pro';
      const planPricing = await adminSubscriptionPlansService.getPlanPricing(tier);
      
      // Find the selected duration option
      const selectedDuration = planPricing.durations.find(d => d.months === durationMonths);
      
      if (!selectedDuration) {
        return {
          success: false,
          error: 'Durasi tidak tersedia untuk paket ini',
          errorCode: 'DURATION_NOT_FOUND',
        };
      }

      // Check if duration is enabled
      if (!selectedDuration.enabled) {
        return {
          success: false,
          error: 'Durasi ini tidak tersedia',
          errorCode: 'DURATION_DISABLED',
        };
      }

      // Use calculated total price from duration config
      const amount = selectedDuration.totalPrice;
      const durationDays = selectedDuration.days;

      // Generate order ID
      const orderId = this.generateOrderId();
      const expiryMinutes = 15;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Create transaction record with PENDING status, correct durationDays, and providerId
      // Note: Using type assertion for providerId as Prisma client may need regeneration after migration
      const transaction = await (prisma.paymentTransaction.create as any)({
        data: {
          userId,
          orderId,
          amount,
          paymentMethod, // Prisma enum now supports QRIS and VA_* methods
          providerId, // Store which provider is processing this transaction
          targetTier: targetTier as SubscriptionTier,
          durationDays,
          status: 'PENDING',
          expiresAt,
        },
      });

      // Build product details with duration info
      const durationLabel = selectedDuration.label || `${durationMonths} Bulan`;
      const productDetails = `KirimChat ${targetTier} Subscription - ${durationLabel}`;

      // Call provider to create payment
      // Sanitize FRONTEND_URL in case it has embedded quotes from misconfigured env
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/^["']|["']$/g, '');
      const locale = params.locale || 'en';
      // Add check param to trigger frontend revalidation/polling
      const returnUrl = `${frontendUrl}/${locale}/subscription?payment_verification=true&order_id=${orderId}`;
      const providerResponse = await provider.createPayment({
        orderId,
        amount,
        customerEmail: user.email,
        customerName: user.name,
        productDetails,
        returnUrl,
        paymentMethod,
        expiryMinutes,
      });

      if (!providerResponse.success) {
        // Update transaction to FAILED
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' },
        });

        logger.error('Payment creation failed', {
          orderId,
          providerId,
          error: providerResponse.error,
        });

        return {
          success: false,
          error: providerResponse.error || 'Gagal membuat pembayaran, coba lagi',
          errorCode: providerResponse.errorCode || 'PROVIDER_ERROR',
        };
      }

      // Update transaction with provider response
      // Note: Using type assertion for vaNumber as Prisma client may need regeneration
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          referenceNo: providerResponse.referenceNo,
          qrString: providerResponse.qrString,
          qrUrl: providerResponse.qrUrl,
          ...(providerResponse.vaNumber && { vaNumber: providerResponse.vaNumber }),
        } as any,
      });

      logger.info('Payment transaction created', {
        orderId,
        userId,
        targetTier,
        durationMonths,
        durationDays,
        amount,
        providerId,
        paymentMethod,
      });

      return {
        success: true,
        orderId,
        qrString: providerResponse.qrString,
        qrUrl: providerResponse.qrUrl,
        vaNumber: providerResponse.vaNumber,
        paymentUrl: providerResponse.paymentUrl,
        amount,
        expiresAt,
        providerId,
      };
    } catch (error) {
      logger.error('Failed to create payment', {
        userId,
        targetTier,
        durationMonths,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: 'Gagal membuat pembayaran, coba lagi',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Check if current tier is same or higher than target tier
   */
  private isSameTierOrHigher(currentTier: string, targetTier: string): boolean {
    const tierOrder = { FREE: 0, BASIC: 1, LITE: 2, PRO: 3 };
    const current = tierOrder[currentTier as keyof typeof tierOrder] ?? 0;
    const target = tierOrder[targetTier as keyof typeof tierOrder] ?? 0;
    return current >= target;
  }


  // ===========================================================================
  // Transaction Status (Task 3.3)
  // Requirements: 9.1, 9.2
  // ===========================================================================

  /**
   * Get transaction status by orderId and userId
   * Returns current status for frontend polling
   * If status is PENDING, also checks provider API as fallback for missed webhooks
   * Routes to correct provider based on transaction's providerId
   * 
   * Requirements: 7.3, 9.1, 9.2
   */
  async getTransactionStatus(orderId: string, userId: string): Promise<TransactionStatusResponse | null> {
    try {
      // Note: Using type assertion for providerId field as Prisma client may need regeneration
      const transaction = await (prisma.paymentTransaction.findFirst as any)({
        where: {
          orderId,
          userId,
        },
        select: {
          id: true,
          orderId: true,
          userId: true,
          amount: true,
          targetTier: true,
          status: true,
          paidAt: true,
          providerId: true,
          referenceNo: true, // Include referenceNo for provider status lookup
        },
      }) as { id: string; orderId: string; userId: string; amount: number; targetTier: SubscriptionTier; status: PaymentStatus; paidAt: Date | null; providerId: string | null; referenceNo: string | null } | null;

      if (!transaction) {
        return null;
      }

      // If still PENDING, check provider API as fallback for missed webhooks
      if (transaction.status === 'PENDING') {
        try {
          // Get the provider that processed this transaction
          const providerId = transaction.providerId || 'duitku'; // Default to duitku for backward compatibility
          const provider = paymentGatewayManager.getProvider(providerId);

          if (provider) {
            // Pass referenceNo for direct lookup (e.g., Xendit VA id)
            const providerStatus = await provider.checkStatus(orderId, transaction.referenceNo || undefined);
            
            if (providerStatus.success && providerStatus.status === 'SUCCESS') {
              logger.info('Payment completed detected via provider API check', {
                orderId,
                providerId,
              });

              // Update transaction status
              await prisma.paymentTransaction.update({
                where: { orderId },
                data: {
                  status: 'COMPLETED',
                  paidAt: new Date(),
                },
              });

              // Activate subscription
              await this.activateSubscription(transaction.userId, transaction.targetTier, orderId, transaction.amount);

              // Create payment success notification
              await notificationService.createPaymentNotification(transaction.userId, 'success', orderId);

              return {
                status: 'COMPLETED',
                paidAt: new Date(),
                amount: transaction.amount,
                targetTier: transaction.targetTier,
              };
            } else if (providerStatus.status === 'FAILED') {
              // Update to failed
              await prisma.paymentTransaction.update({
                where: { orderId },
                data: { status: 'FAILED' },
              });

              // Create payment failure notification
              await notificationService.createPaymentNotification(transaction.userId, 'failed', orderId);

              return {
                status: 'FAILED',
                paidAt: null,
                amount: transaction.amount,
                targetTier: transaction.targetTier,
              };
            } else if (providerStatus.status === 'EXPIRED') {
              // Update to expired
              await prisma.paymentTransaction.update({
                where: { orderId },
                data: { status: 'EXPIRED' },
              });

              return {
                status: 'EXPIRED',
                paidAt: null,
                amount: transaction.amount,
                targetTier: transaction.targetTier,
              };
            }
          } else {
            logger.warn('Provider not found for status check, using DB status', {
              orderId,
              providerId,
            });
          }
        } catch (checkError) {
          // Log but don't fail - just return current DB status
          logger.warn('Failed to check provider status, using DB status', {
            orderId,
            error: checkError instanceof Error ? checkError.message : 'Unknown error',
          });
        }
      }

      return {
        status: transaction.status,
        paidAt: transaction.paidAt,
        amount: transaction.amount,
        targetTier: transaction.targetTier,
      };
    } catch (error) {
      logger.error('Failed to get transaction status', {
        orderId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // ===========================================================================
  // Callback Processing (Task 3.4)
  // Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
  // ===========================================================================

  /**
   * Process callback from payment provider
   * Validates signature, updates transaction status, and activates subscription if successful
   * Routes to correct provider based on transaction's providerId for backward compatibility
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.3, 7.4
   */
  async processCallback(
    payload: DuitkuCallbackPayload,
    signature: string,
    timestamp: string,
    providerId?: string // Optional: provider ID from webhook route
  ): Promise<{ success: boolean; message: string }> {
    // Support both legacy (merchantOrderId) and SNAP (partnerReferenceNo) formats
    const orderId = payload.merchantOrderId || payload.partnerReferenceNo;

    try {
      // Find transaction first to get the providerId
      // Using type assertion for providerId field as Prisma client may need regeneration
      const transaction = await (prisma.paymentTransaction.findUnique as any)({
        where: { orderId },
        select: {
          id: true,
          orderId: true,
          userId: true,
          amount: true,
          targetTier: true,
          status: true,
          providerId: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }) as { id: string; orderId: string; userId: string; amount: number; targetTier: SubscriptionTier; status: PaymentStatus; providerId: string | null; user: { id: string; email: string; name: string } } | null;

      if (!transaction) {
        logger.error('Transaction not found for callback', { orderId });
        return { success: false, message: 'Transaction not found' };
      }

      // Determine which provider to use for validation
      // Priority: 1) providerId from webhook route, 2) transaction's providerId, 3) default 'duitku'
      const effectiveProviderId = providerId || transaction.providerId || 'duitku';
      
      // Get the provider for validation
      const provider = paymentGatewayManager.getProvider(effectiveProviderId);
      
      if (!provider) {
        // Fallback to legacy Duitku validation for backward compatibility
        logger.warn('Provider not found, falling back to legacy Duitku validation', {
          orderId,
          providerId: effectiveProviderId,
        });
        
        // Load Duitku config before validating signature
        await duitkuService.getConfig();
        
        // Validate signature using legacy method
        const validationResult = duitkuService.validateCallbackSignature(payload, signature, timestamp);
        
        if (!validationResult.valid) {
          logger.warn('Invalid callback signature (legacy fallback)', { 
            orderId,
            format: validationResult.format,
            error: validationResult.error,
          });
          
          await auditLog(
            'payment_callback_invalid_signature',
            'payment_transaction',
            orderId,
            { 
              signature: signature ? signature.substring(0, 20) + '...' : 'none',
              format: validationResult.format,
              error: validationResult.error,
              providerId: effectiveProviderId,
            }
          );

          return { success: false, message: 'Invalid signature' };
        }
      } else {
        // Use provider's validateCallback method
        const headers: Record<string, string> = {};
        if (signature) headers['x-signature'] = signature;
        if (timestamp) headers['x-timestamp'] = timestamp;
        
        const validationResult = await provider.validateCallback(payload, headers);
        
        if (!validationResult.valid) {
          logger.warn('Invalid callback signature', { 
            orderId,
            providerId: effectiveProviderId,
            error: validationResult.error,
          });
          
          await auditLog(
            'payment_callback_invalid_signature',
            'payment_transaction',
            orderId,
            { 
              signature: signature ? signature.substring(0, 20) + '...' : 'none',
              error: validationResult.error,
              providerId: effectiveProviderId,
            }
          );

          return { success: false, message: 'Invalid signature' };
        }
      }

      // Idempotency check - skip if already processed
      if (transaction.status !== 'PENDING') {
        logger.info('Callback already processed (idempotency)', {
          orderId,
          currentStatus: transaction.status,
          providerId: effectiveProviderId,
        });
        return { success: true, message: 'Already processed' };
      }

      // Determine status from callback
      const callbackStatus = this.mapDuitkuStatus(payload);
      const paidAt = callbackStatus === 'COMPLETED' ? new Date() : null;

      // Update transaction
      await prisma.paymentTransaction.update({
        where: { orderId },
        data: {
          status: callbackStatus,
          paidAt,
          callbackPayload: payload as object,
        },
      });

      // Log callback for audit
      await auditLog(
        'payment_callback_received',
        'payment_transaction',
        orderId,
        {
          status: callbackStatus,
          referenceNo: payload.reference || payload.referenceNo,
          amount: payload.amount,
          providerId: effectiveProviderId,
        },
        transaction.userId
      );

      // If successful, activate subscription and create success notification
      if (callbackStatus === 'COMPLETED') {
        await this.activateSubscription(transaction.userId, transaction.targetTier, orderId, transaction.amount);
        await notificationService.createPaymentNotification(transaction.userId, 'success', orderId);
      } else if (callbackStatus === 'FAILED') {
        // Create failure notification
        await notificationService.createPaymentNotification(transaction.userId, 'failed', orderId);
      }

      logger.info('Payment callback processed', {
        orderId,
        status: callbackStatus,
        userId: transaction.userId,
        providerId: effectiveProviderId,
      });

      return { success: true, message: 'Callback processed' };
    } catch (error) {
      logger.error('Failed to process callback', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, message: 'Internal error' };
    }
  }

  /**
   * Process callback from any payment provider using PaymentGatewayManager
   * Generic method that routes to the correct provider based on providerId
   * 
   * Requirements: 7.3, 7.4
   */
  async processProviderCallback(
    providerId: string,
    payload: unknown,
    headers: Record<string, string>
  ): Promise<{ success: boolean; message: string; orderId?: string }> {
    try {
      // Route webhook to the correct provider
      const validationResult = await paymentGatewayManager.routeWebhook(providerId, payload, headers);

      if (!validationResult.valid) {
        logger.warn('Invalid provider callback', {
          providerId,
          error: validationResult.error,
        });
        return { success: false, message: validationResult.error || 'Invalid callback' };
      }

      const orderId = validationResult.orderId;
      if (!orderId) {
        logger.error('No orderId in callback validation result', { providerId });
        return { success: false, message: 'Missing order ID' };
      }

      // Find transaction with providerId field
      // Using type assertion for providerId field as Prisma client may need regeneration
      const transaction = await (prisma.paymentTransaction.findUnique as any)({
        where: { orderId },
        select: {
          id: true,
          orderId: true,
          userId: true,
          amount: true,
          targetTier: true,
          status: true,
          providerId: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }) as { id: string; orderId: string; userId: string; amount: number; targetTier: SubscriptionTier; status: PaymentStatus; providerId: string | null; user: { id: string; email: string; name: string } } | null;

      if (!transaction) {
        logger.error('Transaction not found for provider callback', { orderId, providerId });
        return { success: false, message: 'Transaction not found', orderId };
      }

      // Verify provider matches
      if (transaction.providerId && transaction.providerId !== providerId) {
        logger.warn('Provider mismatch in callback', {
          orderId,
          expectedProvider: transaction.providerId,
          receivedProvider: providerId,
        });
        // Continue processing but log the mismatch
      }

      // Idempotency check
      if (transaction.status !== 'PENDING') {
        logger.info('Provider callback already processed (idempotency)', {
          orderId,
          currentStatus: transaction.status,
          providerId,
        });
        return { success: true, message: 'Already processed', orderId };
      }

      // Map provider status to our PaymentStatus
      const statusMap: Record<string, PaymentStatus> = {
        'SUCCESS': 'COMPLETED',
        'PENDING': 'PENDING',
        'FAILED': 'FAILED',
        'EXPIRED': 'EXPIRED',
      };
      const callbackStatus = statusMap[validationResult.status || 'PENDING'] || 'PENDING';
      const paidAt = callbackStatus === 'COMPLETED' ? new Date() : null;

      // Update transaction
      await prisma.paymentTransaction.update({
        where: { orderId },
        data: {
          status: callbackStatus,
          paidAt,
          callbackPayload: payload as object,
        },
      });

      // Log callback for audit
      await auditLog(
        'payment_callback_received',
        'payment_transaction',
        orderId,
        {
          status: callbackStatus,
          amount: validationResult.amount,
          providerId,
        },
        transaction.userId
      );

      // If successful, activate subscription and create success notification
      if (callbackStatus === 'COMPLETED') {
        await this.activateSubscription(transaction.userId, transaction.targetTier, orderId, transaction.amount);
        await notificationService.createPaymentNotification(transaction.userId, 'success', orderId);
      } else if (callbackStatus === 'FAILED') {
        // Create failure notification
        await notificationService.createPaymentNotification(transaction.userId, 'failed', orderId);
      }

      logger.info('Provider callback processed', {
        orderId,
        status: callbackStatus,
        userId: transaction.userId,
        providerId,
      });

      return { success: true, message: 'Callback processed', orderId };
    } catch (error) {
      logger.error('Failed to process provider callback', {
        providerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, message: 'Internal error' };
    }
  }

  /**
   * Map Duitku callback status to our PaymentStatus
   * Supports both Legacy API and SNAP API formats
   */
  private mapDuitkuStatus(payload: DuitkuCallbackPayload): PaymentStatus {
    // Legacy API format - resultCode
    if (payload.resultCode) {
      if (payload.resultCode === '00') {
        return 'COMPLETED';
      }
      if (payload.resultCode === '01') {
        return 'PENDING';
      }
      return 'FAILED';
    }

    // SNAP API format
    const responseCode = payload.responseCode;
    const transactionStatus = payload.additionalInfo?.transactionStatus;

    // Success codes
    if (responseCode === '2004700' || responseCode?.startsWith('200') || transactionStatus === '00') {
      return 'COMPLETED';
    }

    // Expired
    if (transactionStatus === '03') {
      return 'EXPIRED';
    }

    // Failed
    if (transactionStatus === '02' || responseCode?.startsWith('4') || responseCode?.startsWith('5')) {
      return 'FAILED';
    }

    // Default to PENDING if unclear
    return 'PENDING';
  }


  // ===========================================================================
  // Subscription Activation (Task 3.5)
  // Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 4.1, 4.2, 4.3
  // ===========================================================================

  /**
   * Activate user subscription after successful payment
   * Updates subscription tier, sets validity period based on durationDays from transaction,
   * sends email with duration info, and creates audit log
   */
  async activateSubscription(
    userId: string,
    targetTier: SubscriptionTier,
    orderId: string,
    amount?: number
  ): Promise<void> {
    try {
      // Get transaction to read durationDays
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { orderId },
        select: { durationDays: true },
      });

      // Use durationDays from transaction, fallback to 30 for backward compatibility
      const durationDays = transaction?.durationDays || 30;
      
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // Get user info for email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      // Upsert subscription
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          tier: targetTier,
          status: 'ACTIVE',
          startDate,
          endDate,
        },
        create: {
          userId,
          tier: targetTier,
          status: 'ACTIVE',
          startDate,
          endDate,
        },
      });

// Also update user's subscriptionTier field for quick access
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: targetTier },
      });

      // IMPORTANT: Invalidate subscription cache so API returns fresh data
      const { invalidateSubscriptionCache } = await import('../middleware/subscription.js');
      await invalidateSubscriptionCache(userId);

      // Calculate duration label for audit log and email
      const durationLabel = this.getDurationLabel(durationDays);

      // Create audit log with duration info
      await auditLog(
        'subscription_activated',
        'subscription',
        userId,
        {
          tier: targetTier,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          durationDays,
          durationLabel,
          orderId,
        },
        userId
      );

      // Send activation email with duration info (Requirement 7.4, 4.3)
      if (user?.email) {
        try {
          const emailResult = await emailService.sendSubscriptionActivationEmail({
            to: user.email,
            userName: user.name || 'Pelanggan',
            tierName: targetTier,
            startDate,
            endDate,
            orderId,
            amount: amount || 0,
            durationDays,
            durationLabel,
          });

          if (!emailResult.success) {
            logger.warn('Failed to send subscription activation email', {
              userId,
              orderId,
              error: emailResult.error,
            });
          } else {
            logger.info('Subscription activation email sent', {
              userId,
              orderId,
              email: user.email,
            });
          }
        } catch (emailError) {
          // Don't fail the activation if email fails
          logger.error('Error sending subscription activation email', {
            userId,
            orderId,
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
          });
        }
      }

      logger.info('Subscription activated', {
        userId,
        tier: targetTier,
        orderId,
        durationDays,
        durationLabel,
        startDate,
        endDate,
      });
    } catch (error) {
      logger.error('Failed to activate subscription', {
        userId,
        targetTier,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get human-readable duration label from days
   */
  private getDurationLabel(durationDays: number): string {
    const daysToLabel: Record<number, string> = {
      30: '1 Bulan',
      90: '3 Bulan',
      180: '6 Bulan',
      365: '1 Tahun',
    };
    return daysToLabel[durationDays] || `${durationDays} Hari`;
  }

  // ===========================================================================
  // Payment History (Task 3.6)
  // Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
  // ===========================================================================

  /**
   * Get payment history for a user with pagination
   * Returns transactions sorted by createdAt descending
   */
  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ transactions: PaymentHistoryItem[]; total: number; page: number; limit: number }> {
    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.paymentTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.paymentTransaction.count({
          where: { userId },
        }),
      ]);

      const formattedTransactions: PaymentHistoryItem[] = transactions.map((tx) => ({
        id: tx.id,
        orderId: tx.orderId,
        amount: tx.amount,
        paymentMethod: tx.paymentMethod,
        targetTier: tx.targetTier,
        status: tx.status,
        createdAt: tx.createdAt,
        paidAt: tx.paidAt,
      }));

      return {
        transactions: formattedTransactions,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to get payment history', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        transactions: [],
        total: 0,
        page,
        limit,
      };
    }
  }

  // ===========================================================================
  // Cancel Transaction (Task 3.7)
  // Requirements: 4.5
  // ===========================================================================

  /**
   * Cancel a pending payment transaction
   * Only allows cancellation of PENDING transactions belonging to the user
   */
  async cancelTransaction(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const transaction = await prisma.paymentTransaction.findFirst({
        where: {
          orderId,
          userId,
        },
      });

      if (!transaction) {
        return { success: false, message: 'Transaksi tidak ditemukan' };
      }

      if (transaction.status !== 'PENDING') {
        return { success: false, message: 'Hanya transaksi pending yang dapat dibatalkan' };
      }

      await prisma.paymentTransaction.update({
        where: { orderId },
        data: { status: 'CANCELLED' },
      });

      await auditLog(
        'payment_cancelled',
        'payment_transaction',
        orderId,
        { previousStatus: 'PENDING' },
        userId
      );

      logger.info('Payment transaction cancelled', { orderId, userId });

      return { success: true, message: 'Transaksi berhasil dibatalkan' };
    } catch (error) {
      logger.error('Failed to cancel transaction', {
        orderId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, message: 'Gagal membatalkan transaksi' };
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
