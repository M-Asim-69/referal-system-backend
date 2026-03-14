export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cloudinary: {
    /** Single line: cloudinary://API_KEY:API_SECRET@cloud_name — overrides separate vars if set */
    url: process.env.CLOUDINARY_URL || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  /** Required header value for POST /auth/register-admin (set in production). */
  adminRegisterSecret: process.env.ADMIN_REGISTER_SECRET || '',
});
