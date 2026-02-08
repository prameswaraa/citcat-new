/**
 * Custom image loader for Cloudflare Workers deployment.
 * Cloudflare Workers doesn't support Next.js Image Optimization natively,
 * so we use a passthrough loader that returns the original image URL.
 */

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudflareLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  // For external URLs (http/https), return as-is
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // For local images, return the original path
  // Cloudflare will serve from static assets
  return src;
}
