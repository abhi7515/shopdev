/**
 * SDK Cart API Endpoint
 * Handles cart operations from the embedded widget
 */

// No need for json import - using Response directly
import { PrismaClient } from "@prisma/client";
import { StorefrontService } from "../services/storefront.service.js";

const db = new PrismaClient();

export const action = async ({ request }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, PUT, DELETE, OPTIONS",
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

    const body = await request.json();
    const { action: cartAction, conversationId, productId, variantId, quantity, cartId } = body;

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { cartItems: true }
    });

    if (!conversation) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    // Handle different cart actions
    switch (cartAction) {
      case 'add': {
        // Get product details from cache
        const product = await db.productCache.findFirst({
          where: { id: productId, shop: config.shop }
        });

        if (!product) {
          return new Response(JSON.stringify({ error: "Product not found" }), { 
            status: 404, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        const variants = JSON.parse(product.variants);
        const variant = variants.find(v => v.id === variantId);

        if (!variant) {
          return new Response(JSON.stringify({ error: "Variant not found" }), { 
            status: 404, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        // Add to cart
        const cartItem = await db.cartItem.create({
          data: {
            conversationId: conversation.id,
            productId: productId,
            variantId: variantId,
            quantity: quantity || 1,
            price: variant.price.toString(),
            title: `${product.title} - ${variant.title}`,
            imageUrl: product.images ? JSON.parse(product.images)[0]?.url : null
          }
        });

        // Update analytics
        await db.chatAnalytics.upsert({
          where: { conversationId: conversation.id },
          update: {
            productsAddedCart: { increment: 1 }
          },
          create: {
            shop: config.shop,
            conversationId: conversation.id,
            productsAddedCart: 1
          }
        });

        return new Response(JSON.stringify({
          success: true,
          cartItem,
          message: `Added ${product.title} to cart`
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case 'remove': {
        const { cartItemId } = body;
        
        await db.cartItem.delete({
          where: { id: cartItemId }
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Item removed from cart'
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case 'update': {
        const { cartItemId, newQuantity } = body;
        
        const updatedItem = await db.cartItem.update({
          where: { id: cartItemId },
          data: { quantity: newQuantity }
        });

        return new Response(JSON.stringify({
          success: true,
          cartItem: updatedItem
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case 'get': {
        const items = await db.cartItem.findMany({
          where: { conversationId: conversation.id }
        });

        const total = items.reduce((sum, item) => 
          sum + (parseFloat(item.price) * item.quantity), 0
        );

        return new Response(JSON.stringify({
          items,
          total: total.toFixed(2),
          itemCount: items.length
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case 'checkout': {
        // Get storefront access token (you'll need to store this)
        const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
        
        if (!storefrontToken) {
          return new Response(JSON.stringify({ 
            error: "Storefront API not configured" 
          }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const storefrontService = new StorefrontService(config.shop, storefrontToken);
        
        // Get cart items
        const items = await db.cartItem.findMany({
          where: { conversationId: conversation.id }
        });

        // Create Shopify cart
        const cart = await storefrontService.createCart(
          items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
          }))
        );

        // Update analytics
        await db.chatAnalytics.updateMany({
          where: { conversationId: conversation.id },
          data: { checkoutInitiated: true }
        });

        return new Response(JSON.stringify({
          success: true,
          checkoutUrl: cart.checkoutUrl,
          cartId: cart.id
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

  } catch (error) {
    console.error('SDK Cart API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
};

export const loader = async () => {
  return new Response(JSON.stringify({ error: "Method not allowed" }), { 
    status: 405, 
    headers: { "Content-Type": "application/json" } 
  });
};
