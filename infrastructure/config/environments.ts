import { InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';

/**
 * Networking configuration consumed by the NetworkStack.
 */
export interface VpcConfig {
  /** CIDR block for the VPC. */
  readonly cidr: string;
  /** Maximum number of Availability Zones to span. */
  readonly maxAzs: number;
  /** Number of NAT instances (fck-nat) to create — one per AZ up to this count. */
  readonly natGateways: number;
  /** EC2 instance class used for the fck-nat NAT instance. */
  readonly natInstanceClass: InstanceClass;
  /** EC2 instance size used for the fck-nat NAT instance. */
  readonly natInstanceSize: InstanceSize;
}

/**
 * Per-environment configuration. Account is intentionally omitted so the app
 * deploys to whatever account/region the AWS CLI credentials resolve to
 * (CDK_DEFAULT_ACCOUNT / CDK_DEFAULT_REGION). Pin an `account` here when you
 * want a stack bound to a specific environment.
 */
export interface EnvironmentConfig {
  readonly region: string;
  readonly vpc: VpcConfig;
}

export const environments = {
  default: {
    region: 'us-east-1',
    vpc: {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 1,
      natInstanceClass: InstanceClass.T4G,
      natInstanceSize: InstanceSize.MICRO,
    },
  } satisfies EnvironmentConfig,
} as const;
