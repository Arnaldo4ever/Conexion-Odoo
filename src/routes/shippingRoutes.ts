import { Router } from 'express';
import { ShippingDiscountService } from '../services/shippingDiscountService';
import { Session } from '@shopify/shopify-api';
import { SetupService } from '../services/setupService';

const router = Router();

router.post('/webhooks/cart-update', async (req, res) => {
  try {
    const session = res.locals.shopify.session as Session;
    const { cart, customer } = req.body;

    if (!customer) {
      return res.status(200).send();
    }

    // Obtener la preferencia de envío del cliente
    const shippingPreference = await ShippingDiscountService.getCustomerShippingPreference(
      session,
      customer.id
    );

    // Obtener el descuento correspondiente
    const discount = ShippingDiscountService.getDiscountForShippingType(shippingPreference);

    if (discount.type !== 'none') {
      // Crear y aplicar el descuento automáticamente
      await ShippingDiscountService.createAutomaticDiscount(
        session,
        session.shop,
        discount.discount
      );
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error processing cart update:', error);
    res.status(500).send();
  }
});

// Ruta para la instalación inicial
router.get('/install', async (req, res) => {
  try {
    const session = res.locals.shopify.session as Session;
    
    // Crear el metacampo inicial
    await SetupService.createMetafield(session);
    
    // Configurar webhooks
    await SetupService.setupWebhooks(session);

    res.status(200).json({ message: 'Installation completed successfully' });
  } catch (error) {
    console.error('Error during installation:', error);
    res.status(500).json({ error: 'Installation failed' });
  }
});

export default router;
