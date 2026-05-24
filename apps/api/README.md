# @med-check/api

NestJS REST API — the mobile-facing backend for MedCheck.

## Overview

This service is the single entry point for the mobile app. It handles JWT validation (Cognito), orchestrates DynamoDB reads/writes, triggers async Lambda invocations, and proxies requests to Bedrock and Textract.

## Endpoints

Implements all 12 REST endpoints defined in `CLAUDE.md`:

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/profile` |
| Medicines | `GET/POST /medicines`, `GET/PUT/DELETE /medicines/:id`, `POST /medicines/upload-url`, `POST /medicines/scan`, `POST /medicines/:id/refresh` |
| Search | `POST /search/symptoms` |
| Reminders | `GET/POST /reminders`, `PUT/DELETE /reminders/:id` |

Full request/response shapes are documented in `CLAUDE.md` § Request / Response Shapes.

## Tech

| Concern | Library |
|---|---|
| Framework | NestJS 10 |
| Auth | Passport JWT + `jwks-rsa` (Cognito JWKS) |
| Database | AWS SDK v3 — DynamoDB (DocumentClient) |
| Storage | AWS SDK v3 — S3 presigned URLs |
| OCR | AWS SDK v3 — Textract |
| AI | AWS SDK v3 — Bedrock Runtime |
| Async invocation | AWS SDK v3 — Lambda (InvokeAsync) |
| ID generation | `ulid` |
| API docs | `@nestjs/swagger` (OpenAPI) |

## Planned Module Structure

```
src/
├── main.ts                     # Bootstrap & Swagger setup
├── app.module.ts
├── auth/                       # Cognito JWT guard, profile upsert
├── medicines/                  # CRUD, presigned URL, OCR scan, AI refresh
├── search/                     # Symptom search (Bedrock)
├── reminders/                  # Reminder CRUD
├── ai/                         # Bedrock client + prompt builder
├── storage/                    # S3 presigned URL helper
├── database/                   # DynamoDB DocumentClient wrapper
└── common/                     # Guards, interceptors, pipes, decorators
```

## Getting Started

```bash
pnpm install
pnpm --filter @med-check/api dev
```

Requires an `.env` file with:
```
PORT=3000
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
COGNITO_USER_POOL_ID=...
COGNITO_CLIENT_ID=...
DYNAMODB_TABLE_USERS=med-check-users
DYNAMODB_TABLE_MEDICINES=med-check-medicines
DYNAMODB_TABLE_AI_CACHE=med-check-ai-cache
DYNAMODB_TABLE_REMINDERS=med-check-reminders
S3_BUCKET_PHOTOS=med-check-photos
BEDROCK_MODEL_ID=anthropic.claude-haiku-20240307-v1:0
```
