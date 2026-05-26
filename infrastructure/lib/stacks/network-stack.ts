import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CfnEIP,
  InstanceType,
  IpAddresses,
  Peer,
  Port,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { FckNatInstanceProvider } from 'cdk-fck-nat';
import { VpcConfig } from '../../config/environments';

export interface NetworkStackProps extends cdk.StackProps {
  /** Networking configuration (CIDR, AZ count, NAT instance type, etc.). */
  readonly config: VpcConfig;
}

/**
 * Core networking for Brawl Analytics.
 *
 * Creates a VPC whose outbound traffic from private subnets is routed through a
 * fck-nat NAT instance (a low-cost alternative to a managed NAT Gateway). The
 * resulting `vpc` is exposed so future compute/Lambda stacks can attach to it.
 */
export class NetworkStack extends cdk.Stack {
  /** Shared VPC for downstream compute / Lambda stacks. */
  public readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Allocate a static Elastic IP up front. The Brawl Stars API allowlists by
    // source IP, so all outbound traffic from private subnets must egress from
    // a stable address. The fck-nat instance runs in an ASG of size 1 and
    // re-associates this same allocation on every instance replacement, so the
    // public IP never changes.
    const natEip = new CfnEIP(this, 'BrawlStarsNatEip', {
      domain: 'vpc',
    });

    // Official fck-nat CDK construct: replaces the managed NAT Gateway with a
    // cheap, self-managed NAT instance. `eipPool` takes EIP *allocation IDs*
    // (not IP addresses) — the instance calls ec2:AssociateAddress at boot,
    // which requires the allocation ID. One entry is enough here because
    // `natGateways: 1` creates a single NAT subnet/instance.
    const natGatewayProvider = new FckNatInstanceProvider({
      instanceType: InstanceType.of(config.natInstanceClass, config.natInstanceSize),
      eipPool: [natEip.attrAllocationId],
    });

    this.vpc = new Vpc(this, 'Vpc', {
      ipAddresses: IpAddresses.cidr(config.cidr),
      maxAzs: config.maxAzs,
      natGateways: config.natGateways,
      natGatewayProvider,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // Allow private subnets to send all traffic to the NAT instance.
    natGatewayProvider.securityGroup.addIngressRule(
      Peer.ipv4(this.vpc.vpcCidrBlock),
      Port.allTraffic(),
    );

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'ID of the Brawl Analytics VPC',
    });

    new cdk.CfnOutput(this, 'NatStaticIp', {
      value: natEip.ref,
      description: 'Static egress IP — allowlist this with the Brawl Stars API',
    });
  }
}
