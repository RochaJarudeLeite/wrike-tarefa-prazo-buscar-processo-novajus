import {getSecret} from './aws_secrets.js';

var params = {
    SecretId: 'prod/wrike'
}

async function GetToken(forced = false) {
    var secretString = await getSecret(params)
    var token = secretString.wrikeKey
    return token
}

export {GetToken as GetWrikeToken}