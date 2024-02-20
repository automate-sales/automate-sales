import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { File } from 'formidable';
import { createReadStream, createWriteStream, promises as fsPromises } from 'fs';
import { extname } from 'path';
import FormData from 'form-data';
import { getTypeFromMime } from './s3';
import axios from 'axios';
import { config } from './instagram';

/**
 * Converts a webm audio file to ogg format using fluent-ffmpeg.
 * 
 * @param webmFile - The webm file to be converted.
 * @returns A promise that resolves with the converted ogg file as a Formidable File.
 */
export async function convertWebmToOgg(webmFile: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const outputPath = webmFile.filepath.replace(extname(webmFile.filepath), '') + '.ogg';

        ffmpeg(createReadStream(webmFile.filepath))
            .setFfmpegPath(ffmpegPath.path)
            .audioCodec('libopus') // Explicitly set the audio codec to libopus
            .toFormat('ogg')
            .on('error', (err: any) => {
                console.error('An error occurred: ' + err.message);
                reject(err);
            })
            .on('end', async () => {
                console.log('Conversion finished.');
                try {
                    const stats = await fsPromises.stat(outputPath);
                    const convertedFile: File = {
                        size: stats.size,
                        filepath: outputPath,
                        originalFilename: webmFile.originalFilename?.replace(extname(webmFile.originalFilename), '.ogg') || 'captured-audio.ogg',
                        newFilename: outputPath.split('/').pop() || 'captured-audio.ogg',
                        mimetype: 'audio/ogg',
                        mtime: stats.mtime,
                        hash: null,
                        hashAlgorithm: 'md5',
                        toJSON: function() {
                            return { 
                                length: stats.size,
                                mimetype: 'audio/ogg', 
                                mtime: stats.mtime || null, 
                                size: stats.size, 
                                filepath: outputPath,
                                originalFilename: webmFile.originalFilename?.replace(extname(webmFile.originalFilename), '.ogg') || 'captured-audio.ogg',
                                newFilename: outputPath.split('/').pop() || 'captured-audio.ogg'
                            };
                        }
                    };

                    resolve(convertedFile);
                } catch (error) {
                    reject(error);
                }
            })
            .pipe(createWriteStream(outputPath));
    });
}