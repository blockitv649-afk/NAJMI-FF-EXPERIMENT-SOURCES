
// utils/imageUtils.ts

/**
 * Converts a File object (e.g., from an input type="file") into a Base64 encoded string.
 * @param file The File object to convert.
 * @returns A promise that resolves with the Base64 string, or rejects if an error occurs.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // The result will be a data URL (e.g., "data:image/png;base64,iVBORw0K...").
      // We need to extract only the base64 part.
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};