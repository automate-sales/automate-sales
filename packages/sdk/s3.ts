import dotenv from 'dotenv';
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}`});
import { createReadStream } from 'fs'

import { 
    S3Client, 
    HeadBucketCommand, 
    CreateBucketCommand, 
    PutBucketPolicyCommand, 
    ListObjectsV2Command, 
    DeleteObjectCommand, 
    PutObjectCommand 
} from "@aws-sdk/client-s3";
import sharp from 'sharp';
import { File, Formidable } from 'formidable';

console.log('NODE NEV', NODE_ENV)

const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || 'http://localhost:9000'
const PROJECT_NAME = process.env.PROJECT_NAME || 'automation'
const s3ClientConfig = NODE_ENV !== 'production' ? {
    credentials: {
        accessKeyId: 'minio',
        secretAccessKey: 'password',
    },
    endpoint: MEDIA_BASE_URL,
    forcePathStyle: true,
    signatureVersion: 'v4'
} : {};

export const s3Client = new S3Client(s3ClientConfig);

export const bucketExists = async (bucketName: string) => {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        return true;
    } catch (err: any) {
        if (err?.name && err.name === 'NoSuchBucket' || 'NotFound') return false;
        else throw new Error(err);
    }
}

export const createPublicBucket = async (bucketName: string) => {
    if (!await bucketExists(bucketName)) {
        console.log(`Creating a new public bucket: ${bucketName}`);
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        const policy = {
            Version: "2012-10-17",
            Statement: [{
                Sid: "PublicReadGetObject",
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: [
                    `arn:aws:s3:::${bucketName}/*`,
                    `arn:aws:s3:::${bucketName}`
                ]
            }]
        };
        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(policy)
        }));
        console.log('done!');
    } else console.log(`bucket ${bucketName} already exists`);
};

export const wipeS3Bucket = async (bucketName: string) => {
    const listObjectsResult = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName })) || { Contents: [] };
    const objects = listObjectsResult.Contents ? listObjectsResult.Contents.map(object => ({ Key: object.Key })) : null;
    const deletePromises = objects ? objects.map(object => s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: object.Key }))) : null;
    deletePromises && await Promise.all(deletePromises);
}

export const uploadImageToS3 = async (
    bucketName: string,
    key: string,
    imageBuffer: Buffer,
    mime_type?: string
) => {
    const res = await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: imageBuffer,
        ContentDisposition: "inline",
        ...(mime_type && { ContentType: mime_type })
    }));
    console.log(`Uploaded image to S3: ${key}`, res); 
}

export async function uploadFileToS3(file: File | ArrayBuffer, key: string ): Promise<string> {
    console.log('UPLOADING TO S#')
    const fileStream = 'filepath' in file ? createReadStream(file.filepath) : Buffer.from(file as ArrayBuffer)
    console.log('KEYYYY! ', key)
    console.log('FILE STREAM: ', fileStream)
    const uploadParams = {
        Bucket: `${PROJECT_NAME}-media`,
        Key: key,
        Body: fileStream,
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        return `${MEDIA_BASE_URL}/${uploadParams.Bucket}/${uploadParams.Key}`;
    } catch (err) {
        console.error("Error", err);
        throw err;
    }
}

export const downloadImage = async (imageUrl: string) => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from URL: ${response.statusText}`);
    } else return Buffer.from(await response.arrayBuffer());
};

export const optimizeImage = async (imageBuffer: Buffer) => {
    const max_width = 1500
    const image = sharp(imageBuffer).jpeg({ mozjpeg: true })
    const metadata = await image.metadata()
    if(metadata?.width && metadata.width > max_width) return await image.resize(max_width).toBuffer()
    else return image.toBuffer()
};

export const uploadImageFromURL = async (
    bucketName: string,
    imageUrl: string,
    key: string
) => {
    try {
        const imageBuffer = await downloadImage(imageUrl);
        const optimizedImageBuffer = await optimizeImage(imageBuffer);
        return await uploadImageToS3(bucketName, key, optimizedImageBuffer);
    } catch (error) {
        console.error(`Error migrating image, ${imageUrl}, to S3: ${error}`);
    }
}

export const getTypeFromMime =(mimeType?: string | null) : string=> {
    const audioTypes = [
        'audio/aac', 
        'audio/mp4', 
        'audio/mpeg', 
        'audio/amr', 
        'audio/ogg',
        'audio/webm',
    ];
    const imageTypes = [
        'image/png', 
        'image/jpeg', 
        'image/jpg', 
        'image/tiff'
    ];
    const videoTypes = [
        'video/mp4',
        'video/3gp'
    ]
    const documentTypes = [
        'application/pdf',
        'application/json',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (mimeType) {
        if (audioTypes.includes(mimeType) || mimeType.startsWith('audio')) return 'audio';
        else if (imageTypes.includes(mimeType)) return 'image';
        else if(videoTypes.includes(mimeType)) return 'video';
        else if (mimeType === 'image/webp') return 'sticker';
        else if (documentTypes.includes(mimeType)) return 'document';
    }
    return 'text';
}
