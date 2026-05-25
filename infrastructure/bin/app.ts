#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { environments } from '../config/environments';
// Scaffolded for later — uncomment as the stacks are implemented:
// import { ComputeStack } from '../lib/stacks/compute-stack';
// import { LambdaStack } from '../lib/stacks/lambda-stack';

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

// Future stacks share the VPC created above. They are scaffolded but not yet
// implemented, so they are left out of synthesis for now:
//
// new ComputeStack(app, 'BrawlAnalyticsComputeStack', { env, vpc: network.vpc });
// new LambdaStack(app, 'BrawlAnalyticsLambdaStack', { env, vpc: network.vpc });

// Reference `network` so it is clearly the wired-in stack (and to keep the
// shared VPC handle visible for the scaffolded stacks above).
void network;

app.synth();
