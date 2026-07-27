# @med-check/api

NestJS REST API — the mobile-facing backend for MedCheck.

## Overview

The single entry point for the mobile app, and the gateway in front of the
Lambda compute layer. It validates the Cognito JWT, then **routes each REST call
to the Lambda that owns it** — it does not talk to DynamoDB, Bedrock, or
Textract itself.

```
Mobile → NestJS (this app) → Lambda → DynamoDB / Bedrock / Textract / S3
```

Business logic belongs in the Lambdas. Controllers here stay thin: build an
`APIGatewayProxyEvent`, invoke, translate the `APIGatewayProxyResult` back to
HTTP. That keeps a Lambda's behaviour identical whether this gateway or real
API Gateway invokes it.

### Lambda transport

`LAMBDA_INVOKER` picks how Lambdas are reached:

| Value  | Invoker             | Behaviour                                        |
|--------|---------------------|--------------------------------------------------|
| `http` | `HttpLambdaInvoker` | Forwards to a Lambda's local dev server (default) |
| `aws`  | `AwsLambdaInvoker`  | Real `InvokeCommand`, `RequestResponse`           |

See `src/lambda/` and `.env.example`.

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
| Auth | Passport JWT + `jwks-rsa` (Cognito JWKS) — *currently stubbed* |
| Lambda invocation | AWS SDK v3 — Lambda (`InvokeCommand`) |
| API docs | `@nestjs/swagger` (OpenAPI) |

DynamoDB, S3, Textract, Bedrock and `ulid` are dependencies of the **Lambdas**,
not of this gateway.

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
cp apps/api/.env.example apps/api/.env.local

# Whole stack (API + Lambda dev servers + Expo):
pnpm dev

# Or this gateway alone — needs medicine-service running on :4000:
pnpm --filter @med-check/api dev
```

Config lives in `.env.example`. In `http` mode the only required values are
`LAMBDA_URL_*`; the DynamoDB / S3 / Bedrock settings belong to the Lambdas.

Health check: `GET http://localhost:3000/v1/health`
