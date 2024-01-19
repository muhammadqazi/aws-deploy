import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as rds from '@aws-cdk/aws-rds'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as ssm from '@aws-cdk/aws-ssm'
import { ISecurityGroup, IVpc } from '@aws-cdk/aws-ec2';
import { Secret } from '@aws-cdk/aws-secretsmanager';

interface RdsStackProps extends cdk.StackProps {
    myVpc: ec2.IVpc;
    rdsSecurityGroup: ec2.ISecurityGroup;
}

export class RdsStack extends cdk.Stack {
    readonly myRdsInstance: rds.DatabaseInstance;
    readonly databaseCredentialsSecret: Secret;

    constructor(scope: cdk.Construct, id: string, props?: RdsStackProps) {
        super(scope, id, props);

        const databaseUsername = process.env.DB_USERNAME;

        const applicationName = 'snono-dds';
        this.databaseCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentialsSecret', {
            secretName: `${applicationName}-db-credentials`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: databaseUsername
                }),
                excludePunctuation: true,
                includeSpace: false,
                generateStringKey: 'password',
            }
        });

        new ssm.StringParameter(this, 'DBCredentialsArn', {
            parameterName: `${applicationName}-db-credentials-arn`,
            stringValue: this.databaseCredentialsSecret.secretArn,
        });

        this.myRdsInstance = new rds.DatabaseInstance(this, 'MyDatabaseInstance', {
            publiclyAccessible: true,
            engine: rds.DatabaseInstanceEngine.mysql({
                version: rds.MysqlEngineVersion.VER_5_7,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
            vpc: props?.myVpc as IVpc,
            securityGroups: [props?.rdsSecurityGroup as ISecurityGroup],
            allocatedStorage: 20,
            databaseName: 'snono_dds_db',
            storageEncrypted: true,
        });
    }
}
