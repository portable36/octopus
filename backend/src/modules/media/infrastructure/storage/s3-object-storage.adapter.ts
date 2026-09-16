import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  MultipartUploadInit,
  ObjectHeadResult,
  ObjectStoragePort,
  PresignedGetDownload,
  PresignedPutUpload,
  PresignedUploadPart,
  UploadedPart,
} from '../../application/ports/object-storage.port';

@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {
    this.client = new S3Client({
      endpoint: this.config.s3Endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.s3AccessKey,
        secretAccessKey: this.config.s3SecretKey,
      },
      forcePathStyle: true,
    });
  }

  public async createPresignedPut(input: {
    readonly storageKey: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly expiresInSeconds: number;
  }): Promise<PresignedPutUpload> {
    const command = new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: input.storageKey,
      ContentType: input.contentType,
      ContentLength: input.byteSize,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
    return {
      storageKey: input.storageKey,
      uploadUrl,
      expiresAt,
      requiredHeaders: {
        'Content-Type': input.contentType,
        'Content-Length': String(input.byteSize),
      },
    };
  }

  public async createPresignedGet(input: {
    readonly storageKey: string;
    readonly expiresInSeconds: number;
  }): Promise<PresignedGetDownload> {
    const command = new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: input.storageKey,
    });
    const downloadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    return {
      storageKey: input.storageKey,
      downloadUrl,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  public async headObject(storageKey: string): Promise<ObjectHeadResult | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: storageKey,
        }),
      );
      return {
        storageKey,
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
      };
    } catch (error: unknown) {
      if (this.isMissingObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  public async readObjectPrefix(storageKey: string, maxBytes: number): Promise<Buffer | null> {
    const limit = Math.max(1, Math.min(Math.floor(maxBytes), 64));
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: storageKey,
          Range: `bytes=0-${limit - 1}`,
        }),
      );
      if (!result.Body) {
        return Buffer.alloc(0);
      }
      const bytes = await result.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error: unknown) {
      if (this.isMissingObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  public async createMultipartUpload(input: {
    readonly storageKey: string;
    readonly contentType: string;
  }): Promise<MultipartUploadInit> {
    const result = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.config.s3Bucket,
        Key: input.storageKey,
        ContentType: input.contentType,
      }),
    );
    if (!result.UploadId) {
      throw new Error('S3 CreateMultipartUpload did not return UploadId.');
    }
    return {
      storageKey: input.storageKey,
      uploadId: result.UploadId,
    };
  }

  public async createPresignedUploadPart(input: {
    readonly storageKey: string;
    readonly uploadId: string;
    readonly partNumber: number;
    readonly expiresInSeconds: number;
  }): Promise<PresignedUploadPart> {
    const command = new UploadPartCommand({
      Bucket: this.config.s3Bucket,
      Key: input.storageKey,
      UploadId: input.uploadId,
      PartNumber: input.partNumber,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
      partNumber: input.partNumber,
      requiredHeaders: {},
    };
  }

  public async listUploadedParts(input: {
    readonly storageKey: string;
    readonly uploadId: string;
  }): Promise<readonly UploadedPart[]> {
    const parts: UploadedPart[] = [];
    let partNumberMarker: string | undefined;
    do {
      const page = await this.client.send(
        new ListPartsCommand({
          Bucket: this.config.s3Bucket,
          Key: input.storageKey,
          UploadId: input.uploadId,
          PartNumberMarker: partNumberMarker,
        }),
      );
      for (const part of page.Parts ?? []) {
        if (part.PartNumber == null || !part.ETag) {
          continue;
        }
        parts.push({
          partNumber: part.PartNumber,
          etag: part.ETag,
          size: part.Size ?? 0,
        });
      }
      partNumberMarker = page.IsTruncated ? page.NextPartNumberMarker : undefined;
    } while (partNumberMarker);
    return parts;
  }

  public async completeMultipartUpload(input: {
    readonly storageKey: string;
    readonly uploadId: string;
    readonly parts: readonly { readonly partNumber: number; readonly etag: string }[];
  }): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.config.s3Bucket,
        Key: input.storageKey,
        UploadId: input.uploadId,
        MultipartUpload: {
          Parts: input.parts.map((part) => ({
            ETag: part.etag,
            PartNumber: part.partNumber,
          })),
        },
      }),
    );
  }

  public async abortMultipartUpload(input: {
    readonly storageKey: string;
    readonly uploadId: string;
  }): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.config.s3Bucket,
        Key: input.storageKey,
        UploadId: input.uploadId,
      }),
    );
  }

  private isMissingObjectError(error: unknown): boolean {
    const status =
      typeof error === 'object' && error !== null && '$metadata' in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
    const name =
      typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name?: string }).name)
        : '';
    return status === 404 || name === 'NotFound' || name === 'NoSuchKey';
  }
}
