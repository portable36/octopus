export const MEDIA_PROCESSING_ENQUEUER = Symbol('MEDIA_PROCESSING_ENQUEUER');

export interface MediaProcessingEnqueuerPort {
  isQueueActive(): boolean;
  enqueueQuarantineValidate(mediaId: string): Promise<boolean>;
  enqueueGenerateVariants(mediaId: string): Promise<boolean>;
}
