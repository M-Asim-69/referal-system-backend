import * as dotenv from 'dotenv';
import * as path from 'path';

// Pehle .env load — phir Nest/ConfigModule; warna configuration() khali rehta hai
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
  });

  app.getHttpAdapter().get('/', (req, res) => {
    res.json({ message: 'Hello World', docs: '/api/docs', api: '/api/v1' });
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Network Marketing Platform API')
    .setDescription(
      `
## Overview
REST API for referral + investment platform. All amounts in **USD**.

## Auth
- **Register:** \`POST /api/v1/auth/register\` — JSON: \`username\`, \`email\`, \`password\`, \`fullName\`; optional \`mobile\`, \`referralCode\`. User is **ACTIVE**; can login immediately.
- **Login:** \`POST /api/v1/auth/login\` — returns JWT. Use header \`Authorization: Bearer <token>\` on protected routes.
- **Admin register:** \`POST /api/v1/auth/register-admin\` — header \`x-admin-register-secret\` required.

## Limits (USD)
- **Min deposit:** $5. **Min withdrawal:** $3.
- Deposit/Withdrawal: **manual** (admin approves).

## Deposit
- \`POST /api/v1/wallet/deposits\`: \`amount\` (≥5), \`paymentProofUrl\` (screenshot URL, required).
- Response: wait up to 24 hours for admin approval. On approve: amount credited + **20% self bonus** + level commissions to referrers.

## Level income (when referred user’s deposit is approved)
Only referrers who have **at least one approved deposit** receive commission:
- **Level 1:** 10% · Level 2: 5% · Level 3: 3% · Level 4: 2% · Level 5: 1% (total 21%).

## ROI
- **2% daily** on \`totalDepositInvestment\` (sum of approved deposits). Credited automatically once per day.

## User stats (after login)
- \`GET /api/v1/wallet/balance\` — current balance (USD).
- \`GET /api/v1/wallet/transactions\` — history (deposits, withdrawals, commissions, ROI).
- \`GET /api/v1/wallet/deposits\`, \`GET /api/v1/wallet/withdrawals\` — lists.
- \`GET /api/v1/users/referrals\` — referral tree.
- Profile includes \`referralCode\` for sharing.
      `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Network Marketing API Docs',
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.js',
    ],
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);

  console.log(`\n🚀 Application running on: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger docs available at: http://localhost:${port}/api/docs\n`);
}

bootstrap();
