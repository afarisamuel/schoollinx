/**
 * High-performance client-side image compression and resizing utility.
 * Optimizes student passport portraits down to ~30KB-60KB (from 5MB-15MB raw camera files)
 * for ultra-fast background network transmission.
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  maxDimension = 600,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve, reject) => {
    // If not an image, return original file
    if (fileOrBlob.type && !fileOrBlob.type.startsWith('image/')) {
      if (fileOrBlob instanceof File) {
        return resolve(fileOrBlob);
      }
      return resolve(new File([fileOrBlob], 'document.bin', { type: fileOrBlob.type }));
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved downscaled dimensions
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(
            fileOrBlob instanceof File
              ? fileOrBlob
              : new File([fileOrBlob], 'image.jpg', { type: 'image/jpeg' })
          );
        }

        // Draw and apply bicubic smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(
                fileOrBlob instanceof File
                  ? fileOrBlob
                  : new File([fileOrBlob], 'image.jpg', { type: 'image/jpeg' })
              );
            }

            const baseName =
              fileOrBlob instanceof File
                ? fileOrBlob.name.replace(/\.[^/.]+$/, '')
                : 'student-photo';
            const compressedFile = new File([blob], `${baseName}-optimized.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
