import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { getPlayerTagBatches } from "./playerTags.js";

// All AWS-specific wiring lives in this file. The rest of the service (Supabase
// reads, tag batching) has no knowledge of SQS or Lambda, so it can be tested
// and reused without an AWS environment.

// SQS SendMessageBatch accepts at most 10 entries per API call. This is
// unrelated to BATCH_SIZE (which caps tags *within* one message) — here we
// group the messages themselves into chunks of 10 to cut API round-trips.
const SQS_MAX_BATCH_ENTRIES = 10;

const QUEUE_URL = process.env.SQS_QUEUE_URL;

// Region is read from AWS_REGION, which Lambda injects automatically; run
// locally it falls back to the standard AWS SDK credential/region chain.
const sqs = new SQSClient({});

// Generic chunker for the SQS 10-entries-per-request limit. Local to the AWS
// layer because the constraint it serves is an SQS detail.
function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

// Publishes one SQS message per tag batch; each message body is
// { playerTags: [...] }. Uses SendMessageBatch (<=10 entries/call) to minimize
// API round-trips. Returns counts so the caller can log/return a summary.
export async function sendTagBatches(batches) {
  if (!QUEUE_URL) {
    throw new Error("Missing SQS_QUEUE_URL env var");
  }

  let sent = 0;
  let failed = 0;

  for (const group of chunk(batches, SQS_MAX_BATCH_ENTRIES)) {
    const entries = group.map((tags, i) => ({
      // Id only needs to be unique within this single request.
      Id: String(i),
      MessageBody: JSON.stringify({ playerTags: tags }),
    }));

    const res = await sqs.send(
      new SendMessageBatchCommand({ QueueUrl: QUEUE_URL, Entries: entries })
    );

    sent += res.Successful?.length ?? 0;
    if (res.Failed?.length) {
      failed += res.Failed.length;
      console.error("sendTagBatches: SQS rejected entries:", res.Failed);
    }
  }

  return { sent, failed };
}

// Lambda entry point. Replaces the backend's node-cron trigger: wire this to an
// EventBridge schedule (e.g. rate(30 minutes)) to match the old cadence. It
// reads every tracked tag, batches it, and enqueues one message per batch for
// the brawl-data-service to consume and persist. Configure the Lambda handler
// as `aws.handler`.
export async function handler() {
  const batches = await getPlayerTagBatches();
  const tagCount = batches.reduce((n, b) => n + b.length, 0);

  console.log(
    `coordinator: enqueueing ${tagCount} tags in ${batches.length} batches`
  );

  if (batches.length === 0) {
    return { batches: 0, tags: 0, sent: 0, failed: 0 };
  }

  const { sent, failed } = await sendTagBatches(batches);
  console.log(`coordinator: done — sent=${sent} failed=${failed}`);

  return { batches: batches.length, tags: tagCount, sent, failed };
}
