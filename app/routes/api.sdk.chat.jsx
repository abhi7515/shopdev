/**
 * SDK Chat API Endpoint
 * Handles chat interactions from the embedded widget
 */

// No need for json import - using Response directly
import { PrismaClient } from "@prisma/client";
import { LLMService } from "../services/llm.service.js";
import { ProductSyncService } from "../services/product-sync.service.js";

const db = new PrismaClient();

export const action = async ({ request }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-SDK-API-Key",
  };

  // Handle preflight request
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

    // Verify API key and get config
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
    const { message, conversationId, sessionId, action: userAction } = body;

    let conversation;

    // Get or create conversation
    if (conversationId) {
      conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: true, cartItems: true }
      });
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          shop: config.shop,
          sessionId: sessionId || `session_${Date.now()}`,
          messages: {
            create: {
              role: 'system',
              content: config.welcomeMessage
            }
          }
        },
        include: { messages: true, cartItems: true }
      });
    }

    // Add user message
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message
      }
    });

    // Get product context
    const productSyncService = new ProductSyncService(db);
    const products = await productSyncService.getProductsFromCache(config.shop, 100);

    // Initialize LLM service
    const llmService = new LLMService({
      llmProvider: config.llmProvider,
      llmModel: config.llmModel,
      llmApiKey: config.llmApiKey,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      customPrompt: config.customPrompt
    });

    // Extract intent
    const intent = llmService.extractProductIntent(message);

    // Build context
    const context = {
      shopName: config.shop,
      products: products,
      cartItems: conversation.cartItems,
      previousInterests: conversation.metadata
    };

    // Generate response
    const aiResponse = await llmService.generateResponse(
      conversation.messages.map(m => ({ role: m.role, content: m.content })).concat([
        { role: 'user', content: message }
      ]),
      context
    );

    // Save assistant message
    const assistantMessage = await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content
      }
    });

    // Update analytics
    await db.chatAnalytics.upsert({
      where: { conversationId: conversation.id },
      update: {
        messageCount: { increment: 2 } // user + assistant
      },
      create: {
        shop: config.shop,
        conversationId: conversation.id,
        messageCount: 2
      }
    });

    // Return response
    return new Response(JSON.stringify({
      conversationId: conversation.id,
      message: aiResponse.content,
      intent: intent,
      suggestions: [],
      cart: conversation.cartItems
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error('SDK Chat API Error:', error);
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
