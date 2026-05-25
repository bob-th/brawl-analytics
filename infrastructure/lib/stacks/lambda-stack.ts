import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

export interface LambdaStackProps extends cdk.StackProps {
  /** Shared VPC created by the NetworkStack (for VPC-bound Lambdas). */
  readonly vpc: IVpc;
}

/**
 * Lambda / serverless infrastructure.
 *
 * Scaffold only — intentionally defines no resources yet. Add Lambda functions,
 * their IAM roles, event sources, etc. here, then wire this stack into
 * `bin/app.ts`.
 */
export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // TODO: define Lambda resources here. To run inside the shared VPC, pass
    // `vpc: props.vpc`, e.g.:
    //
    // new lambda.Function(this, 'Worker', {
    //   runtime: lambda.Runtime.NODEJS_22_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset('path/to/handler'),
    //   vpc: props.vpc,
    //   vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    // });
  }
}
