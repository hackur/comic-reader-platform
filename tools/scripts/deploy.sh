#!/bin/bash

# Deploy the static Next.js export to Cloudflare Pages.

set -e

echo "Building project..."
pnpm build:web

echo "Deploying to Cloudflare Pages..."
npx wrangler@4.88.0 pages deploy apps/web/out

echo "Deployment complete!"
echo "Your site should be available at the Cloudflare Pages URL shown above."