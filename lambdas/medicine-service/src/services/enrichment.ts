import type { Medicine } from "@med-check/types";

/**
 * Kicks off AI enrichment for a newly saved medicine.
 *
 * Per CLAUDE.md this is an *async* Lambda invocation (Event type) — the caller
 * returns the medicine card immediately and the enrichment result lands later
 * via the AICache. Failures here must never surface to the user, so everything
 * is swallowed and logged.
 *
 * The ai-enrichment Lambda is not built yet, so with no function name
 * configured this just logs the intent and returns.
 */
export async function requestEnrichment(medicine: Medicine): Promise<void> {
  const functionName = process.env.AI_ENRICHMENT_FUNCTION_NAME;

  if (!functionName) {
    console.info(
      `[enrichment] skipped for "${medicine.normalizedName}" — AI_ENRICHMENT_FUNCTION_NAME not set`,
    );
    return;
  }

  try {
    // Imported lazily so local dev and unit tests don't pay for the AWS SDK.
    const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
    const client = new LambdaClient({});
    await client.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
        Payload: Buffer.from(
          JSON.stringify({
            userId: medicine.userId,
            medicineId: medicine.medicineId,
            normalizedName: medicine.normalizedName,
          }),
        ),
      }),
    );
  } catch (err) {
    console.error(
      `[enrichment] failed to invoke for "${medicine.normalizedName}"`,
      err,
    );
  }
}
