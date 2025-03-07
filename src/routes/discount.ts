import express, { Request, Response } from 'express';
const app = express();

app.get('/generar-descuento', async (req: Request, res: Response) => {
  const formaEntrega = req.query.forma_entrega as string; // Se espera que este valor provenga del metafield del cliente
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
