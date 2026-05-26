#!/usr/bin/env node
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { EtlStack } from '../lib/stacks/etl-stack';
import { environments } from '../config/environments';
// Scaffolded for later — uncomment as the stack is implemented:
// import { ComputeStack } from '../lib/stacks/compute-stack';

// Load the shared environment file (infrastructure/.env, one level up from
// bin/). These values become available to stacks below — e.g. to inject into
// Lambda/EC2 environment configuration once those stacks define resources.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** Reads a required env var (from the shared .env), failing synth if it is unset. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in infrastructure/.env (see .env.example).`,
    );
  }
  return value;
}

const app = new cdk.App();

const config = environments.default;

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? config.region,
};

const network = new NetworkStack(app, 'BrawlAnalyticsNetworkStack', {
  env,
  config: config.vpc,
});

// SQS-triggered write path. Runs in the shared VPC's private subnets so its
// Brawl API calls egress the static NAT IP. Secrets and the (externally-owned)
// queue ARN come from the shared infrastructure/.env loaded above.
new LambdaStack(app, 'BrawlAnalyticsLambdaStack', {
  env,
  vpc: network.vpc,
  tagBatchQueueArn: requireEnv('SQS_QUEUE_ARN'),
  secrets: {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    // The Lambda egresses the NAT IP, so it uses the key registered to that IP.
    brawlApiKey: requireEnv('LAMBDA_BS_DEV_KEY'),
  },
});

// Scheduled analytics ETL (Python). Public egress only (Supabase pooler), so it
// runs outside the VPC. Its daily trigger is an externally-owned EventBridge
// Scheduler schedule whose target is set to this Lambda manually. Connection
// URLs come from the shared infrastructure/.env loaded above.
new EtlStack(app, 'BrawlAnalyticsEtlStack', {
  env,
  secrets: {
    sourceDbUrl: requireEnv('SOURCE_DB_URL'),
    targetDbUrl: requireEnv('TARGET_DB_URL'),
  },
});

// The ComputeStack scaffold still defines no resources, so it is left out of
// synthesis for now:
//
// new ComputeStack(app, 'BrawlAnalyticsComputeStack', { env, vpc: network.vpc });

app.synth();
