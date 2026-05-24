# @med-check/lambda-medicine-service

AWS Lambda function — Medicine CRUD, presigned S3 URL generation, and OCR scan orchestration.

## Responsibilities

- **CRUD** for `/medicines` (POST, GET, PUT, DELETE, GET `:id`)
- Normalize medicine name: `name.toLowerCase().trim()` before every DynamoDB write or cache lookup
- Generate **presigned S3 URLs** (`POST /medicines/upload-url`) — client uploads photo directly to S3
- Orchestrate **Textract OCR** (`POST /medicines/scan`) — extract medicine name from uploaded photo
- Invoke **AI Enrichment** lambda asynchronously after a new medicine is saved
- Force-refresh AI data (`POST /medicines/:id/refresh`) — skips AICache and calls Bedrock directly

## AWS Resources Used

| Resource | Purpose |
|---|---|
| DynamoDB `Medicines` | Primary data store (PK: `userId`, SK: `medicineId`) |
| DynamoDB `AICache` | Read cache before enrichment; write after miss |
| S3 `med-check-photos` | Presigned URL target for photo uploads |
| Textract | OCR on uploaded medicine photos |
| Lambda (ai-enrichment) | Async invocation after save |

## Data Flow

```
API Gateway (JWT validated by Cognito Authorizer)
  → medicine-service Lambda
  → DynamoDB write (normalized name, ULID id)
  → AICache lookup (hit: attach; miss: invoke ai-enrichment async)
  → return medicine card
```

## Handler Entry Points (to be implemented)

```
src/
├── handlers/
│   ├── create.ts       # POST /medicines
│   ├── list.ts         # GET /medicines
│   ├── get.ts          # GET /medicines/:id
│   ├── update.ts       # PUT /medicines/:id
│   ├── remove.ts       # DELETE /medicines/:id
│   ├── uploadUrl.ts    # POST /medicines/upload-url
│   ├── scan.ts         # POST /medicines/scan
│   └── refresh.ts      # POST /medicines/:id/refresh
├── clients/            # DynamoDB, S3, Textract, Lambda clients
└── utils/              # ULID generation, name normalization
```
