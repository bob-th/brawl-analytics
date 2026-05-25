# coordinator-service

Schedules battle-sync work. It replaces the trigger half of the backend's
`node-cron` job (`syncAllPlayers`): instead of fetching and writing battles
itself, it reads every tracked player tag and publishes them to an SQS queue in
batches. The `brawl-data-service` consumes those messages and owns the
fetch-and-write step.

## Layout


| File             | Responsibility                                                                 |
| ---------------- | ------------------------------------------------------------------------------ |
| `playerTags.js`  | Reads tracked tags from Supabase and returns a list of lists (batches of ≤25). |
| `aws.js`         | All AWS wiring: the SQS client, batch publishing, and the Lambda `handler`.    |
| `database.js`    | Supabase service-role client (mirrors `backend/database.js`).                  |
| `local.js`       | Local run shim — loads `.env` and invokes the handler once.                    |

`playerTags.js` has no knowledge of SQS or Lambda, so the tag logic can be
tested and reused without an AWS environment.

## Message format

Each SQS message carries one batch of up to 25 tags:

```json
{ "playerTags": ["#ABC123", "#DEF456", "..."] }
```

`BATCH_SIZE` (25) lives in `playerTags.js`. Messages are sent via
`SendMessageBatch`, which is grouped into the SQS limit of 10 entries per API
call.

## Environment

| Variable                    | Used by      | Notes                                              |
| --------------------------- | ------------ | -------------------------------------------------- |
| `SUPABASE_URL`              | `database.js`| Same project as the backend.                       |
| `SUPABASE_SERVICE_ROLE_KEY` | `database.js`| Service-role key; never expose to the browser.     |
| `SQS_QUEUE_URL`             | `aws.js`     | Target queue the data-service consumes.            |
| `AWS_REGION`                | AWS SDK      | Injected automatically in Lambda.                  |

## Deploy as Lambda

1. `npm ci --omit=dev` and zip the directory (or use your bundler of choice).
2. Runtime: Node.js 20+. **Handler: `aws.handler`**.
3. Grant the function `sqs:SendMessage` / `sqs:SendMessageBatch` on the queue.
4. Trigger it on a schedule with EventBridge, e.g. `rate(30 minutes)` to match
   the old cron cadence.

## Run locally

```bash
npm install
# create a .env with the variables above
npm start
```
