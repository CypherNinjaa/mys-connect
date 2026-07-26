import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export { cloudinary };

export const uploadToCloudinary = async (
  fileData: Buffer | string,
  folder: string = 'mys-connect/avatars'
): Promise<string> => {
  if (typeof fileData === 'string') {
    const formattedData = fileData.startsWith('data:') ? fileData : `data:image/jpeg;base64,${fileData}`;
    const result = await cloudinary.uploader.upload(formattedData, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) return reject(new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileData);
  });
};
