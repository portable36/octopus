/** Must match messaging QUEUE_NAMES.mediaProcessing when added — literal avoids cross-module import. */
export const MEDIA_PROCESSING_QUEUE = 'octopus.media-processing';

export const MEDIA_PROCESSING_JOB_NAMES = {
  quarantineValidate: 'MediaQuarantineValidate',
  generateVariants: 'MediaGenerateVariants',
} as const;

export type MediaProcessingJobName =
  (typeof MEDIA_PROCESSING_JOB_NAMES)[keyof typeof MEDIA_PROCESSING_JOB_NAMES];
