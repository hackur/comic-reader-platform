/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  transpilePackages: [
    '@comics-platform/comic-core',
    '@comics-platform/comic-react',
    '@comics-platform/comic-storage',
    '@comics-platform/comic-extractor-zip',
    '@comics-platform/comic-extractor-tar',
    '@comics-platform/comic-extractor-pdf',
    '@comics-platform/comic-extractor-images',
    '@comics-platform/comic-extractor-rar',
    '@comics-platform/comic-worker',
  ],
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
