import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().required(),

  // JWT
  ACCESS_TOKEN_SECRET: Joi.string().required(),
  ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_SECRET: Joi.string().required(),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  // Frontend
  FRONTEND_URL: Joi.string().uri().default('http://localhost:4200'),

  // Email
  EMAIL_PROVIDER: Joi.string()
    .valid('smtp', 'sendgrid', 'ses')
    .default('smtp'),
  EMAIL_FROM: Joi.string().email().required().messages({
    'any.required': 'EMAIL_FROM is required when email notifications are configured',
  }),
  EMAIL_FROM_NAME: Joi.string().required().messages({
    'any.required': 'EMAIL_FROM_NAME is required when email notifications are configured',
  }),

  // SMTP - required only when EMAIL_PROVIDER=smtp
  SMTP_HOST: Joi.string().when('EMAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PORT: Joi.number().port().when('EMAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_USER: Joi.string().when('EMAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PASS: Joi.string().when('EMAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // AWS / S3
  AWS_ACCESS_KEY_ID: Joi.string().required().messages({
    'any.required': 'AWS_ACCESS_KEY_ID is required for S3 file storage',
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string().required().messages({
    'any.required': 'AWS_SECRET_ACCESS_KEY is required for S3 file storage',
  }),
  AWS_REGION: Joi.string().required().messages({
    'any.required': 'AWS_REGION is required for S3 file storage',
  }),
  AWS_S3_BUCKET: Joi.string().required().messages({
    'any.required': 'AWS_S3_BUCKET is required for S3 file storage',
  }),
});
