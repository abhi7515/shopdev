/**
 * Shopify Storefront API Service
 * Handles product data extraction using public Storefront API
 */

export class StorefrontService {
  constructor(shop, storefrontAccessToken) {
    this.shop = shop;
    this.storefrontAccessToken = storefrontAccessToken;
    this.apiVersion = '2024-01';
    this.endpoint = `https://${shop}/api/${this.apiVersion}/graphql.json`;
  }

  /**
   * Execute a GraphQL query against Storefront API
   */
  async query(graphqlQuery, variables = {}) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Storefront API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  /**
   * Fetch all products with pagination
   */
  async fetchAllProducts(limit = 250) {
    const query = `
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
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
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
                    quantityAvailable
                    priceV2 {
                      amount
                      currencyCode
                    }
                    compareAtPriceV2 {
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
    `;

    let allProducts = [];
    let hasNextPage = true;
    let after = null;

    while (hasNextPage) {
      const data = await this.query(query, { first: limit, after });
      const products = data.products.edges.map(edge => this.transformProduct(edge.node));
      allProducts = allProducts.concat(products);
      
      hasNextPage = data.products.pageInfo.hasNextPage;
      after = data.products.pageInfo.endCursor;
    }

    return allProducts;
  }

  /**
   * Search products by query
   */
  async searchProducts(searchQuery, limit = 20) {
    const query = `
      query SearchProducts($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
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
              images(first: 3) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 5) {
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
    `;

    const data = await this.query(query, { query: searchQuery, first: limit });
    return data.products.edges.map(edge => this.transformProduct(edge.node));
  }

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          descriptionHtml
          vendor
          productType
          tags
          availableForSale
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                availableForSale
                quantityAvailable
                priceV2 {
                  amount
                  currencyCode
                }
                compareAtPriceV2 {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { id: productId });
    return this.transformProduct(data.product);
  }

  /**
   * Create a cart
   */
  async createCart(items = []) {
    const query = `
      mutation CreateCart($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                      priceV2 {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const lines = items.map(item => ({
      merchandiseId: item.variantId,
      quantity: item.quantity
    }));

    const data = await this.query(query, { input: { lines } });
    
    if (data.cartCreate.userErrors.length > 0) {
      throw new Error(data.cartCreate.userErrors.map(e => e.message).join(', '));
    }

    return data.cartCreate.cart;
  }

  /**
   * Add items to cart
   */
  async addToCart(cartId, items) {
    const query = `
      mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                      priceV2 {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const lines = items.map(item => ({
      merchandiseId: item.variantId,
      quantity: item.quantity
    }));

    const data = await this.query(query, { cartId, lines });
    
    if (data.cartLinesAdd.userErrors.length > 0) {
      throw new Error(data.cartLinesAdd.userErrors.map(e => e.message).join(', '));
    }

    return data.cartLinesAdd.cart;
  }

  /**
   * Get collections
   */
  async getCollections(limit = 50) {
    const query = `
      query GetCollections($first: Int!) {
        collections(first: $first) {
          edges {
            node {
              id
              title
              description
              handle
              image {
                url
                altText
              }
              products(first: 5) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { first: limit });
    return data.collections.edges.map(edge => edge.node);
  }

  /**
   * Transform product data to simplified format
   */
  transformProduct(product) {
    if (!product) return null;

    const minPrice = product.priceRange?.minVariantPrice;
    const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      descriptionHtml: product.descriptionHtml,
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags || [],
      available: product.availableForSale,
      price: minPrice ? `${minPrice.amount} ${minPrice.currencyCode}` : 'N/A',
      priceAmount: minPrice ? parseFloat(minPrice.amount) : 0,
      currencyCode: minPrice?.currencyCode || 'USD',
      compareAtPrice: compareAtPrice ? `${compareAtPrice.amount} ${compareAtPrice.currencyCode}` : null,
      images: product.images?.edges.map(e => ({
        url: e.node.url,
        altText: e.node.altText
      })) || [],
      variants: product.variants?.edges.map(e => ({
        id: e.node.id,
        title: e.node.title,
        available: e.node.availableForSale,
        quantity: e.node.quantityAvailable,
        price: e.node.priceV2 ? parseFloat(e.node.priceV2.amount) : 0,
        compareAtPrice: e.node.compareAtPriceV2 ? parseFloat(e.node.compareAtPriceV2.amount) : null,
        options: e.node.selectedOptions,
        image: e.node.image
      })) || []
    };
  }

  /**
   * Filter products by criteria
   */
  filterProducts(products, filters) {
    return products.filter(product => {
      // Price filter
      if (filters.maxPrice && product.priceAmount > filters.maxPrice) {
        return false;
      }
      if (filters.minPrice && product.priceAmount < filters.minPrice) {
        return false;
      }

      // Availability filter
      if (filters.available !== undefined && product.available !== filters.available) {
        return false;
      }

      // Type filter
      if (filters.productType && product.productType !== filters.productType) {
        return false;
      }

      // Vendor filter
      if (filters.vendor && product.vendor !== filters.vendor) {
        return false;
      }

      // Tag filter
      if (filters.tag && !product.tags.includes(filters.tag)) {
        return false;
      }

      // Color filter (check in variants)
      if (filters.color) {
        const hasColor = product.variants.some(v => 
          v.options.some(opt => 
            opt.name.toLowerCase() === 'color' && 
            opt.value.toLowerCase().includes(filters.color.toLowerCase())
          )
        );
        if (!hasColor) return false;
      }

      // Size filter (check in variants)
      if (filters.size) {
        const hasSize = product.variants.some(v => 
          v.options.some(opt => 
            opt.name.toLowerCase() === 'size' && 
            opt.value.toLowerCase() === filters.size.toLowerCase()
          )
        );
        if (!hasSize) return false;
      }

      return true;
    });
  }
}

export default StorefrontService;
