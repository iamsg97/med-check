# @med-check/types

Shared TypeScript types and interfaces used across the MedCheck monorepo — mobile app, NestJS API, and Lambda functions.

## Planned Types

Based on the system design in `CLAUDE.md`:

- **Domain models:** `User`, `Medicine`, `Reminder`, `AIData`, `AICache`
- **API request/response shapes:** per endpoint (see CLAUDE.md § Request / Response Shapes)
- **Lambda event/result types:** per function
- **DynamoDB item types:** per table

## Usage

```ts
import type { Medicine, AIData } from "@med-check/types";
```

All consumers declare `"@med-check/types": "workspace:*"` in their `package.json`.
