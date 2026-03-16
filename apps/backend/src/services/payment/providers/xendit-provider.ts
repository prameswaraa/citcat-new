/**
 * XenditProvider
 * 
 * Payment provider implementation for Xendit payment gateway.
 * Uses Invoice API (Payment Links) for simplified payment processing.
 * Xendit handles all payment methods (VA, QRIS, E-Wallet, etc.) in one hosted page.
 * 
 * Benefits of Invoice API:
 * - Single integration for all payment methods
 * - Xendit-hosted checkout page
 * - Automatic payment method selection by customer
 * - Simplified callback handling
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.4
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../../../utils/logger.js';
import { adminSettingsService } from '../../admin/settings-service.js';
import type {
  PaymentProvider,
  PaymentMethod,
  CreatePaymentParams,
  CreatePaymentResult,
  CheckStatusResult,
  CallbackValidationResult,
  ProviderHealthResult,
  PaymentStatus,
} from '../types.js';

// =============================================================================
// Xendit Configuration Types
// =============================================================================

/**
 * Xendit settings from admin settings
 */
export interface XenditSettings {
  enabled: boolean;
  secretKey: string;
  publicKey: string;
  webhookToken: string;
  environment: 'sandbox' | 'production';
}

/**
 * Xendit Invoice API response
 * Used for creating payment links
 */
interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  user_id: string;
  status: string;
  merchant_name: string;
  amount: number;
  description: string;
  expiry_date: string;
  invoice_url: string;
  currency: string;
  created: string;
  updated: string;
}

/**
 * Xendit Invoice callback payload
 * Sent when payment is completed via Invoice/Payment Link
 */
interface XenditInvoiceCallback {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PAID' | 'EXPIRED' | 'PENDING' | 'SETTLED';
  merchant_name: string;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payer_email?: string;
  description: string;
  currency: string;
  payment_method?: string;
  payment_channel?: string;
  payment_destination?: string;
  created: string;
  updated: string;
}

// =============================================================================
// Error Mapping
// =============================================================================

/**
 * Xendit error code to user-friendly message mapping
 * Requirements: 4.5
 */
export const XENDIT_ERROR_MAP: Record<string, string> = {
  'API_VALIDATION_ERROR': 'Data pembayaran tidak valid',
  'INVALID_API_KEY': 'Konfigurasi payment gateway tidak valid',
  'REQUEST_FORBIDDEN_ERROR': 'Akses ditolak oleh payment gateway',
  'CHANNEL_NOT_ACTIVATED': 'Metode pembayaran tidak tersedia',
  'INSUFFICIENT_BALANCE': 'Saldo merchant tidak mencukupi',
  'DUPLICATE_ERROR': 'Transaksi dengan ID ini sudah ada',
  'INVALID_AMOUNT': 'Jumlah pembayaran tidak valid',
  'MINIMUM_AMOUNT_ERROR': 'Jumlah pembayaran di bawah minimum',
  'MAXIMUM_AMOUNT_ERROR': 'Jumlah pembayaran melebihi maksimum',
  'SERVER_ERROR': 'Terjadi kesalahan pada server payment gateway',
  'INVOICE_NOT_FOUND_ERROR': 'Invoice tidak ditemukan',
};

/**
 * Map Xendit error code to user-friendly message
 */
function mapXenditError(errorCode: string, defaultMessage: string): string {
  return XENDIT_ERROR_MAP[errorCode] || defaultMessage;
}

/**
 * Map Xendit Invoice status to standard PaymentStatus
 */
function mapXenditInvoiceStatus(xenditStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    'PENDING': 'PENDING',
    'PAID': 'SUCCESS',
    'SETTLED': 'SUCCESS',
    'EXPIRED': 'EXPIRED',
  };
  return statusMap[xenditStatus.toUpperCase()] || 'PENDING';
}

// =============================================================================
// XenditProvider Class
// =============================================================================

/**
 * XenditProvider
 * 
 * Implements the PaymentProvider interface for Xendit payment gateway.
 * Uses Invoice API for all payment methods - Xendit handles the UI.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export class XenditProvider implements PaymentProvider {
  /**
   * Unique identifier for this provider
   */
  readonly providerId = 'xendit';

  /**
   * Human-readable display name for UI
   */
  readonly displayName = 'Xendit';

  /**
   * Xendit API base URL (same for sandbox and production, differentiated by API key)
   */
  private readonly API_URL = 'https://api.xendit.co';

  /**
   * Get list of payment methods supported by Xendit Invoice
   * Note: With Invoice API, Xendit handles all methods automatically
   * 
   * Requirements: 4.1, 4.2, 4.3
   */
  getPaymentMethods(): PaymentMethod[] {
    // Invoice API supports all methods, but we list main ones for compatibility
    return ['QRIS', 'VA_BCA', 'VA_BNI', 'VA_MANDIRI', 'VA_PERMATA', 'EWALLET'];
  }

  /**
   * Get Xendit configuration from admin settings
   */
  async getConfig(): Promise<XenditSettings> {
    try {
      const category = 'xendit' as Parameters<typeof adminSettingsService.getRawValue>[0];
      
      const enabled = await adminSettingsService.getRawValue(category, 'enabled');
      const secretKey = await adminSettingsService.getRawValue(category, 'secret_key');
      const publicKey = await adminSettingsService.getRawValue(category, 'public_key');
      const webhookToken = await adminSettingsService.getRawValue(category, 'webhook_token');
      const environment = await adminSettingsService.getRawValue(category, 'environment');

      return {
        enabled: enabled === 'true',
        secretKey: secretKey || '',
        publicKey: publicKey || '',
        webhookToken: webhookToken || '',
        environment: (environment as 'sandbox' | 'production') || 'sandbox',
      };
    } catch (error) {
      logger.error('Failed to get Xendit config', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        enabled: false,
        secretKey: '',
        publicKey: '',
        webhookToken: '',
        environment: 'sandbox',
      };
    }
  }

  /**
   * Create authorization header for Xendit API
   */
  private getAuthHeader(secretKey: string): string {
    return `Basic ${Buffer.from(secretKey + ':').toString('base64')}`;
  }

  /**
   * Check if Xendit is properly configured and enabled
   * 
   * Requirements: 4.1
   */
  async isConfigured(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      return !!(config.enabled && config.secretKey);
    } catch {
      return false;
    }
  }

  /**
   * Create a new payment transaction via Xendit Invoice API
   * Creates a payment link that supports all payment methods
   * 
   * Requirements: 4.1, 4.2, 4.3
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    logger.info('XenditProvider.createPayment called', {
      orderId: params.orderId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      productDetails: params.productDetails,
    });

    try {
      const config = await this.getConfig();

      if (!config.enabled) {
        return {
          success: false,
          error: 'Xendit payment gateway is disabled',
          errorCode: 'PAYMENT_DISABLED',
        };
      }

      if (!config.secretKey) {
        return {
          success: false,
          error: 'Xendit is not configured',
          errorCode: 'PAYMENT_NOT_CONFIGURED',
        };
      }

      // Calculate expiry (default 24 hours = 86400 seconds)
      const invoiceDuration = (params.expiryMinutes || 1440) * 60;

      // Create Invoice via Xendit API
      const response = await axios.post<XenditInvoiceResponse>(
        `${this.API_URL}/v2/invoices`,
        {
          external_id: params.orderId,
          amount: params.amount,
          description: params.productDetails,
          invoice_duration: invoiceDuration,
          customer: {
            given_names: params.customerName,
            email: params.customerEmail,
          },
          success_redirect_url: params.returnUrl,
          failure_redirect_url: params.returnUrl,
          currency: 'IDR',
          // Let Xendit show all available payment methods
          // Customer can choose their preferred method
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(config.secretKey),
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      logger.info('Xendit Invoice created successfully', {
        orderId: params.orderId,
        invoiceId: data.id,
        invoiceUrl: data.invoice_url,
        expiryDate: data.expiry_date,
      });

      return {
        success: true,
        referenceNo: data.id,
        paymentUrl: data.invoice_url,
        expiresAt: new Date(data.expiry_date),
      };
    } catch (error) {
      return this.handleXenditError(error, 'Invoice creation');
    }
  }

  /**
   * Handle Xendit API errors
   * 
   * Requirements: 4.5
   */
  private handleXenditError(error: unknown, operation: string): CreatePaymentResult {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error_code?: string; message?: string }>;
      const errorCode = axiosError.response?.data?.error_code || 'UNKNOWN_ERROR';
      const errorMessage = axiosError.response?.data?.message || axiosError.message;

      logger.error(`Xendit ${operation} failed`, {
        errorCode,
        errorMessage,
        status: axiosError.response?.status,
      });

      return {
        success: false,
        error: mapXenditError(errorCode, errorMessage),
        errorCode,
      };
    }

    logger.error(`Xendit ${operation} failed with unknown error`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  /**
   * Check the status of an existing invoice
   * 
   * Requirements: 4.1
   */
  async checkStatus(orderId: string, referenceNo?: string): Promise<CheckStatusResult> {
    logger.debug('XenditProvider.checkStatus called', { orderId, referenceNo });

    try {
      const config = await this.getConfig();

      if (!config.enabled) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Xendit payment gateway is disabled',
        };
      }

      // If we have invoice ID (referenceNo), use direct lookup
      if (referenceNo) {
        try {
          const response = await axios.get<XenditInvoiceResponse>(
            `${this.API_URL}/v2/invoices/${referenceNo}`,
            {
              headers: {
                'Authorization': this.getAuthHeader(config.secretKey),
              },
              timeout: 15000,
            }
          );

          logger.debug('XenditProvider.checkStatus: Invoice found', {
            orderId,
            referenceNo,
            status: response.data.status,
          });

          return {
            success: true,
            status: mapXenditInvoiceStatus(response.data.status),
            amount: response.data.amount,
          };
        } catch (invoiceError) {
          logger.debug('XenditProvider.checkStatus: Invoice lookup failed', {
            orderId,
            referenceNo,
            error: invoiceError instanceof Error ? invoiceError.message : 'Unknown',
          });
        }
      }

      // Fallback: Search by external_id
      try {
        const response = await axios.get<XenditInvoiceResponse[]>(
          `${this.API_URL}/v2/invoices?external_id=${orderId}`,
          {
            headers: {
              'Authorization': this.getAuthHeader(config.secretKey),
            },
            timeout: 15000,
          }
        );

        if (Array.isArray(response.data) && response.data.length > 0) {
          const invoice = response.data[0];
          logger.debug('XenditProvider.checkStatus: Invoice found by external_id', {
            orderId,
            status: invoice.status,
          });

          return {
            success: true,
            status: mapXenditInvoiceStatus(invoice.status),
            amount: invoice.amount,
          };
        }
      } catch (searchError) {
        logger.debug('XenditProvider.checkStatus: Invoice search failed', {
          orderId,
          error: searchError instanceof Error ? searchError.message : 'Unknown',
        });
      }

      // Invoice not found - return PENDING to avoid false negatives
      logger.warn('XenditProvider.checkStatus: Invoice not found', { orderId, referenceNo });
      return {
        success: true,
        status: 'PENDING',
        error: 'Invoice status pending verification',
      };
    } catch (error) {
      logger.error('XenditProvider.checkStatus error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
        referenceNo,
      });

      return {
        success: true,
        status: 'PENDING',
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }

  /**
   * Validate and parse a webhook callback from Xendit
   * Handles Invoice callback format
   * 
   * Requirements: 4.4, 4.5
   */
  async validateCallback(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<CallbackValidationResult> {
    logger.debug('XenditProvider.validateCallback called', {
      hasPayload: !!payload,
      headerKeys: Object.keys(headers),
      payloadKeys: payload ? Object.keys(payload as object) : [],
    });

    try {
      const config = await this.getConfig();

      // Validate webhook token from header
      const webhookToken = headers['x-callback-token'] || headers['X-Callback-Token'];
      
      if (!webhookToken) {
        logger.warn('XenditProvider.validateCallback: Missing webhook token');
        return {
          valid: false,
          error: 'Missing webhook token in headers',
        };
      }

      if (webhookToken !== config.webhookToken) {
        logger.warn('XenditProvider.validateCallback: Token mismatch');
        return {
          valid: false,
          error: 'Invalid webhook token',
        };
      }

      // Parse the callback payload
      const callbackData = payload as Record<string, unknown>;

      // Check if this is an Invoice callback
      if (this.isInvoiceCallback(callbackData)) {
        logger.debug('XenditProvider.validateCallback: Detected Invoice callback');
        return this.parseInvoiceCallback(callbackData as unknown as XenditInvoiceCallback);
      }

      logger.warn('XenditProvider.validateCallback: Unknown callback format', {
        payloadKeys: Object.keys(callbackData),
        status: callbackData.status,
      });

      // For unknown formats, try to extract basic info if available
      if (callbackData.external_id && callbackData.status) {
        const status = mapXenditInvoiceStatus(callbackData.status as string);
        return {
          valid: true,
          orderId: callbackData.external_id as string,
          status,
          amount: (callbackData.amount || callbackData.paid_amount) as number,
        };
      }

      return {
        valid: false,
        error: 'Unknown callback format',
      };
    } catch (error) {
      logger.error('XenditProvider.validateCallback error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Callback validation failed',
      };
    }
  }

  /**
   * Check if callback is an Invoice callback
   * Invoice callbacks have: id, external_id, status, amount
   */
  private isInvoiceCallback(payload: Record<string, unknown>): boolean {
    return (
      payload.id !== undefined &&
      payload.external_id !== undefined &&
      payload.status !== undefined &&
      (payload.amount !== undefined || payload.paid_amount !== undefined)
    );
  }

  /**
   * Parse Invoice callback
   */
  private parseInvoiceCallback(callback: XenditInvoiceCallback): CallbackValidationResult {
    const status = mapXenditInvoiceStatus(callback.status);
    const amount = callback.paid_amount || callback.amount;

    logger.info('XenditProvider: Invoice callback parsed', {
      invoiceId: callback.id,
      externalId: callback.external_id,
      status: callback.status,
      mappedStatus: status,
      amount,
      paymentMethod: callback.payment_method,
      paymentChannel: callback.payment_channel,
    });

    return {
      valid: true,
      orderId: callback.external_id,
      status,
      amount,
    };
  }

  /**
   * Perform a health check on the Xendit provider
   * 
   * Requirements: 8.1, 8.2, 8.4
   */
  async healthCheck(): Promise<ProviderHealthResult> {
    const lastChecked = new Date();

    try {
      const config = await this.getConfig();

      if (!config.enabled) {
        return {
          status: 'unhealthy',
          message: 'Xendit is disabled in settings',
          lastChecked,
        };
      }

      if (!config.secretKey) {
        return {
          status: 'unhealthy',
          message: 'Xendit credentials are not configured',
          lastChecked,
        };
      }

      // Verify API key by making a simple API call
      try {
        await axios.get(`${this.API_URL}/balance`, {
          headers: {
            'Authorization': this.getAuthHeader(config.secretKey),
          },
          timeout: 10000,
        });

        return {
          status: 'healthy',
          message: `Xendit is configured (${config.environment} environment)`,
          lastChecked,
        };
      } catch (apiError) {
        if (axios.isAxiosError(apiError)) {
          const status = apiError.response?.status;
          
          if (status === 401) {
            return {
              status: 'unhealthy',
              message: 'Xendit API key is invalid',
              lastChecked,
            };
          }
          
          if (status === 403) {
            // 403 on balance endpoint is OK - key works but no balance permission
            // This is fine for Invoice API
            return {
              status: 'healthy',
              message: `Xendit is configured (${config.environment} environment)`,
              lastChecked,
            };
          }
          
          return {
            status: 'degraded',
            message: `Xendit API returned error: ${apiError.message}`,
            lastChecked,
          };
        }
        throw apiError;
      }
    } catch (error) {
      logger.error('XenditProvider.healthCheck error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Health check failed',
        lastChecked,
      };
    }
  }
}

// Export singleton instance
export const xenditProvider = new XenditProvider();
