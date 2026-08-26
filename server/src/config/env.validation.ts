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
  /** Parent domain for auth cookies, e.g. `.gocollab.io` (enables WebSocket on API subdomain) */
  COOKIE_DOMAIN: Joi.string()
    .pattern(
      /^\.?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i,
    )
    .optional(),

  // Auth: Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().min(1).required(),
  GOOGLE_CLIENT_SECRET: Joi.string().min(1).required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  // Social connections: Instagram API with Instagram Login (data-source link for
  // creator audience metrics). All optional so the app boots without them; the
  // connect flow is only enabled once they are configured.
  INSTAGRAM_CLIENT_ID: Joi.string().min(1).optional(),
  INSTAGRAM_CLIENT_SECRET: Joi.string().min(1).optional(),
  INSTAGRAM_CALLBACK_URL: Joi.string().uri().optional(),
  /**
   * Optional shared parent domain for the OAuth CSRF cookie (e.g. ".gocollab.io")
   * so it rides from the app origin to the api origin when they are different
   * subdomains. Leave unset for same-origin/local dev.
   */
  IG_OAUTH_STATE_COOKIE_DOMAIN: Joi.string().optional(),
  /**
   * 32-byte key (hex or base64) used to AES-256-GCM encrypt stored OAuth tokens
   * and to sign the OAuth `state`. Required once Instagram connect is enabled.
   */
  SOCIAL_TOKEN_ENC_KEY: Joi.string().min(32).optional(),
  /** Instagram Graph API version, e.g. v21.0. */
  INSTAGRAM_GRAPH_VERSION: Joi.string().optional().default('v21.0'),

  // ---- Instagram reel import ----
  /// mirror = copy the reel into our S3 (default). link = keep IG URLs only.
  PORTFOLIO_IG_IMPORT_MODE: Joi.string()
    .valid('mirror', 'link')
    .optional()
    .default('mirror'),
  IG_MEDIA_SYNC_ENABLED: Joi.string().optional(),
  /// BullMQ worker concurrency for reel-cache syncs.
  IG_MEDIA_CONCURRENCY: Joi.number().integer().min(1).optional().default(3),
  /// Hard app-wide ceiling on Graph requests per second.
  IG_MEDIA_RATE_MAX: Joi.number().integer().min(1).optional().default(5),
  /// Page-walk budget per sync (25 media per page).
  IG_MEDIA_MAX_PAGES: Joi.number().integer().min(1).optional().default(12),
  IG_MEDIA_CACHE_TTL_DAYS: Joi.number().integer().min(1).optional().default(7),
  IG_MEDIA_REFRESH_MIN_INTERVAL_MIN: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(60),
  /// Parallel S3 mirrors. Each streams a whole reel, so keep this small.
  IG_MIRROR_CONCURRENCY: Joi.number().integer().min(1).optional().default(2),
  /// Per-reel download budget. A 100 MB reel on a slow link needs headroom.
  IG_MIRROR_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .optional()
    .default(120_000),
  /** Creator onboarding: approval_first (default) or profile_first */
  CREATOR_ONBOARDING_MODE: Joi.string()
    .valid('approval_first', 'profile_first')
    .optional()
    .default('approval_first'),

  // Storage: S3 + CDN
  AWS_REGION: Joi.string().min(1).required(),
  AWS_S3_ACCESS_KEY_ID: Joi.string().min(1).required(),
  AWS_S3_SECRET_ACCESS_KEY: Joi.string().min(1).required(),
  S3_BUCKET_NAME: Joi.string().min(1).required(),
  S3_UPLOAD_URL_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(900),
  CDN_BASE_URL: Joi.string().uri().required(),

  // Delivery watermarking (preview-before-accept).
  // REDIS_URL enables the BullMQ-backed async pipeline. When unset, watermarking
  // runs inline (best-effort) after delivery submission so the feature still
  // works in local/dev environments without Redis.
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional(),
  // When false, this process enqueues BullMQ jobs but does not start Workers.
  // Use on multi-replica API fleets so only one replica (or a dedicated worker
  // service) owns the blocking consumers — duplicate/zombie BZPOPMIN sockets
  // otherwise steal jobs into `active` with no live handler.
  BULLMQ_WORKER_ENABLED: Joi.string().valid('true', 'false').optional(),
  WATERMARK_ENABLED: Joi.string().valid('true', 'false').optional(),
  WATERMARK_TEXT: Joi.string().min(1).max(40).optional().default('gocollab'),

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
  AWS_SES_ACCESS_KEY_ID: Joi.string().min(1).optional(),
  AWS_SES_SECRET_ACCESS_KEY: Joi.string().min(1).optional(),
  SES_FROM_EMAIL: Joi.string().email().optional(),
  MAIL_ENABLED: Joi.string().valid('true', 'false').optional(),
  EMAIL_TEMPLATE_LOGO: Joi.string().uri().optional(),
  MAIL_SEND_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(120_000)
    .default(10_000),
  /** Dev only: skip SNS signature verification on POST /api/webhooks/ses */
  SES_SNS_SKIP_SIGNATURE_VERIFY: Joi.string().valid('true', 'false').optional(),

  // Meta (Facebook) Conversions API — server-side event tracking.
  // All optional: when the token or dataset id is unset the CAPI service
  // short-circuits and sends nothing (server-side kill switch).
  META_CAPI_ACCESS_TOKEN: Joi.string().optional(),
  META_CAPI_DATASET_ID: Joi.string().optional(),
  /** Graph API version, e.g. "v21.0". */
  META_CAPI_API_VERSION: Joi.string()
    .pattern(/^v\d+\.\d+$/)
    .optional()
    .default('v21.0'),
  /** Set while testing to route server events to Events Manager > Test Events. */
  META_CAPI_TEST_EVENT_CODE: Joi.string().optional(),

  // AI (OpenRouter) — optional. When OPENROUTER_API_KEY is unset, AI features
  // short-circuit (e.g. bio generation responds 503 Service Unavailable) so the
  // app still boots and runs without an AI provider configured.
  OPENROUTER_API_KEY: Joi.string().min(1).optional(),
  OPENROUTER_BASE_URL: Joi.string()
    .uri()
    .optional()
    .default('https://openrouter.ai/api/v1'),
  /** Model id used for short bio generation. */
  OPENROUTER_BIO_MODEL: Joi.string()
    .optional()
    .default('google/gemini-2.5-flash-lite'),
  OPENROUTER_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(60_000)
    .default(20_000),
  /** Sent as OpenRouter ranking headers (HTTP-Referer / X-Title). Optional. */
  OPENROUTER_APP_URL: Joi.string().uri().optional(),
  OPENROUTER_APP_NAME: Joi.string().optional().default('GoCollab'),
});
