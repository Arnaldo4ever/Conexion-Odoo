import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  scopes: ['write_products', 'write_shipping', 'write_discounts'],
  hostName: process.env.SHOPIFY_SHOP_DOMAIN || '',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});
