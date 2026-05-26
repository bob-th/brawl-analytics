import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

export interface ComputeStackProps extends cdk.StackProps {
  /** Shared VPC created by the NetworkStack. */
  readonly vpc: IVpc;
}

/**
 * EC2 / compute infrastructure.
 *
 * Scaffold only — intentionally defines no resources yet. Add EC2 instances,
 * Auto Scaling Groups, security groups, etc. here, then wire this stack into
 * `bin/app.ts`.
 */
export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // TODO: define EC2 resources here, attaching them to `props.vpc`, e.g.:
    //
    // new ec2.Instance(this, 'AppServer', {
    //   vpc: props.vpc,
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
    //   machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    //   vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    // });
  }
}
