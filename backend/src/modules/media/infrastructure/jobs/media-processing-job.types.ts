import type { MediaProcessingJobName } from './media-processing.constants';
import { MEDIA_PROCESSING_JOB_NAMES } from './media-processing.constants';

export type MediaQuarantineValidateJobPayload = {
  readonly jobName: typeof MEDIA_PROCESSING_JOB_NAMES.quarantineValidate;
  readonly mediaId: string;
  readonly requestedAt: string;
};

export type MediaGenerateVariantsJobPayload = {
  readonly jobName: typeof MEDIA_PROCESSING_JOB_NAMES.generateVariants;
  readonly mediaId: string;
  readonly requestedAt: string;
};

export type MediaProcessingJobPayload =
  MediaQuarantineValidateJobPayload | MediaGenerateVariantsJobPayload;

export function isMediaProcessingJobName(value: string): value is MediaProcessingJobName {
  return (
    value === MEDIA_PROCESSING_JOB_NAMES.quarantineValidate ||
    value === MEDIA_PROCESSING_JOB_NAMES.generateVariants
  );
}
