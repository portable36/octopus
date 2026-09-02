export const AI_PERSONALIZATION_QUEUE = 'ai-personalization-queue' as const;

export const AI_PERSONALIZATION_JOB_NAMES = {
  analyzePurchasePatterns: 'analyze-purchase-patterns',
  checkAbandonedCart: 'check-abandoned-cart',
} as const;

export type AiPersonalizationJobName =
  (typeof AI_PERSONALIZATION_JOB_NAMES)[keyof typeof AI_PERSONALIZATION_JOB_NAMES];
