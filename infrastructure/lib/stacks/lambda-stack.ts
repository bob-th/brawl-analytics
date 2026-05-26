import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export interface LambdaStackProps extends cdk.StackProps {
  /**
   * Shared VPC created by the NetworkStack. The write-path Lambda runs in its
   * private subnets so its Brawl Stars API calls egress through the static
   * fck-nat IP — the Brawl API allowlists by source IP.
   */
  readonly vpc: IVpc;

  /**
   * ARN of the existing SQS queue the coordinator-service publishes tag batches
   * to (`{ playerTags: [...] }`, <=25 tags each). The queue is owned/created
   * elsewhere, so we import it rather than define it here.
   */
  readonly tagBatchQueueArn: string;

  /**
   * Secrets sourced from the shared `infrastructure/.env` at synth time (see
   * bin/app.ts) and injected as Lambda environment variables.
   */
  readonly secrets: {
    readonly supabaseUrl: string;
    readonly supabaseServiceRoleKey: string;
    /**
     * Brawl Stars developer key registered to the NAT egress IP. Mapped onto
     * the `BRAWL_DEVELOPER_API_KEY` env var the handler actually reads.
     */
    readonly brawlApiKey: string;
  };
}

/**
 * Serverless write path for brawl-data-service.
 *
 * Imports the existing tag-batch SQS queue and wires it to a Lambda running
 * `brawl-data-service/handlers/sqs.ts`: for each message (<=25 player tags) it
 * fetches battle logs from the Brawl Stars API and upserts them into Supabase.
 *
 * The Lambda is VPC-bound (private subnets) so its outbound calls share the
 * fck-nat static IP the Brawl API allowlists. SQS event-source polling is done
 * by the Lambda service itself, so it works regardless of the VPC placement.
 */
export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { vpc, tagBatchQueueArn, secrets } = props;

    // Import the externally-owned queue by ARN.
    const queue = Queue.fromQueueArn(this, 'TagBatchQueue', tagBatchQueueArn);

    // esbuild bundles the TS handler (and its .ts imports) into a single file;
    // @aws-sdk is provided by the Node 22 runtime and stays external by default.
    const writer = new NodejsFunction(this, 'BattleWriter', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../../brawl-data-service/handlers/sqs.ts'),
      handler: 'handler',
      depsLockFilePath: path.join(
        __dirname,
        '../../../brawl-data-service/package-lock.json',
      ),
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      memorySize: 256,
      // One message is <=25 tags, each doing ~2 Brawl API calls + 3 Supabase
      // upserts at internal concurrency 10. Network-bound and well under a
      // minute; 60s leaves headroom for slow upstreams.
      timeout: cdk.Duration.seconds(60),
      environment: {
        SUPABASE_URL: secrets.supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: secrets.supabaseServiceRoleKey,
        BRAWL_DEVELOPER_API_KEY: secrets.brawlApiKey,
      },
    });

    // One SQS message == one tag batch. `maxConcurrency` caps how many
    // invocations SQS runs in parallel so we don't exceed the Brawl Stars
    // per-key rate limit from the single shared NAT IP. The event source grants
    // the consume permissions (Receive/Delete/GetQueueAttributes) automatically.
    writer.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1,
        maxConcurrency: 2,
      }),
    );

    new cdk.CfnOutput(this, 'BattleWriterFunctionName', {
      value: writer.functionName,
      description: 'SQS-triggered Lambda that writes battle logs to Supabase',
    });
  }
}
