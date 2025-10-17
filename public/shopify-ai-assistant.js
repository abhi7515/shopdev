/**
 * Shopify AI Shopping Assistant SDK
 * Embeddable chat widget for Shopify stores
 * Version 1.0.0
 */

(function() {
  'use strict';

  class ShopifyAIAssistant {
    constructor(config) {
      this.config = {
        apiKey: config.apiKey,
        apiEndpoint: config.apiEndpoint || 'https://your-app-domain.com',
        position: config.position || 'bottom-right',
        primaryColor: config.primaryColor || '#000000',
        accentColor: config.accentColor || '#5C6AC4',
        welcomeMessage: config.welcomeMessage || "Hi! I'm your AI shopping assistant. How can I help you today?",
        ...config
      };

      this.conversationId = null;
      this.sessionId = this.generateSessionId();
      this.isOpen = false;
      this.messages = [];

      this.init();
    }

    init() {
      this.injectStyles();
      this.createWidget();
      this.attachEventListeners();
    }

    generateSessionId() {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    injectStyles() {
      const styles = `
        .sai-widget-container {
          position: fixed;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .sai-widget-container.bottom-right {
          bottom: 20px;
          right: 20px;
        }

        .sai-widget-container.bottom-left {
          bottom: 20px;
          left: 20px;
        }

        .sai-widget-container.top-right {
          top: 20px;
          right: 20px;
        }

        .sai-widget-container.top-left {
          top: 20px;
          left: 20px;
        }

        .sai-chat-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${this.config.accentColor};
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .sai-chat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }

        .sai-chat-button svg {
          fill: white;
          width: 28px;
          height: 28px;
        }

        .sai-chat-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 380px;
          height: 600px;
          max-height: 80vh;
          background: white;
          border-radius: 12px;
          box-shadow: 0 5px 40px rgba(0,0,0,0.16);
          display: none;
          flex-direction: column;
          overflow: hidden;
        }

        .sai-widget-container.bottom-left .sai-chat-window {
          left: 0;
          right: auto;
        }

        .sai-chat-window.open {
          display: flex;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sai-chat-header {
          background: ${this.config.primaryColor};
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sai-chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .sai-chat-header button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 24px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f7f7f7;
        }

        .sai-message {
          margin-bottom: 16px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sai-message-content {
          display: inline-block;
          padding: 12px 16px;
          border-radius: 18px;
          max-width: 80%;
          word-wrap: break-word;
        }

        .sai-message.user {
          text-align: right;
        }

        .sai-message.user .sai-message-content {
          background: ${this.config.accentColor};
          color: white;
        }

        .sai-message.assistant .sai-message-content {
          background: white;
          color: #333;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .sai-message.system .sai-message-content {
          background: #e3f2fd;
          color: #1976d2;
          font-style: italic;
          text-align: center;
          max-width: 100%;
        }

        .sai-typing-indicator {
          display: inline-flex;
          padding: 12px 16px;
          background: white;
          border-radius: 18px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .sai-typing-indicator span {
          width: 8px;
          height: 8px;
          background: #999;
          border-radius: 50%;
          margin: 0 2px;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .sai-typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .sai-typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .sai-chat-input-container {
          padding: 16px;
          background: white;
          border-top: 1px solid #e0e0e0;
        }

        .sai-chat-input-wrapper {
          display: flex;
          gap: 8px;
        }

        .sai-chat-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 24px;
          outline: none;
          font-size: 14px;
          font-family: inherit;
        }

        .sai-chat-input:focus {
          border-color: ${this.config.accentColor};
        }

        .sai-send-button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${this.config.accentColor};
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .sai-send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sai-send-button svg {
          fill: white;
          width: 20px;
          height: 20px;
        }

        .sai-product-card {
          background: white;
          border-radius: 8px;
          padding: 12px;
          margin-top: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .sai-product-card img {
          width: 100%;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .sai-product-card h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
        }

        .sai-product-card p {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .sai-product-card .price {
          font-weight: bold;
          color: ${this.config.accentColor};
          font-size: 16px;
          margin-top: 8px;
        }

        @media (max-width: 480px) {
          .sai-chat-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 100px);
            bottom: 70px;
          }
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    createWidget() {
      const container = document.createElement('div');
      container.className = `sai-widget-container ${this.config.position}`;
      container.innerHTML = `
        <div class="sai-chat-window" id="sai-chat-window">
          <div class="sai-chat-header">
            <h3>Shopping Assistant</h3>
            <button id="sai-close-button">&times;</button>
          </div>
          <div class="sai-chat-messages" id="sai-chat-messages"></div>
          <div class="sai-chat-input-container">
            <div class="sai-chat-input-wrapper">
              <input 
                type="text" 
                class="sai-chat-input" 
                id="sai-chat-input"
                placeholder="Ask me anything..."
              />
              <button class="sai-send-button" id="sai-send-button">
                <svg viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <button class="sai-chat-button" id="sai-chat-button">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
      `;

      document.body.appendChild(container);
      this.container = container;

      // Add welcome message
      this.addMessage('system', this.config.welcomeMessage);
    }

    attachEventListeners() {
      const chatButton = document.getElementById('sai-chat-button');
      const closeButton = document.getElementById('sai-close-button');
      const sendButton = document.getElementById('sai-send-button');
      const input = document.getElementById('sai-chat-input');

      chatButton.addEventListener('click', () => this.toggleChat());
      closeButton.addEventListener('click', () => this.closeChat());
      sendButton.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    toggleChat() {
      this.isOpen = !this.isOpen;
      const chatWindow = document.getElementById('sai-chat-window');
      if (this.isOpen) {
        chatWindow.classList.add('open');
        document.getElementById('sai-chat-input').focus();
      } else {
        chatWindow.classList.remove('open');
      }
    }

    closeChat() {
      this.isOpen = false;
      document.getElementById('sai-chat-window').classList.remove('open');
    }

    addMessage(role, content) {
      const messagesContainer = document.getElementById('sai-chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `sai-message ${role}`;
      messageDiv.innerHTML = `
        <div class="sai-message-content">${this.formatMessage(content)}</div>
      `;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      this.messages.push({ role, content });
    }

    formatMessage(content) {
      // Basic markdown-like formatting
      return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }

    showTyping() {
      const messagesContainer = document.getElementById('sai-chat-messages');
      const typingDiv = document.createElement('div');
      typingDiv.className = 'sai-message assistant';
      typingDiv.id = 'sai-typing';
      typingDiv.innerHTML = `
        <div class="sai-typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      messagesContainer.appendChild(typingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
      const typingDiv = document.getElementById('sai-typing');
      if (typingDiv) typingDiv.remove();
    }

    async sendMessage() {
      const input = document.getElementById('sai-chat-input');
      const message = input.value.trim();

      if (!message) return;

      // Add user message
      this.addMessage('user', message);
      input.value = '';

      // Show typing indicator
      this.showTyping();

      try {
        const response = await fetch(`${this.config.apiEndpoint}/api/sdk/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SDK-API-Key': this.config.apiKey
          },
          body: JSON.stringify({
            message,
            conversationId: this.conversationId,
            sessionId: this.sessionId
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Update conversation ID
        this.conversationId = data.conversationId;

        // Hide typing indicator
        this.hideTyping();

        // Add assistant response
        this.addMessage('assistant', data.message);

      } catch (error) {
        console.error('Error sending message:', error);
        this.hideTyping();
        this.addMessage('system', 'Sorry, I encountered an error. Please try again.');
      }
    }
  }

  // Expose to global scope
  window.ShopifyAIAssistant = ShopifyAIAssistant;

  // Auto-initialize if config is present
  if (window.shopifyAIAssistantConfig) {
    new ShopifyAIAssistant(window.shopifyAIAssistantConfig);
  }
})();
