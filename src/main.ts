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
Production-grade REST API for a Network Marketing Platform.

## Authentication
All protected routes require a **Bearer JWT token** in the Authorization header.  
Obtain a token via \`POST /api/v1/auth/login\`.

## Registration Flow

### User (multipart)
1. **Register:** \`POST /api/v1/auth/register\` as **multipart/form-data**
   - Fields: \`email\`, \`password\`, \`fullName\`, optional \`referralCode\`
   - **File field name:** \`screenshot\` (required) — image uploaded to **Cloudinary**; URL stored on INITIAL deposit for admin
   - No bank name / account number / amount in body
2. Account stays **PENDING** until admin approves (\`/admin/users/:id/approve\`)

### Admin (JSON + secret)
1. Set \`ADMIN_REGISTER_SECRET\` in \`.env\`
2. **Register:** \`POST /api/v1/auth/register-admin\` with JSON \`{ email, password, fullName? }\`
3. Header: \`x-admin-register-secret: <same as env>\`
4. Creates **ADMIN** + **ACTIVE** (no deposit)

## Currency
All amounts (wallet balance, deposits, withdrawals, commissions) are in **USD** (dollars).

## Commission Structure (5 Levels)
When a user's initial deposit is approved, commissions are distributed automatically (in USD):
- **Level 1** (direct referrer): **10%**
- **Level 2**: **5%**
- **Level 3**: **3%**
- **Level 4**: **2%**
- **Level 5**: **1%**
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
