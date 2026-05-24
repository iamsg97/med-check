# CLAUDE.md — MedCheck

> Agent instructions for implementing the MedCheck system design.

---

## What is MedCheck?

A **React Native mobile app** that lets users:
- Register medicines in their home cabinet
- Get AI-powered info: usage, dosage, side effects
- Search medicines by symptom
- Set smart dosage reminders

Full backend on **AWS Serverless** (Lambda + DynamoDB + Bedrock).

---

## Stack at a Glance

| Layer            | Tech                              |
|------------------|-----------------------------------|
| Mobile           | React Native (Expo)               |
| Auth             | AWS Cognito (Google + Apple OAuth)|
| API              | AWS API Gateway (REST, JWT auth)  |
| Compute          | AWS Lambda (4 functions)          |
| Database         | AWS DynamoDB (4 tables)           |
| AI / LLM         | AWS Bedrock (Claude Haiku)        |
| OCR              | AWS Textract                      |
| Photo Storage    | AWS S3                            |
| Push Scheduler   | EventBridge + SNS + FCM           |

---

## Architecture Layers (top → bottom)

```
React Native App
      │
  AWS Cognito (JWT OAuth)
      │
  API Gateway (REST, Bearer token)
      │
  ┌───────────────────────────────┐
  │         Lambda Functions      │
  │  ① Medicine CRUD              │
  │  ② AI Enrichment (Bedrock)   │
  │  ③ Symptom Search            │
  │  ④ Notification Scheduler    │
  └───────────────────────────────┘
      │
  ┌─────────────────────────────────────┐
  │  DynamoDB │ S3 │ Bedrock │ Textract │
  └─────────────────────────────────────┘
      │
  EventBridge → SNS → FCM (push)
```

---

## Lambda Functions — Responsibilities

### ① Medicine Service
- CRUD for `/medicines`
- Normalizes name: `toLowerCase().trim()`
- Generates S3 presigned URLs for photo upload
- Triggers AI enrichment **async** after save

### ② AI Enrichment
- Calls Bedrock with structured prompt
- Returns: `usage`, `sideEffects[]`, `dosage`, `relatedMedicines[]`, `warnings[]`
- Caches result in `AICache` table with **30-day TTL**
- Cache key = `normalizedName` → shared across all users

### ③ Symptom Search
- Fetches user's full cabinet from DynamoDB
- Sends to Bedrock: *"Which medicines help with {symptom}?"*
- Returns ranked results with `relevance` score + explanation

### ④ Notification Service
- Triggered by EventBridge (every 15 min)
- Reads `Reminders` table for due reminders
- Sends push via SNS → FCM

---

## API Base URL

```
https://<api-id>.execute-api.<region>.amazonaws.com/v1
Authorization: Bearer <cognito-jwt>
```

---

## API Endpoints (12 total)

### Auth
| Method | Path              | Description                      |
|--------|-------------------|----------------------------------|
| POST   | /auth/profile     | Upsert user profile after login  |

### Medicines
| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| POST   | /medicines                  | Add medicine to cabinet            |
| GET    | /medicines                  | List all medicines (paginated)     |
| GET    | /medicines/:id              | Get single medicine + AI data      |
| PUT    | /medicines/:id              | Update medicine details            |
| DELETE | /medicines/:id              | Remove medicine                    |
| POST   | /medicines/upload-url       | Get presigned S3 URL for photo     |
| POST   | /medicines/scan             | Run OCR on uploaded photo          |
| POST   | /medicines/:id/refresh      | Force-refresh AI data (skip cache) |

### Search
| Method | Path                  | Description                         |
|--------|-----------------------|-------------------------------------|
| POST   | /search/symptoms      | Match medicines to a symptom        |

### Reminders
| Method | Path              | Description                         |
|--------|-------------------|-------------------------------------|
| GET    | /reminders        | List all user reminders             |
| POST   | /reminders        | Create dosage reminder              |
| PUT    | /reminders/:id    | Update schedule or toggle on/off    |
| DELETE | /reminders/:id    | Delete reminder                     |

---

## Request / Response Shapes

### POST /medicines — Request
```json
{
  "name": "Pan-40",
  "notes": "optional",
  "quantity": 10,
  "expiryDate": "2025-12-31"
}
```

### POST /medicines — Response
```json
{
  "medicineId": "ULID",
  "name": "Pan-40",
  "normalizedName": "pan-40",
  "aiData": {
    "usage": "...",
    "sideEffects": ["..."],
    "dosage": {
      "standard": "40mg",
      "frequency": "once daily",
      "timing": "before meals"
    },
    "relatedMedicines": ["Pan-D"],
    "warnings": ["..."]
  },
  "createdAt": "ISO 8601"
}
```

### POST /search/symptoms — Request
```json
{ "symptom": "stomach pain", "limit": 10 }
```

### POST /search/symptoms — Response
```json
{
  "results": [
    {
      "medicine": { "...": "..." },
      "relevance": 0.92,
      "explanation": "Pan-40 reduces gastric acid..."
    }
  ]
}
```

---

## DynamoDB Tables

### Users
- **PK:** `userId` (Cognito sub)
- Fields: `email`, `name`, `authProvider`, `fcmToken`, `timezone`, `createdAt`

### Medicines
- **PK:** `userId` | **SK:** `medicineId` (ULID)
- Fields: `name`, `normalizedName`, `notes`, `quantity`, `expiryDate`, `photoS3Key`, `aiData` (Map), `aiLastUpdated`
- **GSI:** `normalizedName-index` → used for dedup + cache lookup

### AICache
- **PK:** `normalizedName`
- Fields: `aiResponse` (Map), `modelId`, `promptHash`, `lastUpdated`
- **TTL:** `ttl` field — auto-expires after 30 days

### Reminders
- **PK:** `userId` | **SK:** `reminderId` (ULID)
- Fields: `medicineId`, `medicineName`, `schedule` (`{ times[], frequency }`), `enabled`, `lastSent`

---

## Data Flows — Summary

### Manual Medicine Entry
```
User types name
  → POST /medicines
  → Lambda normalizes + writes to DynamoDB
  → Check AICache (cache hit? use it : call Bedrock)
  → Cache Bedrock response (30d TTL)
  → Return enriched medicine card
```

### Photo / OCR Entry
```
User takes photo
  → GET presigned S3 URL
  → Upload directly to S3 (no Lambda in upload path)
  → POST /medicines/scan → Textract
  → Lambda extracts medicine name
  → User confirms → follow Manual Entry flow
```

### Symptom Search
```
User types "headache"
  → POST /search/symptoms
  → Lambda fetches all user medicines from DynamoDB
  → Bedrock: "Which help with headache?" → ranked results
```

### Smart Reminders
```
AI enrichment suggests timing (e.g., "twice daily after meals")
  → User enables reminder → POST /reminders
  → EventBridge rule created
  → EventBridge fires → Lambda → SNS → FCM → push notification
```

---

## AI / Bedrock Prompt Pattern

Always return structured JSON. Example prompt:

```
For the medicine "{normalizedName}", return ONLY valid JSON:
{
  "usage": "...",
  "sideEffects": ["..."],
  "dosage": { "standard": "...", "frequency": "...", "timing": "..." },
  "relatedMedicines": ["..."],
  "warnings": ["..."]
}
Do not include markdown or explanation outside the JSON.
```

- Model: **Claude Haiku** (cheapest, fastest)
- Cache per `normalizedName` → ~`$0.001` per unique medicine

---

## AWS Free Tier Constraints

| Service      | Free Allowance              | Notes                              |
|--------------|-----------------------------|------------------------------------|
| Lambda       | 1M req/mo (Always Free)     | 4 functions stay well within limit |
| API Gateway  | 1M calls/mo (12 months)     | ~$3.50/M after 12 months          |
| DynamoDB     | 25 GB (Always Free)         | On-demand mode, 4 tables           |
| Cognito      | 50K MAUs (Always Free)      | Covers Google + Apple OAuth        |
| S3           | 5 GB (12 months)            | Compress photos to ~200 KB         |
| Textract     | 1K pages/mo (3 months)      | Warn user about cost after trial   |
| Bedrock      | Pay per use                 | ~$0.001/medicine with caching      |
| EventBridge  | Always Free                 | AWS scheduled events are free      |
| SNS (FCM)    | 1M pushes/mo (Always Free)  | Ample for V1                       |

> **Cost tip:** Bedrock is the only real spend. AICache + 30-day TTL makes it near-zero since each unique medicine name is only enriched once globally.

---

## V1 Scope (MVP)

- [x] User auth (Google/Apple)
- [x] Add medicine (manual + photo OCR)
- [x] AI enrichment (usage, dosage, side effects, related meds)
- [x] Medicine dashboard
- [x] Symptom search
- [x] Dosage reminders
- [x] AI response caching

## V2 Roadmap

- [ ] Medicine expiry tracking + alerts
- [ ] Family cabinet sharing
- [ ] Bedrock vision model as Textract alternative
- [ ] Offline mode
- [ ] Medicine interaction warnings
- [ ] Drug allergy profile

---

## Key Implementation Notes

- Use **ULID** (not UUID) for `medicineId` and `reminderId` — sorts chronologically
- Always normalize medicine name: `name.toLowerCase().trim()` before DynamoDB write or cache lookup
- `promptHash` in AICache detects when the Bedrock prompt changes → invalidate stale cache
- S3 photo upload goes **directly from client to S3** via presigned URL — never route through Lambda
- JWT auth is validated by API Gateway's Cognito Authorizer — Lambda does **not** re-validate tokens
- EventBridge rule fires every 15 minutes; Lambda checks `lastSent` to avoid duplicate pushes
- Use DynamoDB TTL (not manual deletes) to expire AICache entries — set `ttl = now + 30 days` in Unix epoch