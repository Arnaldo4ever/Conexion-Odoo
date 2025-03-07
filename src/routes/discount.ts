// src/routes/discount.ts
import { Router, Request, Response } from 'express';
import { generarDescuentoPorAgencia } from '../services/priceRules';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const formaEntrega = req.query.forma_entrega as string;
  if (!formaEntrega) {
    return res.status(400).json({ error: 'Falta el parámetro forma_entrega' });
  }
  
  try {
    const discountCode = await generarDescuentoPorAgencia(formaEntrega);
    if (discountCode) {
      res.json({ discountCode });
    } else {
      res.json({ discountCode: null, message: "No se aplica descuento" });
    }
  } catch (error) {
    console.error('Error generando descuento:', error);
    res.status(500).json({ error: 'Error al generar el descuento' });
  }
});

export default router;
