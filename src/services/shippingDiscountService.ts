import { Session } from '@shopify/shopify-api';
import { shopify } from '../shopify';

interface ShippingDiscount {
  type: string;
  discount: number;
}

interface CustomerMetafieldResponse {
  data: {
    customer?: {
      metafield?: {
        value: string;
      };
    };
  };
}

type ValidShippingTypes = 'AGENCIA0_GRATUITA' | 'AGENCIA_25' | 'AGENCIA_P_25' | 'AGENCIA_P_50' | 'ENVIO_F&A' | 'AGENCIA';

export class ShippingDiscountService {
  private static readonly DISCOUNT_TYPES: Record<ValidShippingTypes, ShippingDiscount> = {
    AGENCIA0_GRATUITA: { type: 'free', discount: 100 },
    AGENCIA_25: { type: 'percentage', discount: 25 },
    'AGENCIA_P_25': { type: 'percentage', discount: 25 },
    'AGENCIA_P_50': { type: 'percentage', discount: 50 },
    'ENVIO_F&A': { type: 'specific', discount: 100 },
    'AGENCIA': { type: 'none', discount: 0 }
  };

  static async getCustomerShippingPreference(session: Session, customerId: string): Promise<ValidShippingTypes> {
    const client = new shopify.clients.Graphql({ session });
    
    const query = `
      query getCustomerMetafield($customerId: ID!) {
        customer(id: $customerId) {
          metafield(namespace: "upng", key: "forma_entrega_habitual") {
            value
          }
        }
      }
    `;

    const response = await client.query<CustomerMetafieldResponse>({
      data: {
        query,
        variables: {
          customerId
        }
      }
    });

    const value = response.body.data.customer?.metafield?.value || 'AGENCIA';
    return this.validateShippingType(value);
  }

  private static validateShippingType(value: string): ValidShippingTypes {
    return (value in this.DISCOUNT_TYPES) ? value as ValidShippingTypes : 'AGENCIA';
  }

  static getDiscountForShippingType(shippingType: ValidShippingTypes): ShippingDiscount {
    return this.DISCOUNT_TYPES[shippingType];
  }

  static async createAutomaticDiscount(session: Session, shopDomain: string, discountAmount: number): Promise<void> {
    const client = new shopify.clients.Graphql({ session });
    
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
