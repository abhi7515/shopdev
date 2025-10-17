/**
 * SDK Dashboard - Merchant configuration interface
 */

import { useState, useEffect, useCallback } from "react";
import { Form, useLoaderData, useActionData, useSubmit } from "react-router";
// No need for json import - using plain objects for Shopify admin interface
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";
import { ProductSyncService } from "../services/product-sync.service.js";

const db = new PrismaClient();

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get or create SDK config
  let config = await db.sDKConfig.findUnique({
    where: { shop }
  });

  if (!config) {
    // Generate API key
    const apiKey = `sai_${Buffer.from(`${shop}_${Date.now()}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
    
    config = await db.sDKConfig.create({
      data: {
        shop,
        apiKey,
        enabled: false
      }
    });
  }

  // Get analytics
  const analytics = await db.chatAnalytics.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  const totalConversations = await db.conversation.count({
    where: { shop }
  });

  const totalMessages = await db.message.count({
    where: {
      conversation: { shop }
    }
  });

  const checkouts = analytics.filter(a => a.checkoutInitiated).length;
  const conversions = analytics.filter(a => a.checkoutCompleted).length;

  return {
    config,
    stats: {
      totalConversations,
      totalMessages,
      checkouts,
      conversions,
      conversionRate: checkouts > 0 ? ((conversions / checkouts) * 100).toFixed(2) : 0
    }
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'update_config') {
    const config = await db.sDKConfig.update({
      where: { shop },
      data: {
        enabled: formData.get('enabled') === 'true',
        llmProvider: formData.get('llmProvider'),
        llmModel: formData.get('llmModel'),
        llmApiKey: formData.get('llmApiKey') || undefined,
        widgetPosition: formData.get('widgetPosition'),
        primaryColor: formData.get('primaryColor'),
        accentColor: formData.get('accentColor'),
        welcomeMessage: formData.get('welcomeMessage'),
        customPrompt: formData.get('customPrompt') || undefined,
        maxTokens: parseInt(formData.get('maxTokens')),
        temperature: parseFloat(formData.get('temperature'))
      }
    });

    return { success: true, config };
  }

  if (action === 'sync_products') {
    try {
      const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
      
      if (!storefrontToken) {
        return { 
          success: false, 
          error: 'Storefront API token not configured' 
        };
      }

      const syncService = new ProductSyncService(db);
      const result = await syncService.syncProducts(shop, storefrontToken);

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  if (action === 'regenerate_key') {
    const apiKey = `sai_${Buffer.from(`${shop}_${Date.now()}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
    
    const config = await db.sDKConfig.update({
      where: { shop },
      data: { apiKey }
    });

    return { success: true, config };
  }

  return { success: false, error: 'Invalid action' };
};

export default function SDKDashboard() {
  const { config, stats } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [formData, setFormData] = useState({
    enabled: config.enabled,
    llmProvider: config.llmProvider,
    llmModel: config.llmModel,
    llmApiKey: config.llmApiKey || '',
    widgetPosition: config.widgetPosition,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    welcomeMessage: config.welcomeMessage,
    customPrompt: config.customPrompt || '',
    maxTokens: config.maxTokens,
    temperature: config.temperature
  });

  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('_action', 'update_config');
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
    });
    submit(form, { method: 'post' });
  };

  const handleSyncProducts = () => {
    const form = new FormData();
    form.append('_action', 'sync_products');
    submit(form, { method: 'post' });
  };

  const handleRegenerateKey = () => {
    if (confirm('Are you sure you want to regenerate the API key? The old key will stop working.')) {
      const form = new FormData();
      form.append('_action', 'regenerate_key');
      submit(form, { method: 'post' });
    }
  };

  const installCode = `<!-- Add this to your theme.liquid before </body> -->
<script>
  window.shopifyAIAssistantConfig = {
    apiKey: '${config.apiKey}',
    apiEndpoint: '${typeof window !== 'undefined' ? window.location.origin : 'https://your-app-domain.com'}',
    position: '${formData.widgetPosition}',
    primaryColor: '${formData.primaryColor}',
    accentColor: '${formData.accentColor}',
    welcomeMessage: '${formData.welcomeMessage}'
  };
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-app-domain.com'}/shopify-ai-assistant.js"></script>`;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>AI Shopping Assistant SDK</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Configure your AI-powered shopping assistant to help customers find products through natural conversation.
      </p>

      {actionData?.success && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#d4edda', 
          color: '#155724',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {actionData.result ? 
            `Successfully synced ${actionData.result.totalProducts} products!` : 
            'Settings saved successfully!'}
        </div>
      )}

      {actionData?.error && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {actionData.error}
        </div>
      )}

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#5C6AC4' }}>
            {stats.totalConversations}
          </div>
          <div style={{ color: '#666', marginTop: '5px' }}>Total Conversations</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#5C6AC4' }}>
            {stats.totalMessages}
          </div>
          <div style={{ color: '#666', marginTop: '5px' }}>Total Messages</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#5C6AC4' }}>
            {stats.checkouts}
          </div>
          <div style={{ color: '#666', marginTop: '5px' }}>Checkouts Initiated</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#5C6AC4' }}>
            {stats.conversionRate}%
          </div>
          <div style={{ color: '#666', marginTop: '5px' }}>Conversion Rate</div>
        </div>
      </div>

      {/* Configuration Form */}
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0 }}>Configuration</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.enabled}
                onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontWeight: 'bold' }}>Enable AI Assistant</span>
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              LLM Provider
            </label>
            <select 
              value={formData.llmProvider}
              onChange={(e) => setFormData({...formData, llmProvider: e.target.value})}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Model
            </label>
            <input 
              type="text"
              value={formData.llmModel}
              onChange={(e) => setFormData({...formData, llmModel: e.target.value})}
              placeholder="e.g., gpt-4, claude-3-sonnet"
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              LLM API Key
            </label>
            <input 
              type="password"
              value={formData.llmApiKey}
              onChange={(e) => setFormData({...formData, llmApiKey: e.target.value})}
              placeholder="Enter your LLM provider API key"
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Widget Position
            </label>
            <select 
              value={formData.widgetPosition}
              onChange={(e) => setFormData({...formData, widgetPosition: e.target.value})}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Primary Color
              </label>
              <input 
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Accent Color
              </label>
              <input 
                type="color"
                value={formData.accentColor}
                onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
                style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Welcome Message
            </label>
            <textarea 
              value={formData.welcomeMessage}
              onChange={(e) => setFormData({...formData, welcomeMessage: e.target.value})}
              rows={3}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Custom Instructions (Optional)
            </label>
            <textarea 
              value={formData.customPrompt}
              onChange={(e) => setFormData({...formData, customPrompt: e.target.value})}
              rows={4}
              placeholder="Add custom instructions for the AI assistant..."
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Max Tokens
              </label>
              <input 
                type="number"
                value={formData.maxTokens}
                onChange={(e) => setFormData({...formData, maxTokens: parseInt(e.target.value)})}
                min={100}
                max={2000}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Temperature
              </label>
              <input 
                type="number"
                value={formData.temperature}
                onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                min={0}
                max={1}
                step={0.1}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <button 
            type="submit"
            style={{ 
              background: '#5C6AC4', 
              color: 'white', 
              padding: '12px 24px', 
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Save Configuration
          </button>
        </form>
      </div>

      {/* API Key Section */}
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0 }}>API Key</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Your SDK API Key
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              readOnly
              style={{ 
                flex: 1,
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                background: '#f5f5f5'
              }}
            />
            <button 
              onClick={() => setShowApiKey(!showApiKey)}
              style={{ 
                padding: '8px 16px', 
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                background: 'white'
              }}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
            <button 
              onClick={handleRegenerateKey}
              style={{ 
                padding: '8px 16px', 
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                background: 'white'
              }}
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* Product Sync Section */}
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0 }}>Product Sync</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Sync your products to the AI assistant's knowledge base for faster responses.
        </p>
        <button 
          onClick={handleSyncProducts}
          style={{ 
            background: '#5C6AC4', 
            color: 'white', 
            padding: '12px 24px', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Sync Products Now
        </button>
      </div>

      {/* Installation Instructions */}
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0 }}>Installation</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Add the following code to your theme's <code>theme.liquid</code> file, just before the closing <code>&lt;/body&gt;</code> tag:
        </p>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px', 
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {installCode}
        </pre>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(installCode);
            alert('Installation code copied to clipboard!');
          }}
          style={{ 
            background: '#5C6AC4', 
            color: 'white', 
            padding: '12px 24px', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginTop: '15px'
          }}
        >
          Copy Installation Code
        </button>
      </div>
    </div>
  );
}
