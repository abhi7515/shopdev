/**
 * SDK Products API Endpoint
 * Handles product search and retrieval
 */

// No need for json import - using Response directly
import { PrismaClient } from "@prisma/client";
import { ProductSyncService } from "../services/product-sync.service.js";

const db = new PrismaClient();

export const loader = async ({ request }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-SDK-API-Key",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = request.headers.get("X-SDK-API-Key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const config = await db.sDKConfig.findUnique({
      where: { apiKey }
    });

    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ error: "Invalid or disabled API key" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const productId = url.searchParams.get('id');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const productSyncService = new ProductSyncService(db);

    // Get specific product
    if (productId) {
      const product = await db.productCache.findFirst({
        where: { id: productId, shop: config.shop }
      });

      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const transformedProduct = {
        id: product.id,
        title: product.title,
        description: product.description,
        vendor: product.vendor,
        productType: product.productType,
        tags: product.tags ? product.tags.split(',') : [],
        variants: JSON.parse(product.variants),
        images: JSON.parse(product.images),
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        available: product.available
      };

      // Get recommendations
      const recommendations = await productSyncService.getRecommendations(
        config.shop,
        productId,
        5
      );

      return new Response(JSON.stringify({
        product: transformedProduct,
        recommendations
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Search products
    if (query) {
      const products = await productSyncService.searchProductsInCache(config.shop, query);
      
      return new Response(JSON.stringify({
        products,
        total: products.length,
        query
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all products (paginated)
    const products = await productSyncService.getProductsFromCache(config.shop, limit);
    
    return new Response(JSON.stringify({
      products,
      total: products.length
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error('SDK Products API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
};
