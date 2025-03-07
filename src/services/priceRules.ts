// src/services/priceRules.ts
import axios from 'axios';

const SHOPIFY_STORE = 'upangodemo7.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = '4b2c8fe6f01d6554b965e5f2a451fafc';

export async function crearPriceRule(discountValue: number): Promise<number> {
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-04/price_rules.json`;
  const priceRulePayload = {
    price_rule: {
      title: "Descuento en envío por agencia",
      target_type: "shipping_line",
      target_selection: "all",
      allocation_method: "across",
      value_type: "percentage",
      value: discountValue,
      customer_selection: "all",
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

export async function crearDiscountCode(priceRuleId: number, code: string): Promise<string> {
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-04/price_rules/${priceRuleId}/discount_codes.json`;
  const discountCodePayload = {
    discount_code: { code: code }
  };

  const response = await axios.post(url, discountCodePayload, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    }
  });
  return response.data.discount_code.code;
}

export async function generarDescuentoPorAgencia(formaEntrega: string): Promise<string> {
  let discountValue = 0;
  let code = "";
  
  switch (formaEntrega) {
    case "AGENCIA0_GRATUITA":
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
      return "";
  }
  
  const priceRuleId = await crearPriceRule(discountValue);
  const discountCode = await crearDiscountCode(priceRuleId, code);
  return discountCode;
}
