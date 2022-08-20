import fetch from 'node-fetch';
import {getSecret} from './aws_secrets.js';

let legalOneToken = getToken();

async function legalOneTokenPromiseCheck() {
    if (legalOneToken == null) {
        legalOneToken = await legalOneToken;
    }
}


async function GetLegalOneSecret() {
    let secretParams = {
        SecretId: 'prod/LegalOne'
    }
    console.log("Getting LegalOne Key from Secrets Manager")
    let secretResponse = await getSecret(secretParams);
    if (secretResponse == null) {
        console.log("No LegalOne Key found in Secrets Manager")
        return null
    } else {
        return secretResponse.THOMSON_REUTERS_AUTH;
        console.log("LegalOne secret retrieved");
    }
}

async function getToken(forceToken = false, retry = 3) {
    let basicAuth = await GetLegalOneSecret();
    if (basicAuth == null) {
        return null;
    }
    let config = {
        method: 'get', headers: {
            'Authorization': 'Basic ' + basicAuth
        }
    }
    const response = await fetch('https://api.thomsonreuters.com/legalone/oauth?grant_type=client_credentials', config).then((response) => {
        if (!response.ok) {
            if (retry < 3) {
                return getToken(
                    retry + 1
                )
            }
        }
        return response
    });
    let body = await response.json();
    legalOneToken = body.access_token;
    return legalOneToken;
}

export {
    legalOneTokenPromiseCheck,
    legalOneToken
}