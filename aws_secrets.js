import {GetSecretValueCommand, SecretsManagerClient, UpdateSecretCommand} from '@aws-sdk/client-secrets-manager'
// Set the AWS Region.
const REGION = 'sa-east-1'
//Set the Secrets Manager Service Object
const secretsClient = new SecretsManagerClient({region: REGION})

console.log(process.env.AWS_ACCESS_KEY_ID)
console.log(process.env.AWS_SECRET_ACCESS_KEY)

const client = new SecretsManagerClient({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

async function getSecret(params) {
    try {
        const secret = await client.send(new GetSecretValueCommand(params));
        return JSON.parse(secret.SecretString)
    } catch (error) {
        console.log(error);
        throw error
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
        console.log(error);
        throw error
    }
}

export {getSecret, setSecret}