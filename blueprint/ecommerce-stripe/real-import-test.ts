import { generateHmacAuthHeaders } from '@forklaunch/core/http';
import { safeStringify } from '@forklaunch/common';
import { readFileSync } from 'node:fs';

async function main() {
  const raw = JSON.parse(
    readFileSync(
      '/private/tmp/claude-501/-Users-family-Documents-Codex-2026-06-17-hey-man-dont-know-if-u-work/d0862f16-29f8-4c40-9f9f-ec353a948424/scratchpad/migration-cli/data/gorillamind-com/normalized.json',
      'utf8'
    )
  );

  const body = {
    products: raw.products.slice(0, 5).map((p: any) => ({
      externalId: p.externalId,
      handle: p.handle,
      sourceUrl: p.sourceUrl,
      title: p.title,
      descriptionHtml: p.descriptionHtml,
      vendor: p.vendor,
      productType: p.productType,
      tags: p.tags,
      options: p.options,
      images: p.images,
      variants: p.variants.map((v: any) => ({
        externalId: v.externalId,
        sku: v.sku || undefined,
        title: v.title,
        optionValues: v.optionValues,
        priceCents: v.priceCents,
        compareAtPriceCents: v.compareAtPriceCents || undefined,
        requiresShipping: v.requiresShipping,
        initialStock: 100
      }))
    }))
  };

  const HMAC_SECRET_KEY = 'dev-ecommerce-hmac-secret-key-change-me';
  // The signature must be computed over the path as the mounted router's
  // handler sees it (req.path is relative to the mount point), not the
  // external URL path — the router itself is mounted at /catalog-import,
  // and the POST handler sits at '/' within it.
  const signedPath = '/';
  const requestPath = '/catalog-import';
  const { authorization } = generateHmacAuthHeaders({
    secretKey: HMAC_SECRET_KEY,
    method: 'POST',
    path: signedPath,
    body
  });

  const res = await fetch(`http://localhost:8001${requestPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization
    },
    body: safeStringify(body)
  });

  console.log('status:', res.status);
  console.log(await res.text());
}

main();
