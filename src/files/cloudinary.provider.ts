import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinaryV2, ConfigOptions } from 'cloudinary';
import { CLOUDINARY_FALLBACK_URL } from './cloudinary.fallback';

export const CLOUDINARY = 'CLOUDINARY';

function trim(s: string | undefined): string {
  return (s || '').trim();
}

/**
 * cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 * api.ping() needs explicit cloud_name — cloudinary_url alone often doesn't set it in SDK.
 */
function parseCloudinaryUrl(url: string): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} | null {
  if (!url.startsWith('cloudinary://')) return null;
  const rest = url.slice('cloudinary://'.length);
  const at = rest.lastIndexOf('@');
  if (at < 0) return null;
  const cloud_name = rest.slice(at + 1).trim();
  const keySecret = rest.slice(0, at);
  const colon = keySecret.indexOf(':');
  if (colon < 0) return null;
  const api_key = keySecret.slice(0, colon).trim();
  const api_secret = keySecret.slice(colon + 1).trim();
  if (!cloud_name || !api_key || !api_secret) return null;
  return { cloud_name, api_key, api_secret };
}

function applyCloudinaryConfig(
  cloudinaryUrl: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
): void {
  // Pehle 3 alag vars — URL parse secret mein : ya galat copy se mismatch kar sakta hai
  if (cloudName && apiKey && apiSecret) {
    cloudinaryV2.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    return;
  }

  const parsed = cloudinaryUrl.startsWith('cloudinary://')
    ? parseCloudinaryUrl(cloudinaryUrl)
    : null;
  if (parsed) {
    cloudinaryV2.config({
      cloud_name: parsed.cloud_name,
      api_key: parsed.api_key,
      api_secret: parsed.api_secret,
    });
    return;
  }

  cloudinaryV2.config({
    cloud_name: '',
    api_key: '',
    api_secret: '',
  });
}

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (config: ConfigService): typeof cloudinaryV2 => {
    let cloudinaryUrl = trim(config.get<string>('cloudinary.url'));
    let cloudName = trim(config.get<string>('cloudinary.cloudName'));
    let apiKey = trim(config.get<string>('cloudinary.apiKey'));
    let apiSecret = trim(config.get<string>('cloudinary.apiSecret'));

    if (!cloudinaryUrl) cloudinaryUrl = trim(process.env.CLOUDINARY_URL);
    if (!cloudName) cloudName = trim(process.env.CLOUDINARY_CLOUD_NAME);
    if (!apiKey) apiKey = trim(process.env.CLOUDINARY_API_KEY);
    if (!apiSecret) apiSecret = trim(process.env.CLOUDINARY_API_SECRET);

    // URL tabhi jab teen vars na hon — warna sirf 3 vars use hongi (mismatch avoid)
    if (!cloudName && !apiKey && !apiSecret && !cloudinaryUrl) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Cloudinary] Env empty — using fallback URL from cloudinary.fallback.ts',
      );
      cloudinaryUrl = CLOUDINARY_FALLBACK_URL;
    }

    applyCloudinaryConfig(
      cloudinaryUrl || '',
      cloudName,
      apiKey,
      apiSecret.replace(/\r/g, '').trim(),
    );
    return cloudinaryV2;
  },
};
