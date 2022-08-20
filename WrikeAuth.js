import {getSecret} from './aws_secrets.js';

let params = {
    SecretId: 'prod/wrike'
}

let wrikeToken = null;

async function GetToken(forced = false) {
    if (wrikeToken == null) {
        let secretString = await getSecret(params)
        let token = secretString.wrikeKey
        if (token != null) {
            wrikeToken = token;
        }
    }
    return wrikeToken
}

export {
    GetToken as GetWrikeToken,
    wrikeToken
}