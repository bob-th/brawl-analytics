# Infrastructure (AWS CDK)

AWS CDK (TypeScript) app for Brawl Analytics. The only implemented stack today
is the **NetworkStack**, which provisions a VPC backed by a
[fck-nat](https://github.com/AndrewGuenther/cdk-fck-nat) NAT instance — a
low-cost replacement for a managed NAT Gateway. The project is structured so
EC2 and Lambda stacks can be added later without reshuffling.

## Layout

```
infrastructure/
├── bin/
│   └── app.ts                  # CDK app entrypoint — instantiates stacks
├── config/
│   └── environments.ts         # Region / VPC / NAT-instance configuration
├── lib/
│   ├── stacks/
│   │   ├── network-stack.ts    # VPC + fck-nat NAT instance (implemented)
│   │   ├── compute-stack.ts    # EC2 — scaffold, no resources yet
│   │   └── lambda-stack.ts     # Lambda — scaffold, no resources yet
│   └── constructs/             # Reusable constructs (shared building blocks)
├── cdk.json                    # CDK app config + feature flags
├── package.json
└── tsconfig.json
```

Adding a new stack: implement it under `lib/stacks/`, then instantiate it in
`bin/app.ts`. The scaffolded `ComputeStack` / `LambdaStack` already accept the
shared `vpc` from the `NetworkStack` — uncomment them in `bin/app.ts` once they
define real resources.

## Prerequisites

- Node.js 20+ and the AWS CLI configured with credentials
  (`aws configure` or an SSO profile).
- One-time per account/region: bootstrap the CDK toolkit:

  ```sh
  npm run bootstrap
  ```

## Usage

```sh
npm install          # install dependencies

npm run synth        # synthesize the CloudFormation template (no AWS calls)
npm run diff         # diff the app against deployed state
npm run deploy       # deploy the NetworkStack
npm run destroy      # tear it down
```

`cdk` reads the target account/region from your AWS credentials
(`CDK_DEFAULT_ACCOUNT` / `CDK_DEFAULT_REGION`). Override the default region in
`config/environments.ts`.

## Configuration

Network settings live in `config/environments.ts` — VPC CIDR, AZ count, NAT
instance count, and the fck-nat instance class/size (default `t4g.nano`).
