import {
  AI_PERSONALIZATION_JOB_NAMES,
  type AiPersonalizationJobName,
} from './ai-personalization.constants';

export type AnalyzePurchasePatternsJobPayload = {
  readonly jobName: typeof AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns;
  readonly requestedAt: string;
};

export type CheckAbandonedCartJobPayload = {
  readonly jobName: typeof AI_PERSONALIZATION_JOB_NAMES.checkAbandonedCart;
  readonly cartId: string;
  readonly requestedAt: string;
};

export type AiPersonalizationJobPayload =
  AnalyzePurchasePatternsJobPayload | CheckAbandonedCartJobPayload;

export type { AiPersonalizationJobName };
