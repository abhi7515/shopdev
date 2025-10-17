#!/usr/bin/env node

/**
 * Setup Verification Script
 * Run this script to verify your environment is configured correctly
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config(); // Load environment variables

const db = new PrismaClient();

console.log('🔍 Verifying AI Shopping Assistant Setup...\n');

// Test database connection
async function testDatabase() {
  try {
    await db.$connect();
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const tableCount = await db.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('SDKConfig', 'Conversation', 'Message', 'CartItem', 'ProductCache')
    `;
    
    const count = Number(tableCount[0].count);
    if (count >= 5) {
      console.log('✅ All required database tables exist');
    } else {
      console.log('⚠️  Some database tables are missing. Run: npm run prisma migrate dev');
    }
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('   Check your DATABASE_URL in .env file');
  }
}

// Test environment variables
function testEnvironment() {
  const required = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'DATABASE_URL'
  ];
  
  const optional = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
    'JWT_SECRET'
  ];
  
  console.log('\n📋 Environment Variables:');
  
  let missingRequired = false;
  
  // Check required variables
  required.forEach(key => {
    if (process.env[key]) {
      console.log(`✅ ${key}: configured`);
    } else {
      console.log(`❌ ${key}: missing (required)`);
      missingRequired = true;
    }
  });
  
  // Check optional variables
  optional.forEach(key => {
    if (process.env[key]) {
      console.log(`✅ ${key}: configured`);
    } else {
      console.log(`⚠️  ${key}: not configured (optional)`);
    }
  });
  
  if (missingRequired) {
    console.log('\n❌ Some required environment variables are missing');
    console.log('   Create a .env file based on SETUP.md');
  }
  
  // Check AI provider
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.log('\n⚠️  No AI provider configured');
    console.log('   Add either OPENAI_API_KEY or ANTHROPIC_API_KEY to .env');
  }
}

// Test AI API connections
async function testAIProviders() {
  console.log('\n🤖 Testing AI Providers:');
  
  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      
      if (response.ok) {
        console.log('✅ OpenAI API connection successful');
      } else {
        console.log('❌ OpenAI API connection failed:', response.statusText);
      }
    } catch (error) {
      console.log('❌ OpenAI API connection failed:', error.message);
    }
  }
  
  // Test Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      
      if (response.ok || response.status === 400) { // 400 is ok for this test
        console.log('✅ Anthropic API connection successful');
      } else {
        console.log('❌ Anthropic API connection failed:', response.statusText);
      }
    } catch (error) {
      console.log('❌ Anthropic API connection failed:', error.message);
    }
  }
}

// Test Shopify Storefront API
async function testShopifyStorefront() {
  if (!process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    console.log('\n⚠️  Shopify Storefront Access Token not configured');
    return;
  }
  
  console.log('\n🛍️  Testing Shopify Storefront API:');
  
  // We need a shop domain to test, but it's not in env vars
  // This is just a placeholder test
  console.log('⚠️  Cannot test Storefront API without shop domain');
  console.log('   Configure this manually in your app dashboard');
}

// Main test function
async function runTests() {
  try {
    testEnvironment();
    await testDatabase();
    await testAIProviders();
    await testShopifyStorefront();
    
    console.log('\n🎉 Setup verification complete!');
    console.log('\nNext steps:');
    console.log('1. Fix any issues shown above');
    console.log('2. Run: npm run dev');
    console.log('3. Visit http://localhost:3000');
    console.log('4. Install app on your development store');
    console.log('5. Configure SDK in the dashboard');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the tests
runTests();
