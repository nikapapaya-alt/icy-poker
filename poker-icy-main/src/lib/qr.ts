import jsQR from 'jsqr';

export const DEFAULT_QR_IMAGE = '/images/bank-payment_(2)_copy_2_copy.jpg';

const MAX_QR_IMAGE_CHARS = 500_000;
const MAX_QR_IMAGE_SIDE = 640;

export function decodeQrFromImageData(data: ImageData): string | null {
  return jsQR(data.data, data.width, data.height)?.data ?? null;
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return decodeQrFromImageData(context.getImageData(0, 0, canvas.width, canvas.height));
}

export async function fileToQrDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_QR_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read this image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/png');
  if (dataUrl.length > MAX_QR_IMAGE_CHARS) throw new Error('This image is too large. Try a smaller screenshot.');
  return dataUrl;
}
