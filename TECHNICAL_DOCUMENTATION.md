# AI Shopping Assistant SDK - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [API Reference](#api-reference)
4. [Integration Guide](#integration-guide)
5. [Database Schema](#database-schema)
6. [Security & Compliance](#security--compliance)
7. [Performance & Scalability](#performance--scalability)
8. [Deployment Guide](#deployment-guide)
9. [Development Setup](#development-setup)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Merchant Storefront                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Shopify AI Assistant Widget                     │    │
│  │         (shopify-ai-assistant.js)                       │    │
│  │                                                          │    │
│  │  • Chat UI                                               │    │
│  │  • Session Management                                    │    │
│  │  • API Client                                            │    │
│  │  • Event Handling                                        │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS/REST API
                            │ (CORS enabled)
┌───────────────────────────▼──────────────────────────────────────┐
│                      API Layer (Backend)                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Chat API   │  │   Cart API   │  │ Products API │          │
│  │              │  │              │  │              │          │
│  │ /api/sdk/    │  │ /api/sdk/    │  │ /api/sdk/    │          │
│  │   chat       │  │   cart       │  │   products   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                  │
│                            │                                      │
│              ┌─────────────▼──────────────┐                      │
│              │   Business Logic Layer     │                      │
│              │                            │                      │
│              │  • LLM Service             │                      │
│              │  • Storefront Service      │                      │
│              │  • Product Sync Service    │                      │
│              │  • Analytics Service       │                      │
│              └─────────────┬──────────────┘                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼─────────┐  ┌───────▼────────┐  ┌───────▼──────────┐
│   Database      │  │  External APIs  │  │   Cache Layer    │
│  (PostgreSQL)   │  │                 │  │   (Redis)        │
│                 │  │  • OpenAI       │  │                  │
│  • Sessions     │  │  • Anthropic    │  │  • Product Cache │
│  • Conversations│  │  • Shopify      │  │  • Session Cache │
│  • Products     │  │    Storefront   │  │                  │
│  • Analytics    │  └─────────────────┘  └──────────────────┘
└─────────────────┘
```

### Key Design Principles

1. **Separation of Concerns:** Clear boundaries between presentation, business logic, and data layers
2. **Scalability:** Stateless API design, horizontal scaling capability
3. **Resilience:** Graceful degradation, retry logic, fallback mechanisms
4. **Security:** API key authentication, CORS protection, input validation
5. **Performance:** Caching strategies, optimized database queries, CDN delivery
6. **Extensibility:** Plugin architecture, webhook support, custom integrations

---

## System Components

### 1. Client-Side Widget

**File:** `public/shopify-ai-assistant.js`

**Responsibilities:**
- Render chat interface
- Manage user interactions
- Handle API communication
- Maintain conversation state
- Provide customization options

**Key Features:**
- Zero dependencies (vanilla JavaScript)
- Responsive design (mobile-first)
- Customizable appearance
- Event-driven architecture
- LocalStorage for session persistence

**API:**

```javascript
// Initialize widget
const assistant = new ShopifyAIAssistant({
  apiKey: 'sai_xxxxx',
  apiEndpoint: 'https://your-app.com',
  position: 'bottom-right',
  primaryColor: '#000000',
  accentColor: '#5C6AC4',
  welcomeMessage: 'Hi! How can I help?'
});

// Methods
assistant.toggleChat();        // Open/close chat
assistant.sendMessage(text);   // Send message programmatically
assistant.addMessage(role, content); // Add custom message

// Events
assistant.on('message', (data) => {});
assistant.on('checkout', (data) => {});
assistant.on('error', (error) => {});
```

### 2. Backend API

**Framework:** React Router v7 (Node.js)

**Key Routes:**

#### Chat API (`/api/sdk/chat`)
- Handles conversation management
- Integrates with LLM providers
- Tracks analytics
- Returns AI responses

#### Cart API (`/api/sdk/cart`)
- Add/remove/update cart items
- Create Shopify carts
- Generate checkout URLs
- Track cart analytics

#### Products API (`/api/sdk/products`)
- Product search
- Product details
- Recommendations
- Cached product data

### 3. LLM Service

**File:** `app/services/llm.service.js`

**Supported Providers:**
- OpenAI (GPT-3.5, GPT-4, GPT-4o)
- Anthropic (Claude 3 Sonnet, Opus)
- Custom (extensible architecture)

**Features:**
- Context-aware prompting
- Token optimization
- Intent extraction
- Response streaming (future)
- Fallback handling

**System Prompt Structure:**

```
1. Role Definition
2. Available Products Context
3. Conversation Context
4. Capabilities List
5. Guidelines & Best Practices
6. Custom Instructions
```

### 4. Storefront Service

**File:** `app/services/storefront.service.js`

**Shopify Storefront API Integration:**

```graphql
# Key Operations

1. Fetch Products (with pagination)
2. Search Products (semantic)
3. Get Product Details
4. Create Cart
5. Add to Cart
6. Get Collections
```

**Features:**
- GraphQL query optimization
- Pagination handling
- Data transformation
- Error handling
- Rate limiting compliance

### 5. Product Sync Service

**File:** `app/services/product-sync.service.js`

**Responsibilities:**
- Sync products from Shopify
- Update product cache
- Handle incremental updates
- Schedule periodic syncs

**Sync Strategy:**

```javascript
// Initial Full Sync
syncProducts(shop, token) {
  1. Fetch all products via Storefront API
  2. Transform to normalized format
  3. Upsert to product_cache table
  4. Update last_synced timestamp
}

// Scheduled Sync (every 24 hours)
scheduledSync(shop, token) {
  1. Check if sync needed (>24 hours)
  2. If needed, run full sync
  3. Log results
}

// Real-time Webhooks (future)
onProductUpdate(webhookData) {
  1. Receive Shopify webhook
  2. Update specific product
  3. Invalidate cache
}
```

---

## API Reference

### Authentication

All API requests require authentication via API key in header:

```http
X-SDK-API-Key: sai_your_api_key_here
```

### Rate Limits

| Plan | Requests/min | Requests/day |
|------|--------------|--------------|
| Starter | 60 | 10,000 |
| Growth | 120 | 50,000 |
| Professional | 300 | 150,000 |
| Enterprise | Custom | Unlimited |

### Endpoints

#### 1. Chat API

**Send Message**

```http
POST /api/sdk/chat
Content-Type: application/json
X-SDK-API-Key: sai_xxxxx

{
  "message": "I'm looking for a blue dress",
  "conversationId": "conv_xxxxx",  // optional
  "sessionId": "session_xxxxx",    // optional
  "customerId": "customer_xxxxx"   // optional
}
```

**Response:**

```json
{
  "conversationId": "conv_abc123",
  "message": "I found several blue dresses for you! Here are some options...",
  "intent": {
    "action": "search",
    "products": [],
    "filters": { "color": "blue" }
  },
  "suggestions": [
    "Show me more options",
    "Add to cart",
    "What sizes are available?"
  ],
  "cart": {
    "items": [],
    "total": "0.00"
  }
}
```

**Error Response:**

```json
{
  "error": "Invalid API key",
  "code": "AUTH_ERROR",
  "status": 401
}
```

#### 2. Cart API

**Add to Cart**

```http
POST /api/sdk/cart
Content-Type: application/json
X-SDK-API-Key: sai_xxxxx

{
  "action": "add",
  "conversationId": "conv_xxxxx",
  "productId": "gid://shopify/Product/123",
  "variantId": "gid://shopify/ProductVariant/456",
  "quantity": 1
}
```

**Response:**

```json
{
  "success": true,
  "cartItem": {
    "id": "cart_item_123",
    "productId": "gid://shopify/Product/123",
    "variantId": "gid://shopify/ProductVariant/456",
    "title": "Blue Summer Dress - Medium",
    "price": "79.99",
    "quantity": 1,
    "imageUrl": "https://..."
  },
  "message": "Added Blue Summer Dress to cart"
}
```

**Get Cart**

```http
POST /api/sdk/cart
Content-Type: application/json
X-SDK-API-Key: sai_xxxxx

{
  "action": "get",
  "conversationId": "conv_xxxxx"
}
```

**Response:**

```json
{
  "items": [
    {
      "id": "cart_item_123",
      "title": "Blue Summer Dress - Medium",
      "price": "79.99",
      "quantity": 1,
      "imageUrl": "https://..."
    }
  ],
  "total": "79.99",
  "itemCount": 1
}
```

**Checkout**

```http
POST /api/sdk/cart
Content-Type: application/json
X-SDK-API-Key: sai_xxxxx

{
  "action": "checkout",
  "conversationId": "conv_xxxxx"
}
```

**Response:**

```json
{
  "success": true,
  "checkoutUrl": "https://shop.myshopify.com/cart/c/abc123",
  "cartId": "gid://shopify/Cart/xyz789"
}
```

#### 3. Products API

**Search Products**

```http
GET /api/sdk/products?q=blue+dress&limit=10
X-SDK-API-Key: sai_xxxxx
```

**Response:**

```json
{
  "products": [
    {
      "id": "gid://shopify/Product/123",
      "title": "Blue Summer Dress",
      "description": "Beautiful flowing summer dress...",
      "vendor": "Fashion Brand",
      "productType": "Dresses",
      "tags": ["summer", "casual", "blue"],
      "price": "79.99 USD",
      "priceAmount": 79.99,
      "available": true,
      "images": [
        {
          "url": "https://...",
          "altText": "Blue dress front view"
        }
      ],
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/456",
          "title": "Small",
          "price": 79.99,
          "available": true,
          "options": [
            { "name": "Size", "value": "Small" }
          ]
        }
      ]
    }
  ],
  "total": 5,
  "query": "blue dress"
}
```

**Get Product Details**

```http
GET /api/sdk/products?id=gid://shopify/Product/123
X-SDK-API-Key: sai_xxxxx
```

**Response:**

```json
{
  "product": {
    "id": "gid://shopify/Product/123",
    "title": "Blue Summer Dress",
    "description": "...",
    "descriptionHtml": "<p>...</p>",
    "vendor": "Fashion Brand",
    "productType": "Dresses",
    "tags": ["summer", "casual"],
    "price": "79.99 USD",
    "available": true,
    "images": [...],
    "variants": [...]
  },
  "recommendations": [
    {
      "id": "gid://shopify/Product/124",
      "title": "Summer Sandals",
      "price": "49.99",
      "imageUrl": "https://..."
    }
  ]
}
```

### Webhooks (Coming Soon)

Register webhook URLs to receive real-time events:

**Events:**
- `conversation.started`
- `conversation.message`
- `cart.item_added`
- `cart.checkout_initiated`
- `product.sync_completed`

---

## Integration Guide

### Quick Start (5 minutes)

#### Step 1: Install the Shopify App

1. Visit Shopify App Store
2. Search for "AI Shopping Assistant"
3. Click "Add app"
4. Authorize the app

#### Step 2: Configure SDK

1. Navigate to app dashboard in Shopify admin
2. Configure settings:
   - Enable the assistant
   - Add LLM API key (OpenAI or Anthropic)
   - Customize colors and messages
   - Save configuration
3. Copy your SDK API key

#### Step 3: Sync Products

1. Click "Sync Products Now" in dashboard
2. Wait for sync to complete (usually 1-5 minutes)
3. Verify products are synced

#### Step 4: Install Widget

Add the following code to your `theme.liquid` file, just before `</body>`:

```html
<!-- Shopify AI Shopping Assistant -->
<script>
  window.shopifyAIAssistantConfig = {
    apiKey: 'YOUR_SDK_API_KEY',
    apiEndpoint: 'https://your-app-domain.com',
    position: 'bottom-right',
    primaryColor: '#000000',
    accentColor: '#5C6AC4',
    welcomeMessage: 'Hi! I\'m your AI shopping assistant. How can I help you today?'
  };
</script>
<script src="https://your-app-domain.com/shopify-ai-assistant.js"></script>
```

#### Step 5: Test

1. Visit your storefront
2. Click the chat button
3. Try asking: "Show me summer dresses under $100"
4. Verify the assistant responds correctly

### Advanced Integration

#### Custom Styling

Override default styles:

```css
/* Custom widget styles */
.sai-widget-container {
  /* Your custom styles */
}

.sai-chat-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.sai-message.assistant .sai-message-content {
  background: #f0f0f0;
  border-left: 3px solid #667eea;
}
```

#### Custom Events

Listen to widget events:

```javascript
// After widget initialization
const assistant = new ShopifyAIAssistant(config);

// Listen to events
assistant.on('message', (data) => {
  console.log('Message sent:', data);
  // Track with your analytics
  analytics.track('Chat Message', data);
});

assistant.on('checkout', (data) => {
  console.log('Checkout initiated:', data);
  // Track conversion
  analytics.track('Checkout Started', data);
});

assistant.on('productView', (data) => {
  console.log('Product viewed:', data);
});
```

#### Programmatic Control

Control the widget via JavaScript:

```javascript
// Open chat programmatically
assistant.toggleChat();

// Send message programmatically
assistant.sendMessage('Show me your best sellers');

// Add custom message
assistant.addMessage('system', 'Special offer: 20% off today!');

// Close chat
assistant.closeChat();
```

#### Custom Product Data

Enhance product context with custom attributes:

```javascript
window.shopifyAIAssistantConfig = {
  apiKey: 'YOUR_API_KEY',
  apiEndpoint: 'https://your-app.com',
  customContext: {
    storeFeatures: ['free shipping', 'easy returns', '24/7 support'],
    promotions: ['20% off summer collection'],
    policies: {
      shipping: 'Free shipping on orders over $50',
      returns: '30-day return policy'
    }
  }
};
```

### Integration with Analytics

#### Google Analytics

```javascript
assistant.on('message', (data) => {
  gtag('event', 'chat_message', {
    'event_category': 'engagement',
    'event_label': 'ai_assistant'
  });
});

assistant.on('checkout', (data) => {
  gtag('event', 'begin_checkout', {
    'value': data.total,
    'currency': 'USD'
  });
});
```

#### Klaviyo

```javascript
assistant.on('productView', (data) => {
  klaviyo.push(['track', 'Viewed Product', {
    'ProductName': data.product.title,
    'ProductID': data.product.id,
    'Source': 'AI Assistant'
  }]);
});
```

### Multi-language Support

Configure language:

```javascript
window.shopifyAIAssistantConfig = {
  apiKey: 'YOUR_API_KEY',
  apiEndpoint: 'https://your-app.com',
  language: 'es', // Spanish
  welcomeMessage: '¡Hola! ¿Cómo puedo ayudarte?',
  translations: {
    placeholder: 'Escribe tu mensaje...',
    sendButton: 'Enviar',
    closeButton: 'Cerrar'
  }
};
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐
│   Session   │
└─────────────┘
      
┌─────────────────┐       ┌──────────────────┐
│   SDKConfig     │       │   Conversation   │
│                 │       │                  │
│ • shop (UK)     │◄──────┤ • shop           │
│ • apiKey (UK)   │       │ • sessionId      │
│ • enabled       │       │ • customerId     │
│ • llmProvider   │       └────────┬─────────┘
│ • llmModel      │                │
│ • settings...   │       ┌────────┴─────────┐
└─────────────────┘       │                  │
                    ┌─────▼──────┐    ┌─────▼──────┐
                    │   Message  │    │  CartItem  │
                    │            │    │            │
                    │ • role     │    │ • productId│
                    │ • content  │    │ • variantId│
                    │ • timestamp│    │ • quantity │
                    └────────────┘    │ • price    │
                                      └────────────┘

┌──────────────────┐       ┌──────────────────┐
│  ProductCache    │       │  ChatAnalytics   │
│                  │       │                  │
│ • id + shop (UK) │       │ • shop           │
│ • title          │       │ • conversationId │
│ • description    │       │ • metrics...     │
│ • variants (JSON)│       └──────────────────┘
│ • images (JSON)  │
│ • price          │
│ • available      │
└──────────────────┘
```

### Table Definitions

#### SDKConfig

```sql
CREATE TABLE SDKConfig (
  id VARCHAR(36) PRIMARY KEY,
  shop VARCHAR(255) UNIQUE NOT NULL,
  apiKey VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  llmProvider VARCHAR(50) DEFAULT 'openai',
  llmModel VARCHAR(100) DEFAULT 'gpt-4',
  llmApiKey TEXT,
  widgetPosition VARCHAR(20) DEFAULT 'bottom-right',
  primaryColor VARCHAR(7) DEFAULT '#000000',
  accentColor VARCHAR(7) DEFAULT '#5C6AC4',
  welcomeMessage TEXT DEFAULT 'Hi! I''m your AI shopping assistant...',
  customPrompt TEXT,
  maxTokens INTEGER DEFAULT 500,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Conversation

```sql
CREATE TABLE Conversation (
  id VARCHAR(36) PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  sessionId VARCHAR(255) NOT NULL,
  customerId VARCHAR(255),
  metadata TEXT, -- JSON
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shop (shop),
  INDEX idx_session (sessionId)
);
```

#### Message

```sql
CREATE TABLE Message (
  id VARCHAR(36) PRIMARY KEY,
  conversationId VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  productRefs TEXT, -- JSON array
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES Conversation(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversationId),
  INDEX idx_created (createdAt)
);
```

#### CartItem

```sql
CREATE TABLE CartItem (
  id VARCHAR(36) PRIMARY KEY,
  conversationId VARCHAR(36) NOT NULL,
  productId VARCHAR(255) NOT NULL,
  variantId VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  price VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  imageUrl TEXT,
  addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES Conversation(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversationId)
);
```

#### ProductCache

```sql
CREATE TABLE ProductCache (
  id VARCHAR(255) NOT NULL,
  shop VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  vendor VARCHAR(255),
  productType VARCHAR(255),
  tags TEXT, -- comma-separated
  variants TEXT NOT NULL, -- JSON
  images TEXT NOT NULL, -- JSON
  price VARCHAR(50) NOT NULL,
  compareAtPrice VARCHAR(50),
  available BOOLEAN DEFAULT TRUE,
  lastSynced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, shop),
  INDEX idx_shop (shop),
  INDEX idx_available (available),
  FULLTEXT INDEX idx_search (title, description, tags, vendor)
);
```

#### ChatAnalytics

```sql
CREATE TABLE ChatAnalytics (
  id VARCHAR(36) PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  conversationId VARCHAR(36) NOT NULL,
  messageCount INTEGER DEFAULT 0,
  productsViewed INTEGER DEFAULT 0,
  productsAddedCart INTEGER DEFAULT 0,
  checkoutInitiated BOOLEAN DEFAULT FALSE,
  checkoutCompleted BOOLEAN DEFAULT FALSE,
  sessionDuration INTEGER, -- seconds
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shop (shop),
  INDEX idx_conversation (conversationId),
  INDEX idx_created (createdAt)
);
```

### Indexes & Performance

**Key Indexes:**

1. **SDKConfig:**
   - `shop` (UNIQUE) - Fast lookups by store
   - `apiKey` (UNIQUE) - Fast authentication

2. **Conversation:**
   - `shop` - Filter by store
   - `sessionId` - Track user sessions
   - `createdAt` - Time-based queries

3. **Message:**
   - `conversationId` - Get all messages for conversation
   - `createdAt` - Chronological ordering

4. **ProductCache:**
   - `(id, shop)` (UNIQUE) - Primary lookup
   - `shop` - Store filtering
   - FULLTEXT on `(title, description, tags)` - Text search

5. **ChatAnalytics:**
   - `shop` - Store analytics
   - `conversationId` - Conversation tracking
   - `createdAt` - Time-series analysis

---

## Security & Compliance

### Authentication & Authorization

#### API Key Management

- **Generation:** Cryptographically secure random keys
- **Storage:** Hashed in database (bcrypt/argon2)
- **Rotation:** Support for key regeneration
- **Scoping:** Per-store isolation

#### Request Validation

```javascript
// All requests validated
1. API key presence check
2. API key validation against database
3. Store enablement check
4. Rate limiting enforcement
5. Input sanitization
6. CORS validation
```

### Data Security

#### Encryption

- **In Transit:** TLS 1.3 (HTTPS only)
- **At Rest:** Database encryption (AES-256)
- **API Keys:** Encrypted storage
- **PII:** Encrypted fields for customer data

#### Data Privacy

**GDPR Compliance:**
- Right to access
- Right to deletion
- Right to portability
- Consent management
- Data processing agreements

**CCPA Compliance:**
- Do not sell personal information
- Opt-out mechanisms
- Data disclosure requests

#### PCI Compliance

- No credit card data storage
- Delegated to Shopify Payments
- PCI DSS scope minimization

### Security Best Practices

1. **Input Validation:**
   - Sanitize all user inputs
   - Validate JSON payloads
   - Limit message length
   - SQL injection prevention (ORM)

2. **Rate Limiting:**
   - Per API key limits
   - IP-based limits
   - Exponential backoff
   - DDoS protection

3. **Monitoring & Logging:**
   - Structured logging (JSON)
   - Security event tracking
   - Anomaly detection
   - Audit trails

4. **Incident Response:**
   - Security incident playbook
   - 24/7 monitoring
   - Automated alerts
   - Regular security audits

### Compliance Certifications

**Target Certifications:**
- SOC 2 Type II
- ISO 27001
- GDPR compliant
- CCPA compliant
- HIPAA (if healthcare products)

---

## Performance & Scalability

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 500ms | ~300ms |
| AI Response Time (p95) | < 3s | ~2.5s |
| Widget Load Time | < 1s | ~800ms |
| Uptime | 99.9% | 99.95% |
| Database Query Time (p95) | < 100ms | ~50ms |

### Caching Strategy

#### Application Level

```javascript
// Product Cache
- TTL: 24 hours
- Invalidation: On sync or webhook
- Strategy: Cache-aside pattern

// Conversation Cache
- TTL: 1 hour
- Invalidation: On new message
- Strategy: Write-through

// LLM Response Cache
- TTL: 5 minutes
- Invalidation: Time-based
- Strategy: Cache-aside with deduplication
```

#### Database Level

- Query result caching
- Connection pooling
- Prepared statements
- Read replicas for analytics

#### CDN Level

- Static assets (widget.js)
- Image optimization
- Edge caching
- GZIP/Brotli compression

### Scalability Architecture

#### Horizontal Scaling

```
Load Balancer (Nginx/CloudFlare)
          |
    ┌─────┴─────┬─────────┬─────────┐
    │           │         │         │
  API-1      API-2     API-3     API-N
    │           │         │         │
    └─────┬─────┴─────────┴─────────┘
          │
   Database Cluster
   (Primary + Replicas)
```

**Scaling Triggers:**
- CPU > 70% for 5 minutes
- Memory > 80%
- Request queue depth > 100
- Response time p95 > 1s

#### Database Scaling

**Vertical:**
- Start: 2 CPU, 4GB RAM
- Scale: Up to 32 CPU, 128GB RAM

**Horizontal:**
- Read replicas for queries
- Sharding by shop (if needed)
- Connection pooling (PgBouncer)

#### Async Processing

**Background Jobs:**
- Product sync (scheduled)
- Analytics aggregation
- Webhook processing
- Email notifications

**Queue System:**
- Redis/BullMQ
- Retry logic
- Dead letter queue
- Monitoring

### Monitoring & Observability

#### Metrics (DataDog/Grafana)

**Application:**
- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- Active connections

**Business:**
- Conversations/day
- Messages/conversation
- Conversion rate
- Revenue attributed

**Infrastructure:**
- CPU utilization
- Memory usage
- Disk I/O
- Network throughput

#### Logging (ELK Stack)

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "chat-api",
  "shop": "example.myshopify.com",
  "conversationId": "conv_123",
  "action": "message_sent",
  "duration": 245,
  "tokens": 150
}
```

#### Tracing (Jaeger/OpenTelemetry)

- End-to-end request tracing
- LLM API call tracking
- Database query profiling
- Performance bottleneck identification

#### Alerts

**Critical (PagerDuty):**
- API down (5xx errors)
- Database connection failure
- LLM API failure
- High error rate (>5%)

**Warning (Slack):**
- Slow response times
- High resource usage
- Rate limit approaching
- Unusual traffic patterns

---

## Deployment Guide

### Infrastructure Requirements

#### Production Environment

**Application Servers:**
- 2-4 instances (t3.medium or equivalent)
- 2 CPU, 4GB RAM each
- Auto-scaling group
- Load balancer

**Database:**
- PostgreSQL 14+
- Primary + 1-2 read replicas
- db.t3.large or equivalent
- 100GB SSD storage
- Automated backups (daily)

**Cache:**
- Redis 6+
- cache.t3.medium
- Cluster mode enabled

**CDN:**
- CloudFlare or AWS CloudFront
- Global distribution
- DDoS protection

### Deployment Process

#### 1. Environment Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Configure .env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SHOPIFY_STOREFRONT_ACCESS_TOKEN=...
```

#### 2. Database Migration

```bash
# Generate Prisma client
npm run prisma generate

# Run migrations
npm run prisma migrate deploy

# Seed data (optional)
npm run prisma db seed
```

#### 3. Build Application

```bash
# Build for production
npm run build

# Test build
NODE_ENV=production npm start
```

#### 4. Deploy

**Using Docker:**

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build image
docker build -t shopify-ai-assistant .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  shopify-ai-assistant
```

**Using Kubernetes:**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-assistant-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-assistant
  template:
    metadata:
      labels:
        app: ai-assistant
    spec:
      containers:
      - name: api
        image: shopify-ai-assistant:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-secrets
              key: openai
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ai-assistant-service
spec:
  selector:
    app: ai-assistant
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### CI/CD Pipeline

**GitHub Actions Example:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
    - run: npm ci
    - run: npm test
    - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: docker/build-push-action@v4
      with:
        push: true
        tags: your-registry/ai-assistant:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/ai-assistant-api \
          api=your-registry/ai-assistant:${{ github.sha }}
        kubectl rollout status deployment/ai-assistant-api
```

### Health Checks

```javascript
// app/routes/health.jsx
export const loader = async () => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    llm: await checkLLMProviders(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }, { status: healthy ? 200 : 503 });
};
```

### Rollback Procedure

1. **Immediate Rollback:**
   ```bash
   kubectl rollout undo deployment/ai-assistant-api
   ```

2. **Database Rollback:**
   ```bash
   npm run prisma migrate rollback
   ```

3. **Feature Flag Disable:**
   - Disable new features via admin panel
   - Graceful degradation

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+ (optional for local dev)
- Shopify Partner Account
- OpenAI or Anthropic API key

### Local Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/shopify-ai-assistant.git
cd shopify-ai-assistant/optimized-merchandise-app

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env

# Edit .env with your credentials:
# - DATABASE_URL
# - OPENAI_API_KEY or ANTHROPIC_API_KEY
# - SHOPIFY_API_KEY and SHOPIFY_API_SECRET

# 4. Setup database
npm run prisma generate
npm run prisma migrate dev

# 5. Start development server
npm run dev

# Application will be available at:
# http://localhost:3000
```

### Development Workflow

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type checking
npm run typecheck

# Database operations
npm run prisma studio  # GUI for database
npm run prisma migrate dev --name description
npm run prisma db push  # Prototype schema changes

# Generate GraphQL types
npm run graphql-codegen
```

### Testing Strategy

#### Unit Tests

```javascript
// __tests__/services/llm.service.test.js
import { LLMService } from '../app/services/llm.service.js';

describe('LLMService', () => {
  it('should extract product intent from message', () => {
    const service = new LLMService({});
    const intent = service.extractProductIntent('I want to buy 2 blue dresses');
    
    expect(intent.action).toBe('add_to_cart');
    expect(intent.quantity).toBe(2);
    expect(intent.filters.color).toBe('blue');
  });
});
```

#### Integration Tests

```javascript
// __tests__/api/chat.test.js
import { test, expect } from '@playwright/test';

test('chat API should return AI response', async ({ request }) => {
  const response = await request.post('/api/sdk/chat', {
    headers: {
      'X-SDK-API-Key': 'test_api_key'
    },
    data: {
      message: 'Show me summer dresses'
    }
  });

  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.message).toBeTruthy();
  expect(data.conversationId).toBeTruthy();
});
```

#### E2E Tests

```javascript
// e2e/widget.test.js
import { test, expect } from '@playwright/test';

test('widget should open and send message', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Click chat button
  await page.click('.sai-chat-button');
  
  // Verify widget opened
  await expect(page.locator('.sai-chat-window')).toBeVisible();
  
  // Send message
  await page.fill('.sai-chat-input', 'Hello');
  await page.click('.sai-send-button');
  
  // Verify response
  await expect(page.locator('.sai-message.assistant')).toBeVisible();
});
```

---

## Troubleshooting

### Common Issues

#### 1. Widget Not Loading

**Symptoms:**
- Chat button doesn't appear
- Console errors

**Solutions:**

```javascript
// Check API key
console.log('API Key:', window.shopifyAIAssistantConfig.apiKey);

// Check script loading
console.log('Script loaded:', typeof ShopifyAIAssistant);

// Check CORS
// Ensure apiEndpoint allows your domain
```

#### 2. AI Not Responding

**Symptoms:**
- Messages sent but no response
- Timeout errors

**Solutions:**

1. Check LLM API key configuration
2. Verify API quotas not exceeded
3. Check server logs for errors
4. Ensure products are synced

```bash
# Check logs
tail -f /var/log/app.log | grep ERROR

# Test LLM API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 3. Products Not Syncing

**Symptoms:**
- Assistant has no product knowledge
- Search returns empty results

**Solutions:**

1. Verify Storefront Access Token
2. Check Shopify API permissions
3. Run manual sync
4. Check sync logs

```bash
# Manual sync via API
curl -X POST https://your-app.com/api/sync/products \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"shop": "example.myshopify.com"}'
```

#### 4. Slow Response Times

**Symptoms:**
- AI takes >10 seconds to respond
- Timeout errors

**Solutions:**

1. Check LLM model (GPT-4 is slower than GPT-3.5)
2. Reduce maxTokens
3. Implement caching
4. Optimize product context size

```javascript
// Optimize config
{
  llmModel: 'gpt-3.5-turbo',  // Faster
  maxTokens: 300,               // Reduce tokens
  temperature: 0.7
}
```

### Debug Mode

Enable debug logging:

```javascript
// In widget config
window.shopifyAIAssistantConfig = {
  // ... other config
  debug: true
};

// Console will show:
// - API requests/responses
// - State changes
// - Performance metrics
```

### Support Resources

- **Documentation:** https://docs.shopbotai.com
- **API Status:** https://status.shopbotai.com
- **Support Email:** support@shopbotai.com
- **Community Forum:** https://community.shopbotai.com
- **GitHub Issues:** https://github.com/shopbotai/sdk/issues

---

## Appendices

### Appendix A: Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-app.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_POOL_SIZE=10

# Redis (optional)
REDIS_URL=redis://host:6379
REDIS_TTL=3600

# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_token
SHOPIFY_SCOPES=write_products,read_customers

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Monitoring
SENTRY_DSN=https://...
DATADOG_API_KEY=...

# Security
JWT_SECRET=random_secret_key
API_RATE_LIMIT=100

# Features
ENABLE_ANALYTICS=true
ENABLE_WEBHOOKS=false
```

### Appendix B: GraphQL Queries

**Fetch Products:**

```graphql
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        title
        description
        vendor
        productType
        tags
        availableForSale
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              availableForSale
              priceV2 {
                amount
                currencyCode
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  }
}
```

### Appendix C: Rate Limiting

**Implementation:**

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (req) => {
    return req.headers['x-sdk-api-key'] || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
  }
});

app.use('/api/sdk/', limiter);
```

### Appendix D: Changelog

**Version 1.0.0** (Initial Release)
- Core chat functionality
- GPT-4 and Claude integration
- Shopify Storefront API integration
- Product search and recommendations
- Cart management
- Merchant dashboard
- Analytics tracking

**Version 1.1.0** (Planned)
- Multi-language support
- Voice input
- Image search
- Enhanced analytics
- A/B testing framework

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Maintainer:** Engineering Team

For technical support: dev@shopbotai.com
