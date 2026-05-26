import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export interface EtlStackProps extends cdk.StackProps {
  /**
   * Postgres connection URLs sourced from the shared `infrastructure/.env` at
   * synth time (see bin/app.ts) and injected as Lambda environment variables.
   *
   * Both must be Supabase **session-mode pooler** URLs — host
   * `aws-0-<region>.pooler.supabase.com`, port `5432`, user
   * `postgres.<project-ref>`. The pooler is IPv4-reachable (the direct
   * `db.<ref>.supabase.co` endpoint is IPv6-only and unreachable from Lambda's
   * IPv4 egress), and session mode keeps pg8000's server-side prepared
   * statements valid across the ETL's per-batch transactions.
   */
  readonly secrets: {
    /** OLTP (source) Supabase pooler URL → `SOURCE_DB_URL`. */
    readonly sourceDbUrl: string;
    /** Analytics (target) Supabase pooler URL → `TARGET_DB_URL`. */
    readonly targetDbUrl: string;
  };
}

/**
 * Scheduled analytics ETL.
 *
 * Packages `player-analytics/etl` (Python 3.12) and runs it on a daily
 * EventBridge schedule: each invocation extracts new OLTP rows since the
 * watermark, resolves star-schema dim keys, and loads `brawler_fact` in the
 * analytics Supabase project (see player-analytics/etl/README.md).
 *
 * Unlike the SQS write path (LambdaStack), this function is **not** VPC-bound:
 * it only talks to public Supabase pooler endpoints and does not need the
 * allowlisted NAT egress IP, so the default Lambda-managed network (IPv4) is
 * sufficient and avoids the ENI cold-start overhead of VPC attachment.
 */
export class EtlStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EtlStackProps) {
    super(scope, id, props);

    const { secrets } = props;

    // PythonFunction bundles the entry dir and pip-installs requirements.txt
    // into the asset root (via Docker), so handler.py and its deps (pg8000,
    // python-dotenv, ...) all land at the package root — exactly what the ETL's
    // flat imports (`from config import ...`) and `handler.lambda_handler`
    // entry point need. assetExcludes keeps local-only files out of the zip —
    // most importantly `.env`, so DB credentials are never baked into the asset.
    const etl = new PythonFunction(this, 'AnalyticsEtl', {
      runtime: Runtime.PYTHON_3_12,
      // Stable name so the externally-owned EventBridge Scheduler target keeps
      // resolving across redeploys (a generated name changes on replacement).
      functionName: 'brawl-analytics-etl',
      entry: path.join(__dirname, '../../../player-analytics/etl'),
      index: 'handler.py',
      handler: 'lambda_handler',
      memorySize: 256, // batch ETL is IO-bound; 256 MB is plenty
      // 15 min is the Lambda hard ceiling. The ETL drains to exhaustion, so cap
      // a single invocation with the MAX_BATCHES env var if runs grow long.
      timeout: cdk.Duration.minutes(15),
      // No reserved concurrency: this account's Lambda concurrency limit is too
      // low to reserve any (Lambda keeps a minimum of 10 unreserved). It isn't
      // needed for correctness — the schedule fires once daily and the ETL is
      // idempotent (watermark advance + fact insert share one txn; inserts are
      // ON CONFLICT DO NOTHING), so even an overlapping run replays cleanly.
      // Request a Lambda concurrency quota increase to restore a hard guard.
      environment: {
        SOURCE_DB_URL: secrets.sourceDbUrl,
        TARGET_DB_URL: secrets.targetDbUrl,
      },
      bundling: {
        assetExcludes: [
          '.env',
          '.env.example',
          '.venv',
          'tests',
          '__pycache__',
          'README.md',
        ],
      },
    });

    // The daily trigger is the externally-created EventBridge Scheduler
    // schedule (arn:aws:scheduler:...:schedule/default/brawl-analytics-etl),
    // not an events.Rule here — point that schedule's target at this ARN.
    new cdk.CfnOutput(this, 'AnalyticsEtlFunctionArn', {
      value: etl.functionArn,
      description:
        'Set the brawl-analytics-etl EventBridge Scheduler target to this ARN',
    });
  }
}
