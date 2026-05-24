# @med-check/lambda-symptom-search

AWS Lambda function — AI-powered symptom-to-medicine matching within a user's cabinet.

## Responsibilities

- Triggered by `POST /search/symptoms` via API Gateway
- Fetch the user's **full medicine cabinet** from DynamoDB (`Medicines` table, `userId` PK)
- Send the cabinet list + symptom to Bedrock Claude Haiku: *"Which of these medicines help with {symptom}?"*
- Return ranked results with a `relevance` score (0–1) and a human-readable `explanation` per medicine

## Response Shape

```json
{
  "results": [
    {
      "medicine": { "medicineId": "...", "name": "Pan-40", "...": "..." },
      "relevance": 0.92,
      "explanation": "Pan-40 reduces gastric acid production and is commonly used for stomach pain."
    }
  ]
}
```

## Design Notes

- Results are **user-scoped** — only medicines in the requesting user's cabinet are considered
- `limit` param (default 10) caps the result list returned to the client
- No caching — symptom queries are personalized per-cabinet and typically low-frequency

## AWS Resources Used

| Resource | Purpose |
|---|---|
| DynamoDB `Medicines` | Fetch all medicines for the user |
| Bedrock | Claude Haiku — symptom matching + ranking |

## Handler Entry Points (to be implemented)

```
src/
├── handler.ts          # Lambda entry — API Gateway proxy event
├── prompt.ts           # Prompt builder for symptom matching
└── clients/            # DynamoDB DocumentClient, Bedrock Runtime client
```
