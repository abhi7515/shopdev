-- CreateTable
CREATE TABLE "SDKConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "llmProvider" TEXT NOT NULL DEFAULT 'openai',
    "llmModel" TEXT NOT NULL DEFAULT 'gpt-4',
    "llmApiKey" TEXT,
    "widgetPosition" TEXT NOT NULL DEFAULT 'bottom-right',
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "accentColor" TEXT NOT NULL DEFAULT '#5C6AC4',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hi! I''m your AI shopping assistant. How can I help you today?',
    "customPrompt" TEXT,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "productRefs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartItem_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vendor" TEXT,
    "productType" TEXT,
    "tags" TEXT,
    "variants" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "compareAtPrice" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChatAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "productsViewed" INTEGER NOT NULL DEFAULT 0,
    "productsAddedCart" INTEGER NOT NULL DEFAULT 0,
    "checkoutInitiated" BOOLEAN NOT NULL DEFAULT false,
    "checkoutCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sessionDuration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SDKConfig_shop_key" ON "SDKConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "SDKConfig_apiKey_key" ON "SDKConfig"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCache_id_shop_key" ON "ProductCache"("id", "shop");
