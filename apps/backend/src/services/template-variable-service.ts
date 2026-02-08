import { prisma } from '../utils/database.js';
import type { VariableType, TemplateVariable, TemplateVariableMapping, TemplateVariableHistory } from '@prisma/client';
import { templateCacheService } from './template-cache-service.js';

/**
 * DTOs for Template Variable operations
 */
export interface CreateVariableDto {
  name: string;
  type: VariableType;
  description?: string;
  exampleValue?: string;
}

export interface UpdateVariableDto {
  name?: string;
  type?: VariableType;
  description?: string;
  exampleValue?: string;
}

export interface CreateMappingDto {
  templateName: string;
  componentType: string;
  componentIndex: number;
  parameterIndex: number;
  variableId: string;
}

export interface VariableHistoryDto {
  templateName: string;
  variableId: string;
  value: string;
  customerId?: string;
}

/**
 * Variable with usage information
 */
export interface VariableWithUsage extends TemplateVariable {
  templateMappings?: {
    templateName: string;
  }[];
}

/**
 * Error codes for template variable operations
 */
export const TEMPLATE_VARIABLE_ERRORS = {
  VARIABLE_NAME_EXISTS: 'Variable name already exists',
  VARIABLE_NOT_FOUND: 'Variable not found',
  VARIABLE_IN_USE: 'Variable is being used in templates',
  INVALID_VARIABLE_TYPE: 'Invalid variable type',
  MAPPING_NOT_FOUND: 'Variable mapping not found',
  DUPLICATE_MAPPING: 'Mapping already exists for this position',
} as const;


/**
 * TemplateVariableService
 * 
 * Handles template variable management including CRUD operations,
 * variable mappings, and usage history tracking.
 * 
 * Requirements: 8.3, 8.4, 8.5, 8.6, 9.6, 5.1, 5.2, 5.3, 5.4
 */
export class TemplateVariableService {
  // ============================================
  // CRUD Operations (Requirements: 8.3, 8.4, 8.5, 8.6)
  // ============================================

  /**
   * Create a new template variable
   * 
   * @param userId - The user's ID
   * @param data - Variable creation data
   * @returns Created variable
   * @throws Error if variable name already exists for user
   * Requirements: 8.3, 8.4
   */
  async createVariable(userId: string, data: CreateVariableDto): Promise<TemplateVariable> {
    // Check for duplicate name
    const existing = await prisma.templateVariable.findUnique({
      where: {
        userId_name: {
          userId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new Error(TEMPLATE_VARIABLE_ERRORS.VARIABLE_NAME_EXISTS);
    }

    const variable = await prisma.templateVariable.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        description: data.description,
        exampleValue: data.exampleValue,
      },
    });

    // Invalidate variable list cache
    await templateCacheService.invalidateVariableList(userId);

    return variable;
  }

  /**
   * Update an existing template variable
   * 
   * @param id - Variable ID
   * @param userId - The user's ID (for authorization)
   * @param data - Variable update data
   * @returns Updated variable
   * @throws Error if variable not found or name conflict
   * Requirements: 8.6
   */
  async updateVariable(id: string, userId: string, data: UpdateVariableDto): Promise<TemplateVariable> {
    // Verify ownership
    const variable = await prisma.templateVariable.findFirst({
      where: { id, userId },
    });

    if (!variable) {
      throw new Error(TEMPLATE_VARIABLE_ERRORS.VARIABLE_NOT_FOUND);
    }

    // Check for name conflict if name is being updated
    if (data.name && data.name !== variable.name) {
      const existing = await prisma.templateVariable.findUnique({
        where: {
          userId_name: {
            userId,
            name: data.name,
          },
        },
      });

      if (existing) {
        throw new Error(TEMPLATE_VARIABLE_ERRORS.VARIABLE_NAME_EXISTS);
      }
    }

    const updatedVariable = await prisma.templateVariable.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        exampleValue: data.exampleValue,
      },
    });

    // Invalidate caches
    await templateCacheService.invalidateVariableList(userId);
    // Also invalidate all mappings since variable data may have changed
    await templateCacheService.invalidateAllVariableMappings(userId);

    return updatedVariable;
  }

  /**
   * Delete a template variable
   * 
   * @param id - Variable ID
   * @param userId - The user's ID (for authorization)
   * @throws Error if variable not found
   * Requirements: 8.7
   */
  async deleteVariable(id: string, userId: string): Promise<void> {
    // Verify ownership
    const variable = await prisma.templateVariable.findFirst({
      where: { id, userId },
    });

    if (!variable) {
      throw new Error(TEMPLATE_VARIABLE_ERRORS.VARIABLE_NOT_FOUND);
    }

    // Delete variable (cascade will handle mappings)
    await prisma.templateVariable.delete({
      where: { id },
    });

    // Invalidate caches
    await templateCacheService.invalidateVariableList(userId);
    // Also invalidate all mappings since this variable may have been used
    await templateCacheService.invalidateAllVariableMappings(userId);
  }

  /**
   * Get all variables for a user
   * 
   * @param userId - The user's ID
   * @returns Array of variables with usage count
   * Requirements: 8.2, 8.5
   */
  async getVariables(userId: string): Promise<TemplateVariable[]> {
    // Try to get from cache first
    const cached = await templateCacheService.getVariableList<TemplateVariable[]>(userId);
    if (cached) {
      return cached;
    }

    const variables = await prisma.templateVariable.findMany({
      where: { userId },
      orderBy: [
        { usageCount: 'desc' },
        { name: 'asc' },
      ],
    });

    // Cache the result
    await templateCacheService.setVariableList(userId, variables);

    return variables;
  }

  /**
   * Get a single variable by ID
   * 
   * @param id - Variable ID
   * @param userId - The user's ID (for authorization)
   * @returns Variable or null
   */
  async getVariableById(id: string, userId: string): Promise<TemplateVariable | null> {
    return prisma.templateVariable.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Get variable with usage information (templates using it)
   * 
   * @param id - Variable ID
   * @param userId - The user's ID (for authorization)
   * @returns Variable with template mappings
   * Requirements: 8.7
   */
  async getVariableWithUsage(id: string, userId: string): Promise<VariableWithUsage | null> {
    return prisma.templateVariable.findFirst({
      where: { id, userId },
      include: {
        templateMappings: {
          select: {
            templateName: true,
          },
          distinct: ['templateName'],
        },
      },
    });
  }

  /**
   * Increment usage count for a variable
   * Called when a template is sent using this variable
   * 
   * @param variableId - Variable ID
   * Requirements: 8.5
   */
  async incrementUsageCount(variableId: string): Promise<void> {
    await prisma.templateVariable.update({
      where: { id: variableId },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }


  // ============================================
  // Variable Mapping Operations (Requirements: 9.6)
  // ============================================

  /**
   * Create a variable mapping for a template position
   * 
   * @param userId - The user's ID
   * @param data - Mapping creation data
   * @returns Created mapping
   * @throws Error if mapping already exists or variable not found
   * Requirements: 9.6
   */
  async createMapping(userId: string, data: CreateMappingDto): Promise<TemplateVariableMapping> {
    // Verify variable exists and belongs to user
    const variable = await prisma.templateVariable.findFirst({
      where: { id: data.variableId, userId },
    });

    if (!variable) {
      throw new Error(TEMPLATE_VARIABLE_ERRORS.VARIABLE_NOT_FOUND);
    }

    // Check for duplicate mapping
    const existing = await prisma.templateVariableMapping.findUnique({
      where: {
        userId_templateName_componentType_componentIndex_parameterIndex: {
          userId,
          templateName: data.templateName,
          componentType: data.componentType,
          componentIndex: data.componentIndex,
          parameterIndex: data.parameterIndex,
        },
      },
    });

    if (existing) {
      throw new Error(TEMPLATE_VARIABLE_ERRORS.DUPLICATE_MAPPING);
    }

    const mapping = await prisma.templateVariableMapping.create({
      data: {
        userId,
        templateName: data.templateName,
        componentType: data.componentType,
        componentIndex: data.componentIndex,
        parameterIndex: data.parameterIndex,
        variableId: data.variableId,
      },
    });

    // Invalidate mappings cache for this template
    await templateCacheService.invalidateVariableMappings(userId, data.templateName);

    return mapping;
  }

  /**
   * Create or update multiple mappings for a template
   * Replaces all existing mappings for the template
   * 
   * @param userId - The user's ID
   * @param templateName - WhatsApp template name
   * @param mappings - Array of mapping data
   * @returns Created mappings
   * Requirements: 9.6
   */
  async saveMappings(
    userId: string,
    templateName: string,
    mappings: Omit<CreateMappingDto, 'templateName'>[]
  ): Promise<TemplateVariableMapping[]> {
    // Verify all variables exist and belong to user
    const variableIds = Array.from(new Set(mappings.map(m => m.variableId)));
    const variables = await prisma.templateVariable.findMany({
      where: {
        id: { in: variableIds },
        userId,
      },
    });

    if (variables.length !== variableIds.length) {
      throw new Error(TEMPLATE_VARIABLE_ERRORS.VARIABLE_NOT_FOUND);
    }

    // Delete existing mappings and create new ones in a transaction
    const createdMappings = await prisma.$transaction(async (tx) => {
      // Delete existing mappings for this template
      await tx.templateVariableMapping.deleteMany({
        where: { userId, templateName },
      });

      // Create new mappings
      const mappingsResult: TemplateVariableMapping[] = [];
      for (const mapping of mappings) {
        const created = await tx.templateVariableMapping.create({
          data: {
            userId,
            templateName,
            componentType: mapping.componentType,
            componentIndex: mapping.componentIndex,
            parameterIndex: mapping.parameterIndex,
            variableId: mapping.variableId,
          },
        });
        mappingsResult.push(created);
      }

      return mappingsResult;
    });

    // Invalidate mappings cache for this template
    await templateCacheService.invalidateVariableMappings(userId, templateName);

    return createdMappings;
  }

  /**
   * Get all mappings for a template
   * 
   * @param userId - The user's ID
   * @param templateName - WhatsApp template name
   * @returns Array of mappings with variable details
   * Requirements: 9.6
   */
  async getMappings(userId: string, templateName: string): Promise<(TemplateVariableMapping & {
    variable: TemplateVariable;
  })[]> {
    // Try to get from cache first
    type MappingWithVariable = TemplateVariableMapping & { variable: TemplateVariable };
    const cached = await templateCacheService.getVariableMappings<MappingWithVariable[]>(userId, templateName);
    if (cached) {
      return cached;
    }

    const mappings = await prisma.templateVariableMapping.findMany({
      where: { userId, templateName },
      include: {
        variable: true,
      },
      orderBy: [
        { componentType: 'asc' },
        { componentIndex: 'asc' },
        { parameterIndex: 'asc' },
      ],
    });

    // Cache the result
    await templateCacheService.setVariableMappings(userId, templateName, mappings);

    return mappings;
  }

  /**
   * Delete all mappings for a template
   * 
   * @param userId - The user's ID
   * @param templateName - WhatsApp template name
   * Requirements: 9.6
   */
  async deleteMappings(userId: string, templateName: string): Promise<void> {
    await prisma.templateVariableMapping.deleteMany({
      where: { userId, templateName },
    });

    // Invalidate mappings cache for this template
    await templateCacheService.invalidateVariableMappings(userId, templateName);
  }


  // ============================================
  // Variable History Tracking (Requirements: 5.1, 5.2, 5.3, 5.4)
  // ============================================

  /**
   * Save variable usage history when template is sent
   * 
   * @param userId - The user's ID
   * @param data - History entry data
   * Requirements: 5.1
   */
  async saveVariableHistory(userId: string, data: VariableHistoryDto): Promise<TemplateVariableHistory> {
    return prisma.templateVariableHistory.create({
      data: {
        userId,
        templateName: data.templateName,
        variableId: data.variableId,
        value: data.value,
        customerId: data.customerId,
      },
    });
  }

  /**
   * Save multiple variable history entries at once
   * Called when sending a template with multiple variables
   * 
   * @param userId - The user's ID
   * @param entries - Array of history entries
   * Requirements: 5.1
   */
  async saveVariableHistoryBatch(userId: string, entries: VariableHistoryDto[]): Promise<void> {
    if (entries.length === 0) return;

    await prisma.templateVariableHistory.createMany({
      data: entries.map(entry => ({
        userId,
        templateName: entry.templateName,
        variableId: entry.variableId,
        value: entry.value,
        customerId: entry.customerId,
      })),
    });
  }

  /**
   * Get variable history for suggestions
   * Returns recent unique values for a template's variables
   * 
   * @param userId - The user's ID
   * @param templateName - WhatsApp template name
   * @param limit - Maximum number of suggestions per variable
   * @returns History entries grouped by variable
   * Requirements: 5.2, 5.3
   */
  async getVariableHistory(
    userId: string,
    templateName: string,
    limit = 10
  ): Promise<Map<string, string[]>> {
    const history = await prisma.templateVariableHistory.findMany({
      where: { userId, templateName },
      orderBy: { createdAt: 'desc' },
      take: 500, // Get recent entries to process
    });

    // Group by variableId and get unique values
    const grouped = new Map<string, string[]>();
    
    for (const entry of history) {
      const existing = grouped.get(entry.variableId) || [];
      if (!existing.includes(entry.value) && existing.length < limit) {
        existing.push(entry.value);
        grouped.set(entry.variableId, existing);
      }
    }

    return grouped;
  }

  /**
   * Get variable history with frequency count for better suggestions
   * 
   * @param userId - The user's ID
   * @param templateName - WhatsApp template name
   * @param variableId - Specific variable ID
   * @param limit - Maximum number of suggestions
   * @returns Array of values sorted by frequency
   * Requirements: 5.3
   */
  async getVariableSuggestions(
    userId: string,
    templateName: string,
    variableId: string,
    limit = 10
  ): Promise<{ value: string; count: number }[]> {
    const history = await prisma.templateVariableHistory.groupBy({
      by: ['value'],
      where: {
        userId,
        templateName,
        variableId,
      },
      _count: {
        value: true,
      },
      orderBy: {
        _count: {
          value: 'desc',
        },
      },
      take: limit,
    });

    return history.map(h => ({
      value: h.value,
      count: h._count.value,
    }));
  }

  /**
   * Clean up old history entries (>90 days)
   * Should be called by a cron job
   * 
   * Requirements: 5.4 (implied - data retention)
   */
  async cleanupOldHistory(): Promise<number> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await prisma.templateVariableHistory.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    return result.count;
  }
}

// Export singleton instance
export const templateVariableService = new TemplateVariableService();
