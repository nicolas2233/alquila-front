/**
 * Applies Cloudinary automatic transformations to a property image URL.
 * f_auto: best format (WebP/AVIF) for the browser
 * q_auto: automatic quality based on visual content
 * w_N: max width resize
 * c_limit: only downscale, never upscale
 */
export function cloudinaryOptimized(
  url: string | null | undefined,
  width = 800,
): string {
  if (!url) return url ?? "";
  // Only transform Cloudinary URLs
  if (!url.includes("res.cloudinary.com")) return url;

  // Insert transformation parameters before the upload version segment
  // Pattern: .../upload/v123/... → .../upload/f_auto,q_auto,w_N,c_limit/v123/...
  return url.replace(
    /\/upload\//,
    `/upload/f_auto,q_auto,w_${width},c_limit/`,
  );
}

/** 400px thumbnail — for gallery strips and card thumbnails */
export const cloudinaryThumb = (url: string | null | undefined) =>
  cloudinaryOptimized(url, 400);

/** 800px — for property cards and list views */
export const cloudinaryCard = (url: string | null | undefined) =>
  cloudinaryOptimized(url, 800);

/** 1280px — for full-screen lightbox / property detail hero */
export const cloudinaryFull = (url: string | null | undefined) =>
  cloudinaryOptimized(url, 1280);
