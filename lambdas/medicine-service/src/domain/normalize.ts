/**
 * Canonical medicine-name form used as the dedup key and the AICache partition
 * key. Every DynamoDB write and cache lookup must go through this so the same
 * medicine typed by two users resolves to one cached Bedrock response.
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}
