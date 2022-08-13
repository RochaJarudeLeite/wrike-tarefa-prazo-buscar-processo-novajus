import {writeFileSync} from 'fs'
import fetch from 'node-fetch'
import {getSecret, setSecret} from './aws_secrets.js';
import tokenInfo from './LegalOneTokenInfo.json' assert {type: 'json'};

// export default {
//   setToken
// }
let params = {
    SecretId: 'prod/LegalOne'
}

async function getToken(forced = false) {
    let tokenExpired = true;
    if (!forced) {
        let tokenDate = new Date(tokenInfo.ExpirationDate)
        if (tokenDate != '') {
            tokenExpired = tokenDate < Date.now()
        }
    }
    //check expiration
    if (tokenExpired) {
        let config = {
            method: 'get', headers: {
                'Authorization': 'Basic ' + process.env.THOMSON_REUTERS_AUTH
            }
        }
        const response = await fetch('https://api.thomsonreuters.com/legalone/oauth?grant_type=client_credentials', config);
        let body = await response.json();
        let dt = new Date(parseInt(body.issued_at))
        dt.setSeconds(dt.getSeconds() + parseInt(body.expires_in))
        tokenInfo.ExpirationDate = dt
        writeFileSync('./LegalOneTokenInfo.json', JSON.stringify(tokenInfo))
        setSecret(body.access_token)
        return body.access_token
    } else {
        let secretString = await getSecret(params)
        let token = secretString.THOMSON_REUTERS_TOKEN
        return token
    }
}

export {getToken as getLegalOneToken}