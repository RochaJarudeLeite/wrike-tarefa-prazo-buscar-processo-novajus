import * as AWS from "@aws-sdk/client-s3";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import fs from 'fs';


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
    const streamToString = (stream) =>
        new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        });

    let s3Object
    try {
        s3Object = await s3.send(new GetObjectCommand(params));
        const bodyContents = await streamToString(s3Object.Body);
        fs.writeFileSync("tmp/" + fileName, bodyContents);
        return {"content": bodyContents, "lastModified": s3Object.LastModified}
    } catch (e) {
        return false
    }
}

export {
    downloadFileS3,
    uploadFileS3
}
