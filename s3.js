import * as AWS from "@aws-sdk/client-s3";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import fs from 'fs';
import axios from 'axios';


const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'sa-east-1'
})

const s3Bucket = "lambda-functions-rj"

async function uploadFileS3(fileName) {
    // Read content from the file
    const fileContent = fs.readFileSync(fileName)

    // Setting up S3 upload parameters
    const params = {
        Bucket: s3Bucket,
        Body: fileContent,
        Key: fileName
    }

    // Uploading files to the bucket using
    try {
        await s3.send(new PutObjectCommand(params));
        console.log("Successfully uploaded object to " + s3Bucket);
    } catch (err) {
        console.log("Error", err);
    }
}

async function downloadFileS3(fileName) {
    let params = {
        Bucket: s3Bucket,
        Key: fileName
    }
    let s3Object
    try {
        s3Object = await s3.getObject(params);
    } catch (NoSuchKey) {
        return false
    }

    params.Expires = 3000

    const url = await s3.getSignedUrlPromise('getObject', params).catch((err) => {
        console.log(err)
    })
    const res = await axios.get(url, {
        responseType: 'stream'
    })
    const istream = res.data
    const ostream = fs.createWriteStream("tmp/" + fileName)
    istream.pipe(ostream)
    ostream.on('finish', () => {
        console.log('file download finished')
    })
    return s3Object.LastModified
}

export {
    downloadFileS3,
    uploadFileS3
}
