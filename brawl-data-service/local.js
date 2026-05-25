// Local invocation shim for the batch write pipeline. Loads a .env file and runs
// processTagBatch once against a list of tags, mirroring what an SQS-triggered
// Lambda will do in production. Not used by Lambda — that entry point (added in
// a later step) parses tags from the SQS message and calls processTagBatch
// directly.
//
// Run via tsx so the .ts imports resolve:
//   npm run local -- "#TAG1" "#TAG2"
// or (no args) it falls back to the SAMPLE_TAGS list below.
import './loadEnv.js';
import { processTagBatch } from './services/batchProcessor.ts';

// Replace with real tags for an end-to-end smoke test, or pass them as CLI args.
const SAMPLE_TAGS = ['#2YYUVRGC9'];

const tags = process.argv.slice(2);
const playerTags = tags.length > 0 ? tags : SAMPLE_TAGS;

processTagBatch(playerTags)
  .then((summary) => {
    console.log('data-service: local batch complete', summary);
    process.exit(0);
  })
  .catch((err) => {
    console.error('data-service: local batch failed', err);
    process.exit(1);
  });
