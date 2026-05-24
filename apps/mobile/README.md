# @med-check/mobile

React Native (Expo) mobile app for MedCheck.

## Overview

The mobile app is the primary user-facing interface. It communicates exclusively with `apps/api` (the NestJS REST API) using JWT tokens issued by AWS Cognito.

## Key Features (V1)

- Google / Apple OAuth via AWS Cognito
- Medicine cabinet — add manually or by photo (OCR via Textract)
- AI-powered medicine cards (usage, dosage, side effects, warnings)
- Symptom search — find medicines in your cabinet that help
- Dosage reminders with push notifications (FCM)

## Tech

| Concern | Library |
|---|---|
| Framework | Expo SDK 51 |
| Navigation | Expo Router (file-based) |
| Auth tokens | `expo-secure-store` |
| Camera / photo | `expo-image-picker` |
| Push notifications | `expo-notifications` |
| Shared types | `@med-check/types` |

## Project Structure (to be built out)

```
src/
├── app/               # Expo Router screens (file-based routing)
│   ├── (auth)/        # Login / OAuth callback screens
│   ├── (tabs)/        # Main tab navigator
│   │   ├── cabinet/   # Medicine cabinet
│   │   ├── search/    # Symptom search
│   │   └── reminders/ # Dosage reminders
│   └── medicine/      # Medicine detail & add screens
├── components/        # Reusable UI components
├── hooks/             # Custom React hooks
├── services/          # API client, auth, notifications
├── stores/            # State management
└── utils/             # Helpers and constants
```

## Getting Started

```bash
pnpm install
pnpm --filter @med-check/mobile start
```

Requires an `.env` file with:
```
EXPO_PUBLIC_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/v1
EXPO_PUBLIC_COGNITO_CLIENT_ID=<cognito-client-id>
EXPO_PUBLIC_COGNITO_DOMAIN=<cognito-domain>
```
