# @med-check/lambda-notification-service

AWS Lambda function — scheduled dosage reminder delivery via SNS → FCM push notifications.

## Responsibilities

- **Triggered by EventBridge** on a 15-minute schedule (not API Gateway)
- Query the `Reminders` DynamoDB table for all reminders due in the current window
- For each due reminder, check `lastSent` to avoid duplicate pushes within the same window
- Publish a push notification payload to SNS, which forwards to FCM → user's device
- Update `lastSent` on the reminder record after a successful send

## Reminder Schedule Logic

Each reminder has a `schedule` object: `{ times: string[], frequency: "daily" | "weekly" }`.
The handler computes whether the current EventBridge fire time falls within a due window for each reminder.

## Deduplication

- `lastSent` field on the `Reminders` record prevents double-firing within a 15-minute window
- EventBridge fires every 15 min; Lambda checks `now - lastSent > threshold` before sending

## AWS Resources Used

| Resource | Purpose |
|---|---|
| EventBridge | Scheduled trigger every 15 minutes |
| DynamoDB `Reminders` | Read due reminders; write `lastSent` |
| DynamoDB `Users` | Read `fcmToken` + `timezone` per user |
| SNS | Publish mobile push via FCM platform application |

## Handler Entry Points (to be implemented)

```
src/
├── handler.ts          # Lambda entry — EventBridge scheduled event
├── scheduler.ts        # Reminder due-time evaluation logic
├── push.ts             # SNS publish + FCM payload builder
└── clients/            # DynamoDB DocumentClient, SNS client
```
