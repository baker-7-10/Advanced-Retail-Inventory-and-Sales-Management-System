import { envValidationSchema } from '../../../src/config/env.validation';

describe('envValidationSchema', () => {
  const validConfig = {
    NODE_ENV: 'development',
    PORT: 3000,
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_USERNAME: 'root',
    DB_PASSWORD: 'secret',
    DB_NAME: 'retail_db',
    ACCESS_TOKEN_SECRET: 'jwt-secret',
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_SECRET: 'refresh-secret',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:4200',
    EMAIL_PROVIDER: 'smtp',
    EMAIL_FROM: 'noreply@retail.com',
    EMAIL_FROM_NAME: 'Retail System',
    SMTP_HOST: 'smtp.mailtrap.io',
    SMTP_PORT: 587,
    SMTP_USER: 'smtp-user',
    SMTP_PASS: 'smtp-pass',
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    AWS_REGION: 'us-east-1',
    AWS_S3_BUCKET: 'retail-assets',
  };

  describe('valid configuration', () => {
    it('should validate a complete valid config without errors', () => {
      const { error, value } = envValidationSchema.validate(validConfig, {
        abortEarly: false,
      });
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    });

    it('should apply default values for optional fields', () => {
      const minimal = {
        DB_HOST: 'localhost',
        DB_USERNAME: 'root',
        DB_NAME: 'retail_db',
        ACCESS_TOKEN_SECRET: 'secret',
        REFRESH_TOKEN_SECRET: 'refresh',
        EMAIL_FROM: 'test@test.com',
        EMAIL_FROM_NAME: 'Test',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
        AWS_ACCESS_KEY_ID: 'key',
        AWS_SECRET_ACCESS_KEY: 'secret',
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'bucket',
      };
      const { error, value } = envValidationSchema.validate(minimal, {
        abortEarly: false,
      });
      expect(error).toBeUndefined();
      expect(value.NODE_ENV).toBe('development');
      expect(value.PORT).toBe(3000);
      expect(value.DB_PORT).toBe(3306);
      expect(value.DB_PASSWORD).toBe('');
      expect(value.ACCESS_TOKEN_EXPIRES_IN).toBe('15m');
      expect(value.REFRESH_TOKEN_EXPIRES_IN).toBe('7d');
      expect(value.FRONTEND_URL).toBe('http://localhost:4200');
      expect(value.EMAIL_PROVIDER).toBe('smtp');
    });
  });

  describe('NODE_ENV validation', () => {
    it('should reject invalid NODE_ENV values', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, NODE_ENV: 'staging' },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('NODE_ENV');
    });

    it('should accept development, test, and production', () => {
      for (const env of ['development', 'test', 'production']) {
        const { error } = envValidationSchema.validate(
          { ...validConfig, NODE_ENV: env },
          { abortEarly: false },
        );
        expect(error).toBeUndefined();
      }
    });
  });

  describe('PORT validation', () => {
    it('should reject non-numeric PORT', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, PORT: 'not-a-number' },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('PORT');
    });

    it('should reject out-of-range PORT', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, PORT: 99999 },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
    });
  });

  describe('database validation', () => {
    it('should reject missing DB_HOST', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, DB_HOST: '' },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
    });

    it('should reject missing DB_USERNAME', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, DB_USERNAME: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
    });

    it('should reject missing DB_NAME', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, DB_NAME: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
    });
  });

  describe('JWT validation', () => {
    it('should reject missing ACCESS_TOKEN_SECRET', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, ACCESS_TOKEN_SECRET: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('ACCESS_TOKEN_SECRET');
    });

    it('should reject missing REFRESH_TOKEN_SECRET', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, REFRESH_TOKEN_SECRET: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('REFRESH_TOKEN_SECRET');
    });
  });

  describe('FRONTEND_URL validation', () => {
    it('should reject invalid FRONTEND_URL', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, FRONTEND_URL: 'not-a-valid-url' },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('FRONTEND_URL');
    });

    it('should accept valid FRONTEND_URL', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, FRONTEND_URL: 'https://myapp.example.com' },
        { abortEarly: false },
      );
      expect(error).toBeUndefined();
    });
  });

  describe('SMTP conditional validation', () => {
    it('should require SMTP vars when EMAIL_PROVIDER is smtp', () => {
      const config = {
        ...validConfig,
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: undefined,
        SMTP_PORT: undefined,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
      };
      const { error } = envValidationSchema.validate(config, {
        abortEarly: false,
      });
      expect(error).toBeDefined();
      const messages = error.details.map((d) => d.path.join('.'));
      expect(messages).toContain('SMTP_HOST');
      expect(messages).toContain('SMTP_PORT');
      expect(messages).toContain('SMTP_USER');
      expect(messages).toContain('SMTP_PASS');
    });

    it('should NOT require SMTP vars when EMAIL_PROVIDER is sendgrid', () => {
      const config = {
        ...validConfig,
        EMAIL_PROVIDER: 'sendgrid',
        SMTP_HOST: undefined,
        SMTP_PORT: undefined,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
      };
      const { error } = envValidationSchema.validate(config, {
        abortEarly: false,
      });
      expect(error).toBeUndefined();
    });

    it('should NOT require SMTP vars when EMAIL_PROVIDER is ses', () => {
      const config = {
        ...validConfig,
        EMAIL_PROVIDER: 'ses',
        SMTP_HOST: undefined,
        SMTP_PORT: undefined,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
      };
      const { error } = envValidationSchema.validate(config, {
        abortEarly: false,
      });
      expect(error).toBeUndefined();
    });
  });

  describe('AWS / S3 validation', () => {
    it('should reject missing AWS_ACCESS_KEY_ID', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, AWS_ACCESS_KEY_ID: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('AWS_ACCESS_KEY_ID');
    });

    it('should reject missing AWS_SECRET_ACCESS_KEY', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, AWS_SECRET_ACCESS_KEY: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('AWS_SECRET_ACCESS_KEY');
    });

    it('should reject missing AWS_REGION', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, AWS_REGION: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('AWS_REGION');
    });

    it('should reject missing AWS_S3_BUCKET', () => {
      const { error } = envValidationSchema.validate(
        { ...validConfig, AWS_S3_BUCKET: undefined },
        { abortEarly: false },
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('AWS_S3_BUCKET');
    });
  });
});
