# 🚀 Quick Setup Guide

## Prerequisites

Before getting started, make sure you have:

- **Node.js 20+** installed
- **PostgreSQL 14+** running locally or accessible remotely
- **Shopify Partner Account** (free at partners.shopify.com)
- **OpenAI API Key** (from platform.openai.com) or **Anthropic API Key** (from console.anthropic.com)

## Step-by-Step Setup

### 1. Environment Configuration

Create a `.env` file in the project root with these required variables:

```bash
# Application
NODE_ENV=development
PORT=3000

# Database (replace with your PostgreSQL connection)
DATABASE_URL="postgresql://username:password@localhost:5432/shopify_ai_assistant"

# Shopify (get from your Partner Dashboard)
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here

# Shopify Storefront Access Token (create in store admin)
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here

# AI Provider (choose one or both)
OPENAI_API_KEY=sk-your_openai_api_key_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here

# Security
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma generate

# Run database migrations
npm run prisma migrate dev

# Optional: Open Prisma Studio to view your database
npm run prisma studio
```

### 4. Start Development Server

```bash
npm run dev
```

Your app will be available at `http://localhost:3000`.

### 5. Shopify App Setup

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com)
2. Create a new app or use existing
3. Set the app URL to your ngrok URL (see below)
4. Add the redirect URLs for OAuth

### 6. ngrok Setup (for local development)

Install ngrok and expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and:
1. Update `SHOPIFY_APP_URL` in your `.env`
2. Update app URLs in Shopify Partner Dashboard

### 7. Create Storefront Access Token

1. Go to your development store admin
2. Navigate to **Apps > Manage private apps**
3. Click **Create private app**
4. Enable **Storefront API access**
5. Select these permissions:
   - Read products
   - Read product inventory
   - Read customer information
6. Save and copy the **Storefront access token**
7. Add it to your `.env` file

### 8. Test the Setup

1. Visit your app URL
2. Install the app on your development store
3. Navigate to the SDK Dashboard
4. Configure your AI settings
5. Click "Sync Products"
6. Visit your storefront to test the widget

## Troubleshooting

### Common Issues

**Database Connection Error:**
- Ensure PostgreSQL is running
- Check your `DATABASE_URL` is correct
- Create the database if it doesn't exist

**Shopify Authentication Failed:**
- Verify your API key and secret are correct
- Ensure your app URL matches ngrok URL
- Check redirect URLs in Partner Dashboard

**AI Not Responding:**
- Verify your OpenAI/Anthropic API key is valid
- Check API quotas haven't been exceeded
- Ensure you have billing setup for the AI provider

**Products Not Syncing:**
- Verify Storefront Access Token has correct permissions
- Check that your development store has products
- Look at server logs for sync errors

### Need Help?

- Check the [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)
- Review the [Business Plan](./BUSINESS_PLAN.md) for context
- Open an issue on GitHub
- Contact support at support@shopbotai.com

## Next Steps

Once your development environment is running:

1. **Customize the Widget:** Modify colors, position, and messages in the dashboard
2. **Test Conversations:** Try different queries to test AI responses
3. **Add Custom Prompts:** Enhance the AI with store-specific instructions
4. **Monitor Analytics:** Track conversations and conversions
5. **Deploy to Production:** Follow the deployment guide when ready

Happy coding! 🎉
