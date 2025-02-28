// backend/src/index.ts
import express, { Request, Response } from 'express';
import axios from 'axios';
import archiver from 'archiver';
import cors from 'cors';

// Declara 'app' antes de usarla
const app = express();

// Configura CORS
app.use(cors({
  origin: 'https://blocksters-store.myshopify.com' // O usa '*' para permitir cualquier origen (no recomendado en producción)
}));

// Configuración de Odoo
const ODOO_LOGIN_URL = 'https://garys.zenn.es/web/session/authenticate';
const ODOO_SERVICE_URL = 'https://garys.zenn.es/web/dataset/call_kw';
const ODOO_USER = 'upango';
const ODOO_PASSWORD = '4lDbFNNmYhcDLmK';
const ODOO_DB = 'db-garys';

interface OdooLoginResponse {
  result: { session_id: string };
}

interface Documento {
  filename: string;
  file_url: string;
}

interface DocumentosResponse {
  result: Documento[];
}

// Función para obtener la sesión en Odoo
async function obtenerSessionId(): Promise<string> {
  const payload = {
    params: {
      db: ODOO_DB,
      login: ODOO_USER,
      password: ODOO_PASSWORD,
    }
  };

  const response = await axios.post<OdooLoginResponse>(ODOO_LOGIN_URL, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return response.data.result.session_id;
}

// Función para obtener los certificados (documentos) de un producto
async function obtenerDocumentosProducto(productId: string, sessionId: string): Promise<Documento[]> {
  const payload = {
    params: {
      model: "product.product",
      method: "get_ecommerce_documents",
      kwargs: {},
      args: [productId]
    }
  };

  const response = await axios.post<DocumentosResponse>(ODOO_SERVICE_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Openerp-Session-Id': sessionId,
    }
  });
  
  return response.data.result;
}

// Endpoint para descargar los certificados en un ZIP
app.get('/download-certificates', async (req: Request, res: Response) => {
  const productId = req.query.product_id as string;
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

// Función para obtener los datos de productos usando search_read
async function obtenerProductData(sessionId: string): Promise<any[]> {
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
  
    const response = await axios.post<{ result: any[] }>(ODOO_SERVICE_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Openerp-Session-Id': sessionId,
      }
    });
    
    return response.data.result;
  }
  
  // Endpoint para consultar la data de productos en formato JSON
  app.get('/ids', async (req: Request, res: Response) => {
    try {
      const sessionId = await obtenerSessionId();
      const productos = await obtenerProductData(sessionId);
      res.json({ productos });
    } catch (error) {
      console.error('Error en /ids:', error);
      res.status(500).json({ error: 'Error al obtener datos' });
    }
  });

  app.get('/check-certificates', async (req: Request, res: Response) => {
    const productId = req.query.product_id as string;
    if (!productId) {
      return res.status(400).json({ error: 'No se proporcionó ID de producto' });
    }
    try {
      // Obtén el sessionId de Odoo
      const sessionId = await obtenerSessionId();
      // Consulta los certificados del producto
      const documentos = await obtenerDocumentosProducto(productId, sessionId);
      // Retorna la data en JSON
      res.json({ certificados: documentos });
    } catch (error) {
      console.error("Error en /check-certificates:", error);
      res.status(500).json({ error: 'Error al obtener certificados' });
    }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
