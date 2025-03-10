import { Session } from '@shopify/shopify-api';

interface ShippingDiscount {
  type: string;
  discount: number;
}

export class ShippingDiscountService {
  private static readonly DISCOUNT_TYPES = {
    AGENCIA0_GRATUITA: { type: 'free', discount: 100 },
    AGENCIA_25: { type: 'percentage', discount: 25 },
    'AGENCIA_P_25': { type: 'percentage', discount: 25 },
    'AGENCIA_P_50': { type: 'percentage', discount: 50 },
    'ENVIO_F&A': { type: 'specific', discount: 100 },
  };

  static async getCustomerShippingPreference(session: Session, customerId: string): Promise<string> {
    const client = new session.client.graphql();
    
    const query = `
      query getCustomerMetafield($customerId: ID!) {
        customer(id: $customerId) {
          metafield(namespace: "upng", key: "forma_entrega_habitual") {
            value
          }
        }
      }
    `;

    const response = await client.query({
      data: {
        query,
        variables: {
          customerId
        }
      }
    });

    return response.body.data.customer?.metafield?.value || 'AGENCIA';
  }

  static getDiscountForShippingType(shippingType: string): ShippingDiscount {
    const discountConfig = this.DISCOUNT_TYPES[shippingType];
    
    if (!discountConfig) {
      return { type: 'none', discount: 0 };
    }

    return discountConfig;
  }

  static async createAutomaticDiscount(session: Session, shopDomain: string, discountAmount: number): Promise<void> {
    const client = new session.client.graphql();
    
    const mutation = `
      mutation discountCodeBasicCreate($input: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(input: $input) {
          discountCodeBasic {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        title: `Descuento Envío Automático ${discountAmount}%`,
        code: `ENVIO${discountAmount}`,
        startsAt: new Date().toISOString(),
        customerSelection: {
          all: true
        },
        customerGets: {
          value: {
            percentage: discountAmount
          },
          items: {
            all: true
          }
        },
        appliesOncePerCustomer: true
      }
    };

    await client.query({
      data: {
        query: mutation,
        variables
      }
    });
  }
}
