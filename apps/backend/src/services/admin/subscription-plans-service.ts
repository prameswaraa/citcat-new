/**
 * AdminSubscriptionPlansService
 * 
 * Manages subscription plan configurations (FREE, LITE, PRO).
 * Plans are stored in SystemSetting table with category 'subscription_plans'.
 */

import { prisma } from '../../utils/database.js';
import { auditLog } from '../../utils/auditLog.js';
import { logger } from '../../utils/logger.js';
import { settingsCache, CACHE_KEYS } from '../settings-cache.js';

// Types
export interface DurationConfig {
  months: number;        // 1, 3, 6, or 12
  days: number;          // 30, 90, 180, or 365
  discountPercent: number; // 0-100
  enabled: boolean;
  label: string;         // "1 Bulan", "3 Bulan", etc.
}

export interface PlanConfig {
  name: string;
  description: string;
  price: number;  // Base monthly price
  features: string[];
  durations: DurationConfig[];
}

export interface SubscriptionPlansConfig {
  free: PlanConfig;
  basic: PlanConfig;
  lite: PlanConfig;
  pro: PlanConfig;
}

export type PlanTier = 'free' | 'basic' | 'lite' | 'pro';

// Duration pricing response for API
export interface DurationPricingOption {
  months: number;
  days: number;
  discountPercent: number;
  totalPrice: number;
  effectiveMonthlyPrice: number;
  savings: number;
  label: string;
  enabled: boolean;
  recommended?: boolean;
}

export interface PlanPricingResponse {
  tier: PlanTier;
  name: string;
  basePrice: number;
  features: string[];
  durations: DurationPricingOption[];
}

// Default duration configurations
const DEFAULT_DURATIONS: DurationConfig[] = [
  { months: 1, days: 30, discountPercent: 0, enabled: true, label: '1 Bulan' },
  { months: 3, days: 90, discountPercent: 10, enabled: true, label: '3 Bulan' },
  { months: 6, days: 180, discountPercent: 15, enabled: true, label: '6 Bulan' },
  { months: 12, days: 365, discountPercent: 20, enabled: true, label: '1 Tahun' },
];

// Default plan configurations
const DEFAULT_PLANS: SubscriptionPlansConfig = {
  free: {
    name: 'FREE',
    description: 'Untuk memulai bisnis Anda',
    price: 0,
    features: [
      'WhatsApp Business API',
      'Instagram DM Integration',
      'Unlimited pesan',
      'Analytics Dashboard',
    ],
    durations: [], // Free tier has no duration options
  },
  basic: {
    name: 'BASIC',
    description: 'Untuk integrasi developer',
    price: 25000,
    features: [
      'Semua fitur FREE',
      'API Access',
      'Webhook Integration (n8n)',
      '2 Team Members',
    ],
    durations: DEFAULT_DURATIONS,
  },
  lite: {
    name: 'LITE',
    description: 'Untuk bisnis yang berkembang',
    price: 10000,
    features: [
      'Semua fitur BASIC',
      '1 AI Agent',
      '5 Knowledge Documents',
    ],
    durations: DEFAULT_DURATIONS,
  },
  pro: {
    name: 'PRO',
    description: 'Untuk bisnis enterprise',
    price: 299000,
    features: [
      'Semua fitur LITE',
      '10 AI Agents',
      '50 Knowledge Documents',
      '10 Team Members',
    ],
    durations: DEFAULT_DURATIONS,
  },
};

const CATEGORY = 'subscription_plans';
const VALID_TIERS: PlanTier[] = ['free', 'basic', 'lite', 'pro'];

export class AdminSubscriptionPlansService {
  /**
   * Get all subscription plans configuration
   */
  async getPlans(): Promise<SubscriptionPlansConfig> {
    try {
      const cacheKey = CACHE_KEYS.category(CATEGORY);
      const cached = settingsCache.get<SubscriptionPlansConfig>(cacheKey);
      if (cached) {
        return cached;
      }

      const dbSettings = await prisma.systemSetting.findMany({
        where: { category: CATEGORY },
      });

      const plans: SubscriptionPlansConfig = { ...DEFAULT_PLANS };

      for (const setting of dbSettings) {
        const tier = setting.key as PlanTier;
        if (VALID_TIERS.includes(tier)) {
          try {
            const config = JSON.parse(setting.value) as PlanConfig;
            plans[tier] = config;
          } catch (parseError) {
            logger.error('Failed to parse plan config', { tier, error: parseError });
          }
        }
      }

      settingsCache.set(cacheKey, plans);

      return plans;
    } catch (error) {
      logger.error('Failed to get subscription plans', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return DEFAULT_PLANS;
    }
  }

  /**
   * Update a specific plan configuration
   */
  async updatePlan(
    tier: PlanTier,
    config: PlanConfig,
    adminId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!VALID_TIERS.includes(tier)) {
      throw new Error(`Invalid plan tier: ${tier}. Valid tiers: ${VALID_TIERS.join(', ')}`);
    }

    this.validatePlanConfig(tier, config);

    try {
      const previousSetting = await prisma.systemSetting.findUnique({
        where: { category_key: { category: CATEGORY, key: tier } },
      });
      const previousValue = previousSetting 
        ? JSON.parse(previousSetting.value) 
        : DEFAULT_PLANS[tier];

      const stringValue = JSON.stringify(config);
      await prisma.systemSetting.upsert({
        where: { category_key: { category: CATEGORY, key: tier } },
        update: {
          value: stringValue,
          isSensitive: false,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
        create: {
          category: CATEGORY,
          key: tier,
          value: stringValue,
          isSensitive: false,
          updatedBy: adminId,
        },
      });

      await auditLog(
        'subscription_plan_updated',
        'subscription_plans',
        tier,
        {
          tier,
          previousValue,
          newValue: config,
          changedFields: this.getChangedFields(previousValue, config),
        },
        adminId,
        ipAddress
      );

      this.invalidateCache();

      logger.info('Subscription plan updated', { tier, adminId });

      return {
        success: true,
        message: `Plan ${tier.toUpperCase()} updated successfully`,
      };
    } catch (error) {
      logger.error('Failed to update subscription plan', {
        tier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to update ${tier} plan: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate plan configuration
   */
  private validatePlanConfig(tier: PlanTier, config: PlanConfig): void {
    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('Nama paket tidak boleh kosong');
    }

    if (typeof config.description !== 'string') {
      throw new Error('Deskripsi harus berupa teks');
    }

    if (typeof config.price !== 'number') {
      throw new Error('Harga harus berupa angka');
    }

    if (tier === 'free' && config.price !== 0) {
      throw new Error('Harga untuk paket FREE harus 0');
    }

    if (tier !== 'free' && config.price <= 0) {
      throw new Error('Harga harus berupa angka positif');
    }

    if (!Array.isArray(config.features)) {
      throw new Error('Features harus berupa array');
    }

    for (const feature of config.features) {
      if (typeof feature !== 'string') {
        throw new Error('Setiap fitur harus berupa teks');
      }
      if (feature.length > 100) {
        throw new Error('Setiap fitur maksimal 100 karakter');
      }
    }
  }

  /**
   * Get list of changed fields between previous and new config
   */
  private getChangedFields(previous: PlanConfig, current: PlanConfig): string[] {
    const changed: string[] = [];

    if (previous.name !== current.name) changed.push('name');
    if (previous.description !== current.description) changed.push('description');
    if (previous.price !== current.price) changed.push('price');
    if (JSON.stringify(previous.features) !== JSON.stringify(current.features)) {
      changed.push('features');
    }

    return changed;
  }

  /**
   * Invalidate subscription plans cache
   */
  private invalidateCache(): void {
    settingsCache.invalidate(CACHE_KEYS.category(CATEGORY));
    logger.debug('Subscription plans cache invalidated');
  }

  /**
   * Get default plans (for reference)
   */
  getDefaultPlans(): SubscriptionPlansConfig {
    return DEFAULT_PLANS;
  }

  /**
   * Calculate price for a specific duration
   * Formula: totalPrice = basePrice × months × (1 - discountPercent / 100)
   */
  calculateDurationPrice(
    basePrice: number,
    months: number,
    discountPercent: number
  ): { totalPrice: number; effectiveMonthlyPrice: number; savings: number } {
    const fullPrice = basePrice * months;
    const discountMultiplier = 1 - discountPercent / 100;
    const totalPrice = Math.round(fullPrice * discountMultiplier);
    const effectiveMonthlyPrice = Math.round(totalPrice / months);
    const savings = fullPrice - totalPrice;

    return {
      totalPrice,
      effectiveMonthlyPrice,
      savings,
    };
  }

  /**
   * Get plan pricing with all duration options and calculated prices
   * Returns pricing for a specific tier with all enabled duration options
   */
   async getPlanPricing(tier: PlanTier): Promise<PlanPricingResponse> {
    if (tier === 'free') {
      const plans = await this.getPlans();
      return {
        tier: 'free',
        name: plans.free.name,
        basePrice: 0,
        features: plans.free.features,
        durations: [],
      };
    }

    const plans = await this.getPlans();
    const plan = plans[tier];
    
    // Use plan durations or fall back to defaults
    const durations = plan.durations?.length > 0 ? plan.durations : DEFAULT_DURATIONS;

    const durationOptions: DurationPricingOption[] = durations.map((duration) => {
      const { totalPrice, effectiveMonthlyPrice, savings } = this.calculateDurationPrice(
        plan.price,
        duration.months,
        duration.discountPercent
      );

      return {
        months: duration.months,
        days: duration.days,
        discountPercent: duration.discountPercent,
        totalPrice,
        effectiveMonthlyPrice,
        savings,
        label: duration.label,
        enabled: duration.enabled,
        recommended: duration.months === 6, // 6 months is recommended
      };
    });

    return {
      tier,
      name: plan.name,
      basePrice: plan.price,
      features: plan.features,
      durations: durationOptions,
    };
  }

  /**
   * Get pricing for all paid tiers (basic, lite and pro)
   */
  async getAllPlansPricing(): Promise<{ basic: PlanPricingResponse; lite: PlanPricingResponse; pro: PlanPricingResponse }> {
    const [basic, lite, pro] = await Promise.all([
      this.getPlanPricing('basic'),
      this.getPlanPricing('lite'),
      this.getPlanPricing('pro'),
    ]);

    return { basic, lite, pro };
  }

  /**
   * Validate duration configurations
   * Ensures discount rates are valid (0-100%) and required fields are present
   */
  private validateDurationConfig(durations: DurationConfig[]): void {
    if (!Array.isArray(durations)) {
      throw new Error('Durations harus berupa array');
    }

    const validMonths = [1, 3, 6, 12];
    const monthToDays: Record<number, number> = { 1: 30, 3: 90, 6: 180, 12: 365 };

    for (const duration of durations) {
      if (!validMonths.includes(duration.months)) {
        throw new Error(`Durasi bulan tidak valid: ${duration.months}. Harus 1, 3, 6, atau 12`);
      }

      if (duration.days !== monthToDays[duration.months]) {
        throw new Error(`Durasi hari tidak sesuai dengan bulan: ${duration.months} bulan harus ${monthToDays[duration.months]} hari`);
      }

      if (typeof duration.discountPercent !== 'number' || duration.discountPercent < 0 || duration.discountPercent > 100) {
        throw new Error('Diskon harus berupa angka antara 0-100%');
      }

      if (typeof duration.enabled !== 'boolean') {
        throw new Error('Field enabled harus berupa boolean');
      }

      if (!duration.label || typeof duration.label !== 'string' || duration.label.trim() === '') {
        throw new Error('Label durasi tidak boleh kosong');
      }
    }

    // Validate that longer durations have equal or lower effective monthly rates
    const sortedDurations = [...durations].sort((a, b) => a.months - b.months);
    for (let i = 1; i < sortedDurations.length; i++) {
      const prev = sortedDurations[i - 1];
      const curr = sortedDurations[i];
      if (curr.discountPercent < prev.discountPercent) {
        throw new Error(`Diskon untuk ${curr.months} bulan (${curr.discountPercent}%) harus >= diskon ${prev.months} bulan (${prev.discountPercent}%)`);
      }
    }
  }

  /**
   * Update duration configuration for a specific tier
   * Only allowed for paid tiers (lite, pro)
   */
  async updateDurationConfig(
    tier: PlanTier,
    durations: DurationConfig[],
    adminId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    if (tier === 'free') {
      throw new Error('Paket FREE tidak mendukung konfigurasi durasi');
    }

    if (!VALID_TIERS.includes(tier)) {
      throw new Error(`Invalid plan tier: ${tier}. Valid tiers: ${VALID_TIERS.join(', ')}`);
    }

    // Validate duration configurations
    this.validateDurationConfig(durations);

    try {
      // Get current plan config
      const plans = await this.getPlans();
      const currentPlan = plans[tier];
      const previousDurations = currentPlan.durations || DEFAULT_DURATIONS;

      // Update plan with new durations
      const updatedPlan: PlanConfig = {
        ...currentPlan,
        durations,
      };

      const stringValue = JSON.stringify(updatedPlan);
      await prisma.systemSetting.upsert({
        where: { category_key: { category: CATEGORY, key: tier } },
        update: {
          value: stringValue,
          isSensitive: false,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
        create: {
          category: CATEGORY,
          key: tier,
          value: stringValue,
          isSensitive: false,
          updatedBy: adminId,
        },
      });

      // Create audit log
      await auditLog(
        'subscription_plan_durations_updated',
        'subscription_plans',
        tier,
        {
          tier,
          previousDurations,
          newDurations: durations,
        },
        adminId,
        ipAddress
      );

      this.invalidateCache();

      logger.info('Subscription plan durations updated', { tier, adminId });

      return {
        success: true,
        message: `Konfigurasi durasi untuk paket ${tier.toUpperCase()} berhasil diperbarui`,
      };
    } catch (error) {
      logger.error('Failed to update duration config', {
        tier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Gagal memperbarui konfigurasi durasi: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const adminSubscriptionPlansService = new AdminSubscriptionPlansService();
