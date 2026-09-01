import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  ObjectStoragePort,
  PresignedPutUpload,
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
}
