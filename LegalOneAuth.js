import fs from 'fs'
import fetch from 'node-fetch'
import {getSecret, setSecret} from './aws_secrets.js';
import * as S3 from './s3.js'

let params = {
    SecretId: 'prod/LegalOne'
}

// check if ./tmp/LegalOneTokenInfo.json exists and if not create it
let tokenInfo = {"ExpirationDate": ""};
try {
    tokenInfo = JSON.parse(fs.readFileSync('tmp/LegalOneTokenInfo.json'))
} catch (err) {
    console.log("Checking for tokenInfo file on S3")
    S3.downloadFileS3('LegalOneTokenInfo.json').then((result) => {
        if (result) {
            tokenInfo = JSON.parse(fs.readFileSync('tmp/LegalOneTokenInfo.json'))
        }
    }).catch((err) => {
        console.log(err)
    }).finally(() => {
        console.log("Finished checking for tokenInfo file on S3")
    });
}

async function getToken(forced = false) {
    let tokenExpired = true;
    if (!forced && tokenInfo.ExpirationDate !== "") {
        let tokenDate = new Date(tokenInfo.ExpirationDate)
        if (tokenDate !== "") {
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
        fs.writeFileSync('tmp/LegalOneTokenInfo.json', JSON.stringify(tokenInfo))
        await S3.uploadFileS3('LegalOneTokenInfo.json');
        setSecret(body.access_token)
        return body.access_token
    } else {
        let secretString = await getSecret(params)
        return secretString.THOMSON_REUTERS_TOKEN
    }
}

export {getToken as getLegalOneToken}