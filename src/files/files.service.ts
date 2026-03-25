import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { v2 as cloudinaryV2 } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class FilesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(CLOUDINARY)
    private readonly cloudinary: typeof cloudinaryV2,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.checkCloudinaryConnection();
    if (result.ok) {
      this.logger.log(`✓ Cloudinary OK — ${result.message}`);
    } else {
      this.logger.error(`✗ Cloudinary FAILED — ${result.message}`);
      if (result.error) {
        this.logger.error(`  Detail: ${result.error}`);
      }
    }
  }

  /**
   * Startup check: calls Cloudinary Admin API ping.
   * Use before register/upload to confirm credentials & cloud are valid.
   */
  async checkCloudinaryConnection(): Promise<{
    ok: boolean;
    message: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      try {
        const api = (this.cloudinary as any).api;
        if (!api || typeof api.ping !== 'function') {
          resolve({
            ok: false,
            message: 'Cloudinary SDK api.ping not available',
          });
          return;
        }
        api.ping(
          (
            err: Error & { http_code?: number; message?: string },
            result: unknown,
          ) => {
            if (err) {
              const msg =
                err.message ||
                (typeof err === 'object' && err !== null && 'error' in err
                  ? String((err as { error: unknown }).error)
                  : JSON.stringify(err));
              resolve({
                ok: false,
                message:
                  'Not connected — fix CLOUDINARY_URL or CLOUDINARY_* in .env',
                error: msg,
              });
              return;
            }
            const status =
              result &&
              typeof result === 'object' &&
              result !== null &&
              'status' in result
                ? String((result as { status: unknown }).status)
                : 'ok';
            resolve({
              ok: true,
              message: `connected (ping status: ${status})`,
            });
          },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        resolve({
          ok: false,
          message: 'Ping crashed — cloud_name likely not set',
          error: msg,
        });
      }
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'network-marketing',
  ): Promise<{
    message: string;
    data: { url: string; publicId: string; format: string; bytes: number };
  }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const result = await this.uploadToCloudinary(file.buffer, folder);

    return {
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      },
    };
  }

  private uploadToCloudinary(
    buffer: Buffer,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) {
            // Cloudinary returns { message, http_code, name } — log full for debugging
            this.logger.error(
              `Cloudinary upload error: ${error.message || JSON.stringify(error)}`,
            );
            // Common fix: .env must use CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
            const hint =
              'Check .env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (not CLOUD_NAME / CLOUDINARY_KEY).';
            const msg =
              error.message && typeof error.message === 'string'
                ? `Image upload failed: ${error.message}`
                : 'Image upload failed (Cloudinary rejected the request)';
            return reject(new InternalServerErrorException(`${msg}. ${hint}`));
          }
          if (!result?.secure_url) {
            this.logger.error('Cloudinary returned no secure_url');
            return reject(
              new InternalServerErrorException(
                'Image upload failed: empty response',
              ),
            );
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }
}
