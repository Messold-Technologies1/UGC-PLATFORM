import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().min(10).required(),
  DIRECT_URL: Joi.string().min(10).required(),
  SWAGGER_ENABLED: Joi.string()
    .valid('true', 'false')
    .optional(),
  CORS_ORIGIN: Joi.string().optional().default('*'),
});
