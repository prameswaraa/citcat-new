/**
 * Bulk Template Send Service
 * 
 * Handles bulk sending of template messages to multiple recipients.
 * Supports CSV data parsing, validation, batch processing, and progress tracking.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7
 */

import { prisma } from '../utils/database.js';
import WhatsAppAPI from '../utils/whatsapp.js';
import { templateRendererService, type WhatsAppTemplate, type WhatsAppTemplateComponent } from './template-renderer-service.js';
import { templateValidatorService } from './template-validator-service.js';
import { templateVariableService } from './template-variable-service.js';
import { WhatsAppErrorService } from './whatsapp-error-service.js';
import { logger } from '../utils/logger.js';
import { resolveCredentialsForSending, getWhatsAppAccountByPhoneNumberId, resolveCredentialsByPhoneNumber } from '../utils/whatsapp-account-helper.js';
import type { BulkSendStatus, TemplateVariable, TemplateVariableMapping } from '@prisma/client';

/**
 * Error codes for bulk send operations
 */
export const BULK_SEND_ERROR_CODES = {
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  INVALID_CSV: 'INVALID_CSV',
  MISSING_COLUMNS: 'MISSING_COLUMNS',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  MISSING_VARIABLE: 'MISSING_VARIABLE',
  JOB_ALREADY_PROCESSING: 'JOB_ALREADY_PROCESSING',
  JOB_CANNOT_CANCEL: 'JOB_CANNOT_CANCEL',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

/**
 * Batch size for processing recipients
 */
const BATCH_SIZE = 50;

/**
 * Rate limit delay between batches (ms)
 */
const BATCH_DELAY_MS = 1000;

/**
 * CSV row data structure
 */
export interface CsvRow {
  phoneNumber: string;
  [variableName: string]: string;
}

/**
 * CSV validation error
 */
export interface CsvValidationError {
  row: number;
  column?: string;
  error: string;
  errorCode: string;
}

/**
 * CSV validation result
 */
export interface CsvValidationResult {
  valid: boolean;
  errors: CsvValidationError[];
  totalRows: number;
  validRows: number;
}

/**
 * Bulk send creation DTO
 */
export interface CreateBulkSendDto {
  templateName: string;
  languageCode: string;
  csvData: CsvRow[];
  messageDelayMs?: number;
  senderPhoneNumberId?: string; // Selected sender phone number (multi-number support)
}

/**
 * Recipient send result
 */
export interface RecipientResult {
  phoneNumber: string;
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Bulk send job with results
 */
export interface BulkSendJob {
  id: string;
  userId: string;
  templateName: string;
  status: BulkSendStatus;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  csvData: CsvRow[];
  results: RecipientResult[] | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

/**
 * BulkTemplateSendService
 * 
 * Handles bulk template message sending with:
 * - Job creation and management
 * - CSV validation and parsing
 * - Batch processing with rate limiting
 * - Progress tracking
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7
 */
export class BulkTemplateSendService {
  // ============================================
  // Job Management (Requirements: 11.1, 11.6)
  // ============================================

  /**
   * Create a new bulk send job
   * 
   * @param userId - User ID
   * @param data - Bulk send creation data
   * @returns Created job
   * 
   * Requirements: 11.1
   */
  async createBulkSend(userId: string, data: CreateBulkSendDto): Promise<BulkSendJob & { messageDelayMs?: number }> {
    const job = await prisma.bulkTemplateSend.create({
      data: {
        userId,
        templateName: data.templateName,
        status: 'PENDING',
        totalRecipients: data.csvData.length,
        csvData: data.csvData as any,
        results: null,
      },
    });

    logger.info('Bulk send job created', {
      jobId: job.id,
      userId,
      templateName: data.templateName,
      totalRecipients: data.csvData.length,
      messageDelayMs: data.messageDelayMs,
    });

    return {
      ...this.mapToJob(job),
      messageDelayMs: data.messageDelayMs
    };
  }

  /**
   * Get phone numbers from customer IDs
   * Filters for consented and non-blacklisted customers only
   * 
   * @param userId - User ID
   * @param customerIds - Array of customer IDs
   * @returns Array of CsvRow with phone numbers
   * 
   * Requirements: 4.1, 6.1
   */
  async getPhoneNumbersFromCustomers(
    userId: string,
    customerIds: string[],
    variableValues: Record<string, string> = {}
  ): Promise<CsvRow[]> {
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        userId,
        consentStatus: true,
        blacklisted: false
      },
      select: {
        id: true,
        phoneNumber: true
      }
    });

    logger.info('Fetched eligible customers for broadcast', {
      userId,
      requestedCount: customerIds.length,
      eligibleCount: customers.length
    });

    return customers.map(customer => ({
      phoneNumber: customer.phoneNumber,
      ...variableValues
    }));
  }

  /**
   * Get bulk send job status
   * 
   * @param jobId - Job ID
   * @param userId - User ID for authorization
   * @returns Job status
   * 
   * Requirements: 11.6
   */
  async getBulkSendStatus(jobId: string, userId: string): Promise<BulkSendJob> {
    const job = await prisma.bulkTemplateSend.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new Error(BULK_SEND_ERROR_CODES.JOB_NOT_FOUND);
    }

    return this.mapToJob(job);
  }

  /**
   * Cancel a bulk send job
   * 
   * @param jobId - Job ID
   * @param userId - User ID for authorization
   * 
   * Requirements: 11.6
   */
  async cancelBulkSend(jobId: string, userId: string): Promise<void> {
    const job = await prisma.bulkTemplateSend.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new Error(BULK_SEND_ERROR_CODES.JOB_NOT_FOUND);
    }

    // Can only cancel PENDING or PROCESSING jobs
    if (job.status !== 'PENDING' && job.status !== 'PROCESSING') {
      throw new Error(BULK_SEND_ERROR_CODES.JOB_CANNOT_CANCEL);
    }

    await prisma.bulkTemplateSend.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    logger.info('Bulk send job cancelled', { jobId, userId });
  }

  /**
   * Get bulk send history for a user
   * 
   * @param userId - User ID
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Paginated job list
   */
  async getBulkSendHistory(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ data: BulkSendJob[]; total: number }> {
    const [jobs, total] = await Promise.all([
      prisma.bulkTemplateSend.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bulkTemplateSend.count({ where: { userId } }),
    ]);

    return {
      data: jobs.map(j => this.mapToJob(j)),
      total,
    };
  }

  // ============================================
  // CSV Validation (Requirements: 11.2, 11.3)
  // ============================================

  /**
   * Validate CSV data structure and content
   * 
   * @param csvData - Parsed CSV rows
   * @param requiredVariables - Required variable names from template mapping
   * @returns Validation result with errors
   * 
   * Requirements: 11.2, 11.3
   */
  validateCsvData(
    csvData: CsvRow[],
    requiredVariables: string[]
  ): CsvValidationResult {
    const errors: CsvValidationError[] = [];
    let validRows = 0;

    if (!csvData || csvData.length === 0) {
      return {
        valid: false,
        errors: [{
          row: 0,
          error: 'CSV data is empty',
          errorCode: BULK_SEND_ERROR_CODES.INVALID_CSV,
        }],
        totalRows: 0,
        validRows: 0,
      };
    }

    // Check for required columns
    const firstRow = csvData[0];
    const columns = Object.keys(firstRow);

    if (!columns.includes('phoneNumber')) {
      errors.push({
        row: 0,
        column: 'phoneNumber',
        error: 'Missing required column: phoneNumber',
        errorCode: BULK_SEND_ERROR_CODES.MISSING_COLUMNS,
      });
    }

    for (const varName of requiredVariables) {
      if (!columns.includes(varName)) {
        errors.push({
          row: 0,
          column: varName,
          error: `Missing required column: ${varName}`,
          errorCode: BULK_SEND_ERROR_CODES.MISSING_COLUMNS,
        });
      }
    }

    // If missing columns, return early
    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        totalRows: csvData.length,
        validRows: 0,
      };
    }

    // Validate each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 for 1-based index and header row
      let rowValid = true;

      // Validate phone number
      const phoneValidation = this.validatePhoneNumber(row.phoneNumber);
      if (!phoneValidation.valid) {
        errors.push({
          row: rowNumber,
          column: 'phoneNumber',
          error: phoneValidation.error!,
          errorCode: BULK_SEND_ERROR_CODES.INVALID_PHONE_NUMBER,
        });
        rowValid = false;
      }

      // Validate required variables are present
      for (const varName of requiredVariables) {
        const value = row[varName];
        if (!value || value.trim() === '') {
          errors.push({
            row: rowNumber,
            column: varName,
            error: `Missing value for variable: ${varName}`,
            errorCode: BULK_SEND_ERROR_CODES.MISSING_VARIABLE,
          });
          rowValid = false;
        }
      }

      if (rowValid) {
        validRows++;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      totalRows: csvData.length,
      validRows,
    };
  }

  /**
   * Validate phone number format
   * 
   * @param phoneNumber - Phone number to validate
   * @returns Validation result
   */
  validatePhoneNumber(phoneNumber: string): { valid: boolean; error?: string } {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return { valid: false, error: 'Phone number is required' };
    }

    // Remove spaces and dashes
    const cleaned = phoneNumber.replace(/[\s-]/g, '');

    // E.164 format: + followed by 1-15 digits
    const e164Pattern = /^\+?[1-9]\d{1,14}$/;

    if (!e164Pattern.test(cleaned)) {
      return {
        valid: false,
        error: `Invalid phone number format: ${phoneNumber}. Expected E.164 format (e.g., +628123456789)`,
      };
    }

    return { valid: true };
  }

  /**
   * Parse CSV string to array of rows
   * 
   * @param csvString - Raw CSV string
   * @returns Parsed rows
   */
  parseCsvString(csvString: string): CsvRow[] {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: CsvRow = { phoneNumber: '' };

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }

      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // ============================================
  // Bulk Send Processing (Requirements: 11.5, 11.6, 11.7)
  // ============================================

  /**
   * Process a bulk send job
   * 
   * @param jobId - Job ID to process
   * @param userId - User ID for authorization
   * @param messageDelayMs - Delay between messages in milliseconds
   * 
   * Requirements: 11.5, 11.6, 11.7
   */
  async processBulkSend(jobId: string, userId: string, messageDelayMs: number = 1000, senderPhoneNumberId?: string): Promise<void> {
    // Get job
    const job = await prisma.bulkTemplateSend.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new Error(BULK_SEND_ERROR_CODES.JOB_NOT_FOUND);
    }

    if (job.status === 'PROCESSING') {
      throw new Error(BULK_SEND_ERROR_CODES.JOB_ALREADY_PROCESSING);
    }

    if (job.status !== 'PENDING') {
      throw new Error(`Cannot process job with status: ${job.status}`);
    }

    // Resolve WhatsApp credentials: use specific phone number if provided
    let credentials = null;
    if (senderPhoneNumberId) {
      const phoneNumberRecord = await getWhatsAppAccountByPhoneNumberId(senderPhoneNumberId);
      if (phoneNumberRecord && phoneNumberRecord.userId === userId) {
        credentials = await resolveCredentialsByPhoneNumber(phoneNumberRecord);
      }
    }
    if (!credentials) {
      credentials = await resolveCredentialsForSending(userId);
    }

    if (!credentials) {
      throw new Error(BULK_SEND_ERROR_CODES.CONFIGURATION_ERROR);
    }

    // Get template from database (filter by account if known)
    const templateWhere: any = {
      userId,
      templateName: job.templateName,
      status: 'APPROVED',
    };
    if (credentials.whatsappAccountId) {
      templateWhere.whatsappAccountId = credentials.whatsappAccountId;
    }
    const dbTemplate = await prisma.messageTemplate.findFirst({
      where: templateWhere,
    });

    if (!dbTemplate) {
      await this.updateJobStatus(jobId, 'FAILED', [], 'Template not found or not approved');
      return;
    }

    // Get variable mappings
    const mappings = await templateVariableService.getMappings(userId, job.templateName);

    // Update status to processing
    await prisma.bulkTemplateSend.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    logger.info('Starting bulk send processing', {
      jobId,
      totalRecipients: job.totalRecipients,
    });

    // Process in batches
    const csvData = job.csvData as CsvRow[];
    const results: RecipientResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Create WhatsApp client using resolved credentials
    const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken });

    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      // Check if job was cancelled
      const currentJob = await prisma.bulkTemplateSend.findUnique({
        where: { id: jobId },
        select: { status: true },
      });

      if (currentJob?.status === 'CANCELLED') {
        logger.info('Bulk send job cancelled during processing', { jobId });
        break;
      }

      const batch = csvData.slice(i, i + BATCH_SIZE);

      // Process batch with delay between each message
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const result = await this.sendToRecipient(
          credentials.phoneNumberId,
          row,
          job.templateName,
          dbTemplate.language,
          dbTemplate,
          mappings,
          whatsapp,
          userId,
          jobId
        );

        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }

        // Delay between messages (user-configurable)
        if (messageDelayMs > 0 && (j < batch.length - 1 || i + BATCH_SIZE < csvData.length)) {
          await this.delay(messageDelayMs);
        }
      }

      // Update progress
      await prisma.bulkTemplateSend.update({
        where: { id: jobId },
        data: {
          successCount,
          failedCount,
          results: results as any,
        },
      });
    }

    // Final update
    const finalStatus = await prisma.bulkTemplateSend.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    // Only update to COMPLETED if not cancelled
    if (finalStatus?.status !== 'CANCELLED') {
      await prisma.bulkTemplateSend.update({
        where: { id: jobId },
        data: {
          status: failedCount === csvData.length ? 'FAILED' : 'COMPLETED',
          successCount,
          failedCount,
          results: results as any,
          completedAt: new Date(),
        },
      });
    }

    logger.info('Bulk send processing completed', {
      jobId,
      successCount,
      failedCount,
      totalRecipients: csvData.length,
    });
  }

  /**
   * Send template to a single recipient
   * Now also saves the message to database so it appears in inbox
   */
  private async sendToRecipient(
    phoneNumberId: string,
    row: CsvRow,
    templateName: string,
    languageCode: string,
    dbTemplate: any,
    mappings: (TemplateVariableMapping & { variable: TemplateVariable })[],
    whatsapp: any,
    userId: string,
    bulkSendJobId: string
  ): Promise<RecipientResult> {
    try {
      // Clean phone number
      const phoneNumber = row.phoneNumber.replace(/[\s-]/g, '');

      // Log incoming row data for debugging
      logger.info('sendToRecipient called', {
        phoneNumber,
        templateName,
        rowKeys: Object.keys(row),
        rowData: JSON.stringify(row),
        mappingsCount: mappings.length
      });

      // Extract variable values from row (keys like "1", "2", "3" for {{1}}, {{2}}, {{3}})
      // This handles direct variable input from frontend without needing database mappings
      const variableKeys = Object.keys(row).filter(k => k !== 'phoneNumber' && /^\d+$/.test(k));
      
      logger.info('Variable keys extracted', {
        phoneNumber,
        variableKeys,
        hasVariables: variableKeys.length > 0
      });
      
      // Build components directly if we have variable values
      let components: any[] = [];
      
      if (variableKeys.length > 0) {
        // Sort keys numerically to ensure correct parameter order
        const sortedKeys = variableKeys.sort((a, b) => parseInt(a) - parseInt(b));
        
        // Build body parameters
        const bodyParameters = sortedKeys.map(key => ({
          type: "text",
          text: row[key]?.trim() || ''
        }));
        
        if (bodyParameters.length > 0) {
          components.push({
            type: "body",
            parameters: bodyParameters
          });
        }
        
        logger.debug('Built template components from row variables', {
          phoneNumber,
          variableKeys: sortedKeys,
          parametersCount: bodyParameters.length
        });
      } else if (mappings.length > 0) {
        // Fallback to using mappings if no direct variables in row
        const variableValues: Record<string, string> = {};
        
        for (const mapping of mappings) {
          const varName = mapping.variable.name;
          if (row[varName]) {
            variableValues[mapping.variableId] = row[varName];
          }
        }

        // Convert DB template to WhatsAppTemplate format
        const template = this.dbTemplateToWhatsAppTemplate(dbTemplate);

        // Build payload using renderer service
        const payload = templateRendererService.buildTemplatePayload(
          templateName,
          languageCode,
          template,
          variableValues,
          mappings
        );
        
        components = payload.components;
      }

      // Build final template payload
      const templatePayload: any = {
        name: templateName,
        language: { code: languageCode },
      };
      
      if (components.length > 0) {
        templatePayload.components = components;
      }

      logger.debug('Sending template message', {
        phoneNumber,
        templateName,
        componentsCount: components.length,
        payload: JSON.stringify(templatePayload)
      });

      // Send message
      const result = await whatsapp.sendMessage({
        phoneNumberId,
        to: phoneNumber,
        type: 'template',
        template: templatePayload,
      });

      const wamId = result.messages?.[0]?.id;

      // Save message to database so it appears in inbox
      // Get or create customer for this phone number + business number pair
      const phoneNumberRecord = await prisma.phoneNumber.findUnique({
        where: { phoneNumberId }
      })

      let customer = await prisma.customer.findFirst({
        where: {
          userId,
          phoneNumber,
          whatsappPhoneNumberId: phoneNumberRecord?.id || null,
        },
      })

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId,
            phoneNumber,
            consentStatus: true, // They're receiving broadcast, assume consent
            whatsappPhoneNumberId: phoneNumberRecord?.id || null,
          },
        })
      }

      // Render template content for storage
      let renderedContent = dbTemplate.content || '';
      
      // Replace variables with actual values from row
      const renderVarKeys = Object.keys(row).filter(k => k !== 'phoneNumber' && /^\d+$/.test(k));
      const renderSortedKeys = renderVarKeys.sort((a, b) => parseInt(a) - parseInt(b));
      
      for (const key of renderSortedKeys) {
        const value = row[key]?.trim() || '';
        renderedContent = renderedContent.replace(`{{${key}}}`, value);
      }

      // Add header and footer if present
      if (dbTemplate.headerType === 'TEXT' && dbTemplate.headerContent) {
        renderedContent = `${dbTemplate.headerContent}\n\n${renderedContent}`;
      }
      if (dbTemplate.footerContent) {
        renderedContent = `${renderedContent}\n\n${dbTemplate.footerContent}`;
      }

      // Create message record with PENDING status
      // Status will be updated to SENT/DELIVERED/FAILED via webhook from Meta
      await prisma.message.create({
        data: {
          userId,
          customerId: customer.id,
          messageType: 'TEMPLATE',
          direction: 'OUTBOUND',
          content: renderedContent,
          wamId,
          status: 'PENDING',
          source: 'API', // Broadcast messages are sent via API
          templateId: dbTemplate.id,
          bulkSendJobId, // Link to broadcast job for delivery tracking
          whatsappPhoneNumberId: phoneNumberRecord?.id || null, // Track which business number sent this
        },
      });

      logger.debug('Broadcast message saved to database', {
        phoneNumber,
        customerId: customer.id,
        wamId,
      });

      return {
        phoneNumber: row.phoneNumber,
        success: true,
        messageId: wamId,
      };
    } catch (error: any) {
      // Use WhatsAppErrorService for consistent error handling (Requirement 7.1)
      const metaError = error.response?.data || error;
      const errorResponse = WhatsAppErrorService.formatErrorResponse(metaError);
      const errorCode = errorResponse.error.code;
      
      logger.error('Failed to send to recipient', {
        phoneNumber: row.phoneNumber,
        error: errorResponse.error.details?.originalMessage || error.message,
        errorCode,
        category: errorResponse.error.category,
        retryable: errorResponse.error.retryable,
        response: error.response?.data
      });

      return {
        phoneNumber: row.phoneNumber,
        success: false,
        error: errorResponse.error.message,
        errorCode: errorCode?.toString(),
      };
    }
  }

  /**
   * Convert DB template to WhatsAppTemplate format
   */
  private dbTemplateToWhatsAppTemplate(dbTemplate: any): WhatsAppTemplate {
    const components: WhatsAppTemplateComponent[] = [];

    if (dbTemplate.headerType && dbTemplate.headerContent) {
      components.push({
        type: 'HEADER',
        format: dbTemplate.headerType.toUpperCase(),
        text: dbTemplate.headerType.toUpperCase() === 'TEXT' ? dbTemplate.headerContent : undefined,
      });
    }

    components.push({
      type: 'BODY',
      text: dbTemplate.content,
    });

    if (dbTemplate.footerContent) {
      components.push({
        type: 'FOOTER',
        text: dbTemplate.footerContent,
      });
    }

    if (dbTemplate.buttons && Array.isArray(dbTemplate.buttons) && dbTemplate.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: dbTemplate.buttons,
      });
    }

    return {
      id: dbTemplate.id,
      name: dbTemplate.templateName,
      language: dbTemplate.language,
      status: dbTemplate.status,
      category: dbTemplate.category,
      components,
    };
  }

  /**
   * Update job status with error message
   */
  private async updateJobStatus(
    jobId: string,
    status: BulkSendStatus,
    results: RecipientResult[],
    errorMessage?: string
  ): Promise<void> {
    await prisma.bulkTemplateSend.update({
      where: { id: jobId },
      data: {
        status,
        results: results as any,
        completedAt: new Date(),
      },
    });

    if (errorMessage) {
      logger.error('Bulk send job failed', { jobId, error: errorMessage });
    }
  }

  /**
   * Map Prisma model to BulkSendJob interface
   */
  private mapToJob(job: any): BulkSendJob {
    return {
      id: job.id,
      userId: job.userId,
      templateName: job.templateName,
      status: job.status,
      totalRecipients: job.totalRecipients,
      successCount: job.successCount,
      failedCount: job.failedCount,
      csvData: job.csvData as CsvRow[],
      results: job.results as RecipientResult[] | null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const bulkTemplateSendService = new BulkTemplateSendService();
