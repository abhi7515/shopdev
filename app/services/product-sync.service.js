/**
 * Product Sync Service
 * Syncs products from Shopify to local cache for faster retrieval
 */

import { StorefrontService } from './storefront.service.js';

export class ProductSyncService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Sync all products for a shop
   */
  async syncProducts(shop, storefrontAccessToken) {
    console.log(`Starting product sync for ${shop}...`);
    
    const storefrontService = new StorefrontService(shop, storefrontAccessToken);
    
    try {
      // Fetch all products from Storefront API
      const products = await storefrontService.fetchAllProducts();
      console.log(`Fetched ${products.length} products from ${shop}`);

      // Upsert products to cache
      let syncedCount = 0;
      for (const product of products) {
        await this.upsertProductCache(shop, product);
        syncedCount++;
      }

      console.log(`Successfully synced ${syncedCount} products for ${shop}`);
      
      return {
        success: true,
        totalProducts: syncedCount,
        shop
      };
    } catch (error) {
      console.error(`Error syncing products for ${shop}:`, error);
      throw error;
    }
  }

  /**
   * Upsert a product to cache
   */
  async upsertProductCache(shop, product) {
    try {
      await this.db.productCache.upsert({
        where: {
          id_shop: {
            id: product.id,
            shop: shop
          }
        },
        update: {
          title: product.title,
          description: product.description || '',
          vendor: product.vendor || '',
          productType: product.productType || '',
          tags: product.tags.join(','),
          variants: JSON.stringify(product.variants),
          images: JSON.stringify(product.images),
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          available: product.available,
          lastSynced: new Date()
        },
        create: {
          id: product.id,
          shop: shop,
          title: product.title,
          description: product.description || '',
          vendor: product.vendor || '',
          productType: product.productType || '',
          tags: product.tags.join(','),
          variants: JSON.stringify(product.variants),
          images: JSON.stringify(product.images),
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          available: product.available,
          lastSynced: new Date()
        }
      });
    } catch (error) {
      console.error(`Error upserting product ${product.id}:`, error);
    }
  }

  /**
   * Get products from cache
   */
  async getProductsFromCache(shop, limit = 100) {
    const products = await this.db.productCache.findMany({
      where: { shop },
      take: limit,
      orderBy: { lastSynced: 'desc' }
    });

    return products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      vendor: p.vendor,
      productType: p.productType,
      tags: p.tags ? p.tags.split(',') : [],
      variants: JSON.parse(p.variants),
      images: JSON.parse(p.images),
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      available: p.available
    }));
  }

  /**
   * Search products in cache
   */
  async searchProductsInCache(shop, searchQuery) {
    const products = await this.db.productCache.findMany({
      where: {
        shop,
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { contains: searchQuery, mode: 'insensitive' } },
          { vendor: { contains: searchQuery, mode: 'insensitive' } },
          { productType: { contains: searchQuery, mode: 'insensitive' } }
        ]
      },
      take: 50,
      orderBy: { title: 'asc' }
    });

    return products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      vendor: p.vendor,
      productType: p.productType,
      tags: p.tags ? p.tags.split(',') : [],
      variants: JSON.parse(p.variants),
      images: JSON.parse(p.images),
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      available: p.available
    }));
  }

  /**
   * Check if sync is needed (older than 24 hours)
   */
  async needsSync(shop) {
    const latestProduct = await this.db.productCache.findFirst({
      where: { shop },
      orderBy: { lastSynced: 'desc' }
    });

    if (!latestProduct) return true;

    const hoursSinceSync = (Date.now() - latestProduct.lastSynced.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  }

  /**
   * Schedule periodic sync (call this from a cron job or worker)
   */
  async scheduledSync(shop, storefrontAccessToken) {
    if (await this.needsSync(shop)) {
      console.log(`Scheduled sync triggered for ${shop}`);
      return await this.syncProducts(shop, storefrontAccessToken);
    } else {
      console.log(`Sync not needed for ${shop}, last sync was recent`);
      return { success: true, skipped: true };
    }
  }

  /**
   * Get product recommendations based on semantic similarity
   * (Simple implementation using tags and product types)
   */
  async getRecommendations(shop, productId, limit = 5) {
    const product = await this.db.productCache.findFirst({
      where: { id: productId, shop }
    });

    if (!product) return [];

    // Find similar products based on tags and type
    const tags = product.tags ? product.tags.split(',') : [];
    
    const similarProducts = await this.db.productCache.findMany({
      where: {
        shop,
        id: { not: productId },
        OR: [
          { productType: product.productType },
          { tags: { contains: tags[0] || '', mode: 'insensitive' } }
        ]
      },
      take: limit
    });

    return similarProducts.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      images: JSON.parse(p.images),
      price: p.price,
      available: p.available
    }));
  }
}

export default ProductSyncService;
