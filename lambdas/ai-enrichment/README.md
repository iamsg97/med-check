# @med-check/lambda-ai-enrichment

AWS Lambda function — Bedrock (Claude Haiku) AI enrichment for medicine data.

## Responsibilities

- Receive a `normalizedName` from an async Lambda invocation (triggered by `medicine-service`)
- Check `AICache` DynamoDB table for an existing response (cache key = `normalizedName`)
- On **cache miss**: call Bedrock Claude Haiku with a structured JSON prompt
- Write the Bedrock response back to `AICache` with a **30-day TTL** (`ttl = now + 30d` in Unix epoch)
- Also supports **force-refresh** invocations (skips cache read, overwrites cache)
- Update the `Medicines` table entry with enriched `aiData` + `aiLastUpdated`

## Prompt Strategy

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

- Model: `anthropic.claude-haiku-20240307-v1:0` (cheapest, fastest)
- `promptHash` stored in `AICache` — invalidates stale entries when the prompt template changes
- Cache is **shared across all users** — one enrichment per unique `normalizedName`

## AWS Resources Used

| Resource | Purpose |
|---|---|
| DynamoDB `AICache` | Read/write enrichment cache (30-day TTL) |
| DynamoDB `Medicines` | Write enriched `aiData` back to the medicine record |
| Bedrock | Claude Haiku inference |

## Handler Entry Points (to be implemented)

```
src/
├── handler.ts          # Lambda entry — async invocation from medicine-service
├── prompt.ts           # Prompt builder + hash generation
├── cache.ts            # AICache read/write with TTL
└── clients/            # DynamoDB DocumentClient, Bedrock Runtime client
```
