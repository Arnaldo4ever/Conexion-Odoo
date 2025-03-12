import { Router } from 'express';
import axios from 'axios';
import archiver from 'archiver';

const router = Router();

// Configuración de Odoo
const ODOO_CONFIG = {
  LOGIN_URL: 'https://garys.zenn.es/web/session/authenticate',
  SERVICE_URL: 'https://garys.zenn.es/web/dataset/call_kw',
  USER: 'upango',
  PASSWORD: '4lDbFNNmYhcDLmK',
  DB: 'db-garys'
};

// Función para obtener la sesión en Odoo
async function obtenerSessionId() {
  const payload = {
    params: {
      db: ODOO_CONFIG.DB,
      login: ODOO_CONFIG.USER,
      password: ODOO_CONFIG.PASSWORD,
    }
  };

  const response = await axios.post(ODOO_CONFIG.LOGIN_URL, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return response.data.result.session_id;
}

// Función para obtener los documentos de un producto
async function obtenerDocumentosProducto(productId, sessionId) {
  const payload = {
    params: {
      model: "product.product",
      method: "get_ecommerce_documents",
      kwargs: {},
      args: [productId]
    }
  };

  const response = await axios.post(ODOO_CONFIG.SERVICE_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Openerp-Session-Id': sessionId,
    }
  });
  
  return response.data.result;
}

// Función para obtener datos de productos
async function obtenerProductData(sessionId) {
  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "product.product",
      method: "search_read",
      args: [
        [], 
        ["id", "name", "default_code", "list_price", "standard_price", "categ_id", "qty_available", "barcode", "uom_id"]
      ],
      kwargs: {}
    },
    id: 1
  };

  const response = await axios.post(ODOO_CONFIG.SERVICE_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Openerp-Session-Id': sessionId,
    }
  });
  
  return response.data.result;
}

// Función para obtener datos del usuario en Odoo usando external_id
async function obtenerUserData(externalId, sessionId) {
  // Se asume que el campo que almacena external_id en Odoo se llama "external_id"
  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "res.users",
      method: "search_read",
      args: [
        [["external_id", "=", externalId]], 
        ["id", "partner_id"]
      ],
      kwargs: {}
    },
    id: 1
  };

  const response = await axios.post(ODOO_CONFIG.SERVICE_URL, payload, {
    headers: {
      "Content-Type": "application/json",
      "X-Openerp-Session-Id": sessionId,
    }
  });

  // Se espera que se retorne un arreglo; devolvemos el primer registro
  return response.data.result[0];
}

// Función para validar crédito
// Flujo: se reciben external_id, company (custom field con partner_id de Shopify) y importe (precio del carrito)
router.get('/check-credit', async (req, res) => {
  try {
    const { external_id, company, importe } = req.query;
    if (!external_id || !company || !importe) {
      return res.status(400).json({ error: 'Falta external_id, company o importe en los parámetros' });
    }
    const importeNum = parseFloat(importe);
    const sessionId = await obtenerSessionId();

    // 1. Obtener datos del usuario usando external_id
    const userData = await obtenerUserData(external_id, sessionId);
    if (!userData) {
      return res.status(404).json({ error: 'Usuario no encontrado en el CRM' });
    }
    // userData.partner_id se espera que sea un array: [partner_id, partner_name]
    const partnerIdFromCRM = userData.partner_id && userData.partner_id[0];
    // 2. Comparar partner_id obtenido con el valor del custom field company (que debe ser un número)
    if (parseInt(company) !== parseInt(partnerIdFromCRM)) {
      return res.status(400).json({ error: 'El company no coincide con el partner_id del CRM' });
    }

    // 3. Con el partner_id (company) obtener el crédito disponible
    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "account.move.line",
        method: "search_read",
        args: [
          [
            ["partner_id", "=", parseInt(company)],
            ["account_id.user_type_id.type", "=", "receivable"]
          ],
          ["balance"]
        ],
        kwargs: {}
      },
      id: 1
    };

    const odooResponse = await axios.post(ODOO_CONFIG.SERVICE_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Openerp-Session-Id": sessionId,
      }
    });
    const lines = odooResponse.data.result || [];
    const totalCredit = lines.reduce((sum, line) => sum + line.balance, 0);

    // 4. Comparar el crédito con el importe del carrito
    const creditoValido = totalCredit >= importeNum;
    return res.json({
      creditoValido,
      creditoDisponible: totalCredit
    });
  } catch (error) {
    console.error("Error checking credit:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Resto de las rutas existentes...

router.get('/download-certificates', async (req, res) => {
  const productId = req.query.product_id;
  if (!productId) {
    return res.status(400).send('No se proporcionó ID de producto');
  }

  try {
    const sessionId = await obtenerSessionId();
    const documentos = await obtenerDocumentosProducto(productId, sessionId);

    if (!documentos || documentos.length === 0) {
      return res.status(404).send('No hay certificados disponibles para este producto');
    }

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=certificados_${productId}.zip`
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    for (const doc of documentos) {
      const response = await axios.get(doc.file_url, { responseType: 'arraybuffer' });
      archive.append(response.data, { name: doc.filename });
    }

    archive.finalize();

  } catch (error) {
    console.error('Error en /download-certificates:', error);
    res.status(500).send('Error al obtener certificados');
  }
});

router.get('/products', async (req, res) => {
  try {
    const sessionId = await obtenerSessionId();
    const productos = await obtenerProductData(sessionId);
    res.json({ productos });
  } catch (error) {
    console.error('Error en /products:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

router.get('/check-certificates', async (req, res) => {
  const productId = req.query.product_id;
  if (!productId) {
    return res.status(400).json({ error: 'No se proporcionó ID de producto' });
  }
  try {
    const sessionId = await obtenerSessionId();
    const documentos = await obtenerDocumentosProducto(productId, sessionId);
    res.json({ certificados: documentos });
  } catch (error) {
    console.error("Error en /check-certificates:", error);
    res.status(500).json({ error: 'Error al obtener certificados' });
  }
});

router.get('/generar-descuento', async (req, res) => {
  const formaEntrega = req.query.forma_entrega;
  
  if (!formaEntrega) {
    return res.status(400).json({ error: 'Falta forma_entrega en los parámetros' });
  }

  try {
    const sessionId = await obtenerSessionId();
    const descuento = await generarDescuentoEnvio(sessionId, formaEntrega);
    res.json({ discountCode: descuento });
  } catch (error) {
    console.error('Error en /generar-descuento:', error);
    res.status(500).json({ error: 'Error al generar descuento' });
  }
});

export default router;
