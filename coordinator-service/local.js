// Local invocation shim. Loads a .env file (dotenv is a devDependency only,
// never bundled into the Lambda) and runs the handler once, mirroring what an
// EventBridge schedule does in production. Not used by Lambda — Lambda invokes
// `aws.handler` directly and reads env vars from its own configuration.
import "./loadEnv.js";
import { handler } from "./aws.js";

handler()
  .then((summary) => {
    console.log("coordinator: local run complete", summary);
    process.exit(0);
  })
  .catch((err) => {
    console.error("coordinator: local run failed", err);
    process.exit(1);
  });
