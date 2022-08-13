import {getSecret} from './aws_secrets.js';

let params = {
    SecretId: 'prod/wrike'
}

async function GetToken(forced = false) {
    let secretString = await getSecret(params)
    let token = secretString.wrikeKey
    console.log(token);
    return token
}

export {GetToken as GetWrikeToken}