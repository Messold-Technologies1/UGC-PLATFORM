import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  DATABASE_URL: Joi.string().min(10).required(),
  DIRECT_URL: Joi.string().min(10).required(),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').optional(),
  CORS_ORIGIN: Joi.string().optional().default('*'),

  // Auth: JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRY: Joi.string().optional().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().optional().default('7d'),

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
});
