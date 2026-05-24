# MedCheck 💊

> Your home medicine cabinet, made smart.

MedCheck is a **React Native mobile app** that helps you understand the medicines sitting in your home. Add a medicine by name or photo — the app tells you what it's for, how to take it, its side effects, and which of your other medicines pair with it.

---

## The Problem

Most homes have 10–20 medicines. Most people don't know:
- What each medicine actually treats
- The correct dosage to take
- Whether two medicines conflict
- When a medicine has expired

Doctors visits aren't needed for fever, gas, or a small cut — but you still need to know what to take.

---

## Features

| Feature               | Description                                                  |
|-----------------------|--------------------------------------------------------------|
| 📦 Medicine Cabinet   | Register all your medicines in one place                     |
| 🤖 AI Enrichment      | Auto-fetches usage, dosage, side effects via AWS Bedrock     |
| 📷 Photo Scan (OCR)   | Photograph a medicine box to auto-detect the name            |
| 🔍 Symptom Search     | Type "headache" → get matched medicines from your cabinet     |
| ⏰ Smart Reminders    | AI-suggested dosage schedules with push notifications        |
| 🔒 Secure Auth        | Google / Apple sign-in via AWS Cognito                       |

---

## Tech Stack

### Mobile
- **React Native** (Expo managed workflow)
- Cross-platform: iOS + Android

### Backend (AWS Serverless)
- **API Gateway** — REST API, JWT auth
- **Lambda** — 4 serverless functions
- **DynamoDB** — 4 NoSQL tables
- **S3** — medicine photo storage
- **AWS Bedrock** — AI/LLM (Claude Haiku)
- **AWS Textract** — OCR for photo scan
- **AWS Cognito** — OAuth (Google + Apple)
- **EventBridge + SNS + FCM** — push notifications

> Designed to run **entirely within AWS Free Tier** for V1.

---

## Architecture

```
┌──────────────────────────────────────────┐
│              React Native App            │
└──────────────────┬───────────────────────┘
                   │ HTTPS + JWT
        ┌──────────▼──────────┐
        │    API Gateway      │  ← Validates JWT via Cognito
        └──────────┬──────────┘
                   │
     ┌─────────────┼──────────────────┐
     ▼             ▼                  ▼
  λ Medicine   λ AI Enrichment   λ Symptom Search
  CRUD         (Bedrock)         (Bedrock)
                                      ▲
                          λ Notification Svc
                          (EventBridge trigger)
     │             │            │
     └────────┬────┘────────────┘
              ▼
   DynamoDB │ S3 │ Bedrock │ Textract
              │
         SNS → FCM → Push
```

---

## Database Tables

### `Users`
| Key  | Type   | Notes               |
|------|--------|---------------------|
| PK   | String | `userId` (Cognito sub) |

Fields: `email`, `name`, `authProvider`, `fcmToken`, `timezone`

---

### `Medicines`
| Key  | Type   | Notes               |
|------|--------|---------------------|
| PK   | String | `userId`            |
| SK   | ULID   | `medicineId`        |

Fields: `name`, `normalizedName`, `quantity`, `expiryDate`, `photoS3Key`, `aiData` (Map)

GSI: `normalizedName-index` — for dedup + cache lookup

---

### `AICache`
| Key  | Type   | Notes                        |
|------|--------|------------------------------|
| PK   | String | `normalizedName`             |

Fields: `aiResponse`, `modelId`, `promptHash`, `ttl` (30-day auto-expire)

> Shared cache across all users — one Bedrock call per unique medicine name.

---

### `Reminders`
| Key  | Type   | Notes        |
|------|--------|--------------|
| PK   | String | `userId`     |
| SK   | ULID   | `reminderId` |

Fields: `medicineId`, `schedule` (`{ times[], frequency }`), `enabled`, `lastSent`

---

## API Overview

**Base:** `https://<api-id>.execute-api.<region>.amazonaws.com/v1`  
**Auth:** `Authorization: Bearer <cognito-jwt>` on every request

| Method | Endpoint                    | Purpose                        |
|--------|-----------------------------|--------------------------------|
| POST   | /auth/profile               | Upsert user after login        |
| POST   | /medicines                  | Add medicine + trigger AI      |
| GET    | /medicines                  | List cabinet (paginated)       |
| GET    | /medicines/:id              | Get single medicine + AI data  |
| PUT    | /medicines/:id              | Edit medicine details          |
| DELETE | /medicines/:id              | Remove from cabinet            |
| POST   | /medicines/upload-url       | Get S3 presigned upload URL    |
| POST   | /medicines/scan             | OCR photo → extract name       |
| POST   | /medicines/:id/refresh      | Force re-fetch AI data         |
| POST   | /search/symptoms            | Symptom → matched medicines    |
| GET    | /reminders                  | List reminders                 |
| POST   | /reminders                  | Create reminder                |
| PUT    | /reminders/:id              | Update / toggle reminder       |
| DELETE | /reminders/:id              | Delete reminder                |

---

## Key Data Flows

### Add Medicine (Manual)
```
1. User types "Pan-40"
2. POST /medicines → Lambda normalizes name
3. Check AICache (hit? use cache : call Bedrock)
4. Cache response with 30-day TTL
5. Return full medicine card to app
```

### Add Medicine (Photo)
```
1. User photographs medicine box
2. App gets presigned S3 URL → uploads directly to S3
3. POST /medicines/scan → Textract reads text
4. Lambda extracts medicine name
5. User confirms → follows Manual flow
```

### Symptom Search
```
1. User types "stomach pain"
2. Lambda fetches all user medicines
3. Bedrock: "Which help with stomach pain?"
4. Ranked results + plain-language explanations
```

### Smart Reminder
```
1. AI enrichment returns dosage timing suggestion
2. User enables reminder → POST /reminders
3. EventBridge fires every 15 min
4. Lambda checks due reminders → SNS → FCM → push
```

---

## AWS Free Tier Budget

| Service     | Free Allowance              | After Free Tier         |
|-------------|-----------------------------|--------------------------|
| Lambda      | 1M req/mo — **Always Free** | $0.20/million            |
| API Gateway | 1M calls/mo — 12 months     | $3.50/million            |
| DynamoDB    | 25 GB — **Always Free**     | $0.25/GB                 |
| Cognito     | 50K MAU — **Always Free**   | $0.0055/MAU              |
| S3          | 5 GB — 12 months            | $0.023/GB                |
| Textract    | 1K pages/mo — 3 months      | $1.50/1K pages           |
| Bedrock     | Pay-per-use                 | ~$0.001/medicine (Haiku) |
| EventBridge | **Always Free**             | —                        |
| SNS / FCM   | 1M pushes — **Always Free** | $0.50/million            |

> **Bottom line:** Bedrock is the only real spend. AICache makes it near-zero — each unique medicine is enriched once globally, not per user.

---

## Roadmap

### V1 — MVP ✅
- User auth (Google + Apple)
- Medicine cabinet (manual + photo)
- AI enrichment (usage, dosage, side effects)
- Symptom search
- Dosage reminders
- AI response caching

### V2 — Planned 🔜
- Medicine expiry tracking + alerts
- Family cabinet sharing (multi-user)
- Medicine interaction warnings
- Bedrock vision instead of Textract (cost savings)
- Offline mode (React Query + cache)
- Allergy/intolerance profile

---

## Getting Started

> Full setup instructions coming with the implementation guide.

**Prerequisites:**
- Node.js 18+
- Expo CLI
- AWS account (free tier)
- AWS CLI configured

**Quick start:**
```bash
git clone https://github.com/your-org/medcheck
cd medcheck
npm install
npx expo start
```

---

## Disclaimer

MedCheck provides **general information only**. It is not a substitute for professional medical advice. Always consult a doctor or pharmacist for medical decisions.
