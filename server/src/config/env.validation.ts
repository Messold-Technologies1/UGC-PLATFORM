import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  DATABASE_URL: Joi.string().min(10).required(),
  DIRECT_URL: Joi.string().min(10).required(),
  /** Per-process Prisma pool size (divide Neon pool budget across Railway replicas). */
  DATABASE_CONNECTION_LIMIT: Joi.number().integer().min(1).max(100).default(5),
  DATABASE_POOL_TIMEOUT_SECONDS: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .default(15),
  DATABASE_CONNECT_TIMEOUT_SECONDS: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .default(10),
  /** Max time a single query may run (`socket_timeout` on the connection string). */
  DATABASE_QUERY_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(600_000)
    .default(30_000),
  /** Set false for direct (non-pooler) URLs; default auto-detects `-pooler` in the host. */
  DATABASE_PGBOUNCER: Joi.string().valid('true', 'false').optional(),
  DATABASE_TRANSACTION_MAX_WAIT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(120_000)
    .default(5_000),
  DATABASE_TRANSACTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(600_000)
    .default(30_000),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').optional(),
  CORS_ORIGIN: Joi.string().optional().default('*'),

  // Auth: JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRY: Joi.string().optional().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().optional().default('7d'),
  /** Parent domain for auth cookies, e.g. `.gocollab.io` (enables WebSocket on API subdomain) */
  COOKIE_DOMAIN: Joi.string()
    .pattern(/^\.?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i)
    .optional(),

  // Auth: Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().min(1).required(),
  GOOGLE_CLIENT_SECRET: Joi.string().min(1).required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  // Storage: S3 + CDN
  AWS_REGION: Joi.string().min(1).required(),
  AWS_ACCESS_KEY_ID: Joi.string().min(1).required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().min(1).required(),
  S3_BUCKET_NAME: Joi.string().min(1).required(),
  S3_UPLOAD_URL_TTL_SECONDS: Joi.number().integer().min(60).max(3600).default(900),
  CDN_BASE_URL: Joi.string().uri().required(),

  // Razorpay Payments
  RAZORPAY_KEY_ID: Joi.string().min(1).required(),
  RAZORPAY_KEY_SECRET: Joi.string().min(1).required(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().min(1).required(),
  RAZORPAY_REQUEST_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(120_000)
    .default(15_000),

  // Twilio Verify (optional until phone OTP is used)
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: Joi.string().optional(),

  // Email (SES) — optional until outbound mail is enabled
  SES_FROM_EMAIL: Joi.string().email().optional(),
  MAIL_ENABLED: Joi.string().valid('true', 'false').optional(),
  MAIL_SEND_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(120_000)
    .default(10_000),
  /** Dev only: skip SNS signature verification on POST /api/webhooks/ses */
  SES_SNS_SKIP_SIGNATURE_VERIFY: Joi.string().valid('true', 'false').optional(),
});
