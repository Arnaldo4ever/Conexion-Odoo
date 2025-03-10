import { Session } from '@shopify/shopify-api';

export class SetupService {
  static async createMetafield(session: Session): Promise<void> {
    const client = new session.client.graphql();
    
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
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
      metafields: [
        {
          namespace: "upng",
          key: "forma_entrega_habitual",
          type: "single_line_text_field",
          value: "AGENCIA",
          ownerType: "COMPANY_LOCATION"
        }
      ]
    };

    await client.query({
      data: {
        query: mutation,
        variables
      }
    });
  }

  static async setupWebhooks(session: Session): Promise<void> {
    const client = new session.client.graphql();
    
    const mutation = `
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Crear webhook para cuando se actualiza el carrito
    await client.query({
      data: {
        query: mutation,
        variables: {
          topic: "CARTS_UPDATE",
          webhookSubscription: {
            callbackUrl: `https://${session.shop}/api/webhooks/cart-update`,
            format: "JSON"
          }
        }
      }
    });
  }
}
