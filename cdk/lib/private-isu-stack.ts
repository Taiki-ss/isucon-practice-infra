import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class PrivateIsuStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "PrivateIsuVpc", {
      vpcName: "PrivateIsuVpc",
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const role = new iam.Role(this, "PrivateIsuSsmRole", {
      roleName: "PrivateIsuSsmRole",
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    const benchMarkerSecurityGroup = new ec2.SecurityGroup(
      this,
      "PrivateIsuBenchMarkerSecurityGroup",
      {
        vpc,
        securityGroupName: "PrivateIsuBenchMarkerSecurityGroup",
      }
    );

    const benchMarkerInstance = new ec2.Instance(
      this,
      "PrivateIsuBenchMarkerInstance",
      {
        instanceName: "PrivateIsuBenchMarkerInstance",
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.C5,
          ec2.InstanceSize.LARGE
        ),
        machineImage: ec2.MachineImage.genericLinux({
          /** @see https://github.com/catatsuy/private-isu?tab=readme-ov-file#ami */
          "ap-northeast-1": "ami-037be39355baf1f2e",
        }),
        role,
        securityGroup: benchMarkerSecurityGroup,
      }
    );

    const targetSecurityGroup = new ec2.SecurityGroup(
      this,
      "PrivateIsuTargetSecurityGroup",
      {
        vpc,
        securityGroupName: "PrivateIsuTargetSecurityGroup",
      }
    );

    targetSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(`${process.env.MY_IP_ADDRESS}/32`),
      ec2.Port.tcp(80)
    );

    targetSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(benchMarkerInstance.instancePublicIp + "/32"),
      ec2.Port.tcp(80)
    );

    new ec2.Instance(this, "PrivateIsuTargetInstance", {
      instanceName: "PrivateIsuTargetInstance",
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.C5,
        ec2.InstanceSize.LARGE
      ),
      machineImage: ec2.MachineImage.genericLinux({
        /** @see https://github.com/catatsuy/private-isu?tab=readme-ov-file#ami */
        "ap-northeast-1": "ami-047fdc2b851e73cad",
      }),
      securityGroup: targetSecurityGroup,
      role,
    });
  }
}
