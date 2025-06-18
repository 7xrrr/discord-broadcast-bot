import axios from 'axios';

async function imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer' // Important for binary data
        });

        const buffer = Buffer.from(response.data, 'binary');
        const base64Image: string = buffer.toString('base64');
        return base64Image;
    } catch (error: any) {
        console.error('Error fetching or converting the image:', error.message);
        throw error;
    }
}

export default imageUrlToBase64;
