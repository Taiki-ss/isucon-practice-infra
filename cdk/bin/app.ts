import * as cdk from "aws-cdk-lib";
import { PrivateIsuStack } from "../lib/private-isu-stack";

const app = new cdk.App();
new PrivateIsuStack(app, "PrivateIsuStack", {});
