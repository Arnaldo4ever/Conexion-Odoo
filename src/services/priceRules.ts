import axios from 'axios';

const SHOPIFY_STORE = 'upangodemo7.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = '4b2c8fe6f01d6554b965e5f2a451fafc'; // Asegúrate de tener los scopes adecuados

// Función para crear una Price Rule
async function crearPriceRule(discountValue: number): Promise<number> {
  // discountValue: valor negativo (por ejemplo, -25 para 25% de descuento)
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-04/price_rules.json`;

  const priceRulePayload = {
    price_rule: {
      title: "Descuento en envío por agencia",
      target_type: "shipping_line",  // Se aplica a la línea de envío
      target_selection: "all",        // Aplica a todos los métodos de envío (puedes restringirlo si es necesario)
      allocation_method: "across",    // Distribuye el descuento a nivel global
      value_type: "percentage",       // Se aplica en porcentaje
      value: discountValue,           // Por ejemplo, -25 para 25% de descuento, -100 para envío gratis
      customer_selection: "all",      // O puedes restringirlo a ciertos clientes
      starts_at: new Date().toISOString()
    }
  };

  const response = await axios.post(url, priceRulePayload, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.price_rule.id;
}

// Función para crear un Discount Code asociado a la Price Rule
async function crearDiscountCode(priceRuleId: number, code: string): Promise<string> {
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-04/price_rules/${priceRuleId}/discount_codes.json`;
  const discountCodePayload = {
    discount_code: {
      code: code
    }
  };

  const response = await axios.post(url, discountCodePayload, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  return response.data.discount_code.code;
}

// Función para determinar el descuento en base al metafield del cliente y generar el código
async function generarDescuentoPorAgencia(formaEntrega: string): Promise<string> {
  let discountValue = 0;
  let code = "";
  
  switch (formaEntrega) {
    case "AGENCIA0_GRATUITA":
      // Envío gratis: descuento 100%
      discountValue = -100;
      code = "ENVIOGRATIS";
      break;
    case "AGENCIA_25":
    case "AGENCIA_P_25":
      discountValue = -25;
      code = "ENVIO25";
      break;
    case "AGENCIA_P_50":
      discountValue = -50;
      code = "ENVIO50";
      break;
    default:
      // Sin descuento: no creamos ninguna Price Rule
      return "";
  }
  
  const priceRuleId = await crearPriceRule(discountValue);
  const discountCode = await crearDiscountCode(priceRuleId, code);
  return discountCode;
}
