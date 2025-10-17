/**
 * LLM Service - Handles AI interactions for shopping assistance
 * Supports OpenAI and Anthropic Claude
 */

export class LLMService {
  constructor(config) {
    this.provider = config.llmProvider || 'openai';
    this.model = config.llmModel || 'gpt-4';
    this.apiKey = config.llmApiKey;
    this.maxTokens = config.maxTokens || 500;
    this.temperature = config.temperature || 0.7;
    this.customPrompt = config.customPrompt || '';
  }

  /**
   * Generate a shopping assistant response
   */
  async generateResponse(messages, context) {
    const systemPrompt = this.buildSystemPrompt(context);
    
    if (this.provider === 'openai') {
      return await this.callOpenAI(systemPrompt, messages);
    } else if (this.provider === 'anthropic') {
      return await this.callAnthropic(systemPrompt, messages);
    }
    
    throw new Error(`Unsupported LLM provider: ${this.provider}`);
  }

  /**
   * Build the system prompt with shopping context
   */
  buildSystemPrompt(context) {
    const basePrompt = `You are an AI shopping assistant for ${context.shopName}. Your role is to help customers find products, answer questions, and guide them through their shopping journey.

CAPABILITIES:
- Search and recommend products based on customer needs
- Answer product-related questions (features, sizes, materials, etc.)
- Help customers compare products
- Assist with adding items to cart
- Guide checkout process
- Provide personalized shopping advice

AVAILABLE PRODUCTS (${context.products?.length || 0} products):
${this.formatProductsForContext(context.products)}

CURRENT CONVERSATION CONTEXT:
- Cart Items: ${context.cartItems?.length || 0}
- Customer Previous Interests: ${context.previousInterests || 'None'}

GUIDELINES:
1. Be friendly, helpful, and concise
2. When recommending products, reference them by name with clear details
3. If a product is out of stock, suggest alternatives
4. Always confirm before adding items to cart
5. Use natural, conversational language
6. If you don't have information, be honest
7. Focus on understanding customer needs before suggesting products
8. Highlight product benefits and use cases
9. Use markdown formatting for better readability

${this.customPrompt ? `\nCUSTOM INSTRUCTIONS:\n${this.customPrompt}` : ''}

Remember: Your goal is to provide an exceptional shopping experience that's better than traditional search.`;

    return basePrompt;
  }

  /**
   * Format products for context (summarized to fit token limits)
   */
  formatProductsForContext(products) {
    if (!products || products.length === 0) return 'No products available';
    
    // Limit to first 50 products to manage token usage
    const limitedProducts = products.slice(0, 50);
    
    return limitedProducts.map(p => 
      `- ${p.title} (ID: ${p.id}) - ${p.price} - ${p.description?.substring(0, 100) || 'No description'}${p.available ? '' : ' [OUT OF STOCK]'}`
    ).join('\n');
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(systemPrompt, messages) {
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: apiMessages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
      provider: 'openai'
    };
  }

  /**
   * Call Anthropic Claude API
   */
  async callAnthropic(systemPrompt, messages) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
      provider: 'anthropic'
    };
  }

  /**
   * Extract product intents from user message
   * Uses pattern matching and keywords
   */
  extractProductIntent(userMessage) {
    const intent = {
      action: null, // search, add_to_cart, remove_from_cart, checkout, compare
      products: [],
      filters: {},
      quantity: 1
    };

    const lowerMessage = userMessage.toLowerCase();

    // Detect actions
    if (lowerMessage.match(/add|want|need|buy|purchase|get|order/)) {
      intent.action = 'add_to_cart';
    } else if (lowerMessage.match(/remove|delete|take out/)) {
      intent.action = 'remove_from_cart';
    } else if (lowerMessage.match(/checkout|pay|complete|finish|done shopping/)) {
      intent.action = 'checkout';
    } else if (lowerMessage.match(/compare|difference|versus|vs\./)) {
      intent.action = 'compare';
    } else if (lowerMessage.match(/show|find|search|looking for|need|want to see/)) {
      intent.action = 'search';
    }

    // Extract quantity
    const quantityMatch = userMessage.match(/(\d+)\s*(items?|pieces?|units?)?/i);
    if (quantityMatch) {
      intent.quantity = parseInt(quantityMatch[1]);
    }

    // Extract filters
    if (lowerMessage.match(/under|less than|cheaper than|below/)) {
      const priceMatch = userMessage.match(/\$?(\d+)/);
      if (priceMatch) {
        intent.filters.maxPrice = parseInt(priceMatch[1]);
      }
    }

    // Color detection
    const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey'];
    for (const color of colors) {
      if (lowerMessage.includes(color)) {
        intent.filters.color = color;
        break;
      }
    }

    // Size detection
    const sizes = ['xs', 'small', 'medium', 'large', 'xl', 'xxl', 's', 'm', 'l'];
    for (const size of sizes) {
      if (lowerMessage.match(new RegExp(`\\b${size}\\b`, 'i'))) {
        intent.filters.size = size.toUpperCase();
        break;
      }
    }

    return intent;
  }
}

export default LLMService;
