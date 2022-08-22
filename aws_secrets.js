import {GetSecretValueCommand, SecretsManagerClient, UpdateSecretCommand} from '@aws-sdk/client-secrets-manager'

const REGION = 'sa-east-1'

const client = new SecretsManagerClient({
    region: REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

async function getSecret(params) {
    try {
        const data = await client.send(new GetSecretValueCommand(params));
        return JSON.parse(data.SecretString)
    } catch (error) {
        console.log('Error getting Secret: ' + error)
        // return empty object
        return null
    }
}

async function setSecret(params) {
    try {
        const data = await client.send(new UpdateSecretCommand(params));
    } catch (error) {
        return error
    }
}

export {getSecret, setSecret}