import {GetSecretValueCommand, SecretsManagerClient, UpdateSecretCommand} from '@aws-sdk/client-secrets-manager'
// Set the AWS Region.
const REGION = 'sa-east-1'
//Set the Secrets Manager Service Object
const secretsClient = new SecretsManagerClient({region: REGION})

const client = new SecretsManagerClient({
    region: REGION,
    // credentials: {
    //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    // }
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

async function getSecret(params) {
    try {
        const data = await client.send(new GetSecretValueCommand(params));
        return JSON.parse(data.SecretString)
    } catch (error) {
        return error
    }
}

async function setSecret(newValue) {
    var params = {
        SecretId: 'prod/LegalOne',
        SecretString: JSON.stringify({'THOMSON_REUTERS_TOKEN': newValue})
    }
    try {
        const data = await client.send(new UpdateSecretCommand(params));
    } catch (error) {
        return error
    }
}

export {getSecret, setSecret}