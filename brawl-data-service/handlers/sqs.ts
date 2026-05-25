import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { processTagBatch } from '../services/batchProcessor.ts';

// AWS Lambda entry point for the SQS-triggered write path. Configure the Lambda
// handler as the `handler` export of this file (e.g. `handlers/sqs.handler`),
// and set its trigger to the queue the coordinator-service publishes to.
//
// Each SQS message body is `{ "playerTags": [...] }` (≤25 tags) — see
// coordinator-service/aws.js. A single Lambda invocation may deliver several
// messages, so we iterate event.Records and process each batch.
//
// Deploy: bundle TS→JS (esbuild/tsx) or ship a container image like the existing
// Dockerfile (`npx tsx`). No @aws-sdk dependency is needed for *consuming* SQS —
// the runtime hands us the event.

interface BatchMessage {
  playerTags: string[];
}

// A malformed message body shouldn't sink the whole invocation. We log and skip
// it; writes are idempotent (ON CONFLICT DO NOTHING) and the coordinator
// re-enqueues every tick, so a dropped message self-heals. (To get true
// per-message retries instead, enable SQS ReportBatchItemFailures here and
// return { batchItemFailures } for the records that threw.)
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  let totalOk = 0;
  let totalFailed = 0;

  for (const record of event.Records) {
    let playerTags: string[];
    try {
      const parsed = JSON.parse(record.body) as BatchMessage;
      playerTags = parsed.playerTags;
      if (!Array.isArray(playerTags)) {
        throw new Error('message body missing playerTags array');
      }
    } catch (err) {
      console.error(
        `sqs handler: skipping unparseable message ${record.messageId}:`,
        err,
      );
      continue;
    }

    const { ok, failed } = await processTagBatch(playerTags);
    totalOk += ok;
    totalFailed += failed;
  }

  console.log(
    `sqs handler: done — messages=${event.Records.length} ok=${totalOk} failed=${totalFailed}`,
  );
};
