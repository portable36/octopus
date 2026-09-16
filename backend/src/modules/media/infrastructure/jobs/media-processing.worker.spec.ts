import { describe, expect, it, vi } from 'vitest';
import { MediaProcessingWorker } from './media-processing.worker';

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function createWorker(overrides: {
  asset?: Record<string, unknown> | null;
  prefix?: Buffer | null;
} = {}) {
  const asset =
    overrides.asset === null
      ? null
      : {
          id: 'media-1',
          contentType: 'image/png',
          storageKey: 'vendors/v1/a.png',
          status: 'quarantined',
          ...overrides.asset,
        };
  const media = {
    findById: vi.fn(async () => asset),
    updateProcessingStatus: vi.fn(async () => undefined),
    save: vi.fn(),
  };
  const objectStorage = {
    readObjectPrefix: vi.fn(async () =>
      overrides.prefix === undefined ? PNG_PREFIX : overrides.prefix,
    ),
  };
  const enqueuer = {
    isQueueActive: () => true,
    enqueueQuarantineValidate: vi.fn(async () => true),
    enqueueGenerateVariants: vi.fn(async () => true),
    getQueue: vi.fn(),
  };
  const config = {
    redisUrl: 'redis://localhost:6379',
    bullmqConcurrencyDefault: 1,
    bullmqJobTimeoutMs: 30_000,
  };
  const worker = new MediaProcessingWorker(
    config as never,
    enqueuer as never,
    media as never,
    objectStorage as never,
  );
  return { worker, media, objectStorage, enqueuer };
}

describe('MediaProcessingWorker.processQuarantineValidate', () => {
  it('marks matching magic bytes as ready and enqueues variants stub', async () => {
    const { worker, media, enqueuer } = createWorker();
    await worker.processQuarantineValidate('media-1');
    expect(media.updateProcessingStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'media-1',
        status: 'ready',
        rejectionReason: null,
      }),
    );
    expect(enqueuer.enqueueGenerateVariants).toHaveBeenCalledWith('media-1');
  });

  it('rejects when magic bytes do not match declared content type', async () => {
    const jpegPrefix = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const { worker, media, enqueuer } = createWorker({ prefix: jpegPrefix });
    await worker.processQuarantineValidate('media-1');
    expect(media.updateProcessingStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'media-1',
        status: 'rejected',
      }),
    );
    expect(enqueuer.enqueueGenerateVariants).not.toHaveBeenCalled();
  });

  it('is a no-op when the asset is already ready', async () => {
    const { worker, media, objectStorage } = createWorker({
      asset: { status: 'ready' },
    });
    await worker.processQuarantineValidate('media-1');
    expect(objectStorage.readObjectPrefix).not.toHaveBeenCalled();
    expect(media.updateProcessingStatus).not.toHaveBeenCalled();
  });
});
