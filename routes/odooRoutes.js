const express = require('express');
const { callOdooAPI, getByIdFromOdoo } = require('../config/odoo');
const router = express.Router();

// 🔹 Listar productos con variantes y fecha de entrega
router.get('/products', async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;

        // Obtener productos desde Odoo con variantes
        const products = await callOdooAPI(
            'product.product',
            ['id', 'name', 'default_code', 'list_price', 'qty_available', 'product_variant_ids', 'product_template_attribute_value_ids'],
            [],
            parseInt(limit),
            parseInt(offset)
        );

        console.log('📌 Productos obtenidos:', JSON.stringify(products, null, 2));

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(500).json({ error: 'No se obtuvieron productos desde Odoo' });
        }

        // Obtener variantes de productos
        const variantIds = products.flatMap(product => product.product_variant_ids || []);
        let variants = [];

        if (variantIds.length > 0) {
            variants = await callOdooAPI(
                'product.product',
                ['id', 'name', 'default_code', 'list_price', 'qty_available', 'product_template_attribute_value_ids'],
                [['id', 'in', variantIds]],
                variantIds.length,
                0
            );
            console.log('📌 Variantes obtenidas:', JSON.stringify(variants, null, 2));
        }

        // Obtener órdenes de venta (para fechas de entrega)
        const orders = await callOdooAPI(
            'sale.order',
            ['id', 'name', 'commitment_date'],
            [],
            100,
            0
        );

        // Obtener entregas (stock.picking)
        const deliveries = await callOdooAPI(
            'stock.picking',
            ['id', 'origin', 'scheduled_date'],
            [],
            100,
            0
        );

        // Mapear productos con variantes y fechas de entrega
        const formattedProducts = products.map(product => {
            console.log(`🔍 Procesando producto: ${product.name} (${product.default_code})`);

            // Buscar si hay variantes asociadas
            const productVariants = variants.filter(variant => product.product_variant_ids.includes(variant.id));

            // Verificar si el producto tiene una orden de venta asociada
            const order = orders?.find(o => typeof o.name === 'string' && o.name.includes(product.default_code));

            // Verificar si hay una entrega programada para el producto
            const delivery = deliveries?.find(d => typeof d.origin === 'string' && d.origin.includes(product.default_code));

            return {
                id: product.id,
                name: product.name,
                sku: product.default_code || 'Sin SKU',
                price: product.list_price || 0,
                stock: product.qty_available || 0,
                deliveryDate: order?.commitment_date || delivery?.scheduled_date || 'No disponible',
                variants: productVariants.map(variant => ({
                    id: variant.id,
                    name: variant.name,
                    sku: variant.default_code || 'Sin SKU',
                    price: variant.list_price || 0,
                    stock: variant.qty_available || 0
                }))
            };
        });

        res.json({
            totalProducts: products.length,
            products: formattedProducts.slice(0, 10), // Mostrar solo 10
            pagination: { limit, offset, total: products.length },
        });

    } catch (error) {
        console.error('❌ Error en la ruta /products:', error);
        res.status(500).json({ error: error.message });
    }
});



router.get('/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        // Obtener producto por ID desde Odoo
        const product = await getByIdFromOdoo(
            'product.product',
            ['id', 'name', 'default_code', 'list_price', 'qty_available', 'product_variant_ids', 'product_template_attribute_value_ids'],
            productId
        );

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        console.log('📌 Producto obtenido:', JSON.stringify(product, null, 2));

        // Obtener variantes del producto (si tiene)
        let variants = [];
        if (product.product_variant_ids && product.product_variant_ids.length > 0) {
            variants = await callOdooAPI(
                'product.product',
                ['id', 'name', 'default_code', 'list_price', 'qty_available', 'product_template_attribute_value_ids'],
                [['id', 'in', product.product_variant_ids]],
                product.product_variant_ids.length,
                0
            );
            console.log('📌 Variantes obtenidas:', JSON.stringify(variants, null, 2));
        }

        // Obtener órdenes de venta (para fechas de entrega)
        const orders = await callOdooAPI(
            'sale.order',
            ['id', 'name', 'commitment_date'],
            [],
            100,
            0
        );

        // Obtener entregas (stock.picking)
        const deliveries = await callOdooAPI(
            'stock.picking',
            ['id', 'origin', 'scheduled_date'],
            [],
            100,
            0
        );

        // Verificar si el producto tiene una orden de venta asociada
        const order = orders?.find(o => typeof o.name === 'string' && o.name.includes(product.default_code));

        // Verificar si hay una entrega programada para el producto
        const delivery = deliveries?.find(d => typeof d.origin === 'string' && d.origin.includes(product.default_code));

        // Formatear respuesta
        const formattedProduct = {
            id: product.id,
            name: product.name,
            sku: product.default_code || 'Sin SKU',
            price: product.list_price || 0,
            stock: product.qty_available || 0,
            deliveryDate: order?.commitment_date || delivery?.scheduled_date || 'No disponible',
            variants: variants.map(variant => ({
                id: variant.id,
                name: variant.name,
                sku: variant.default_code || 'Sin SKU',
                price: variant.list_price || 0,
                stock: variant.qty_available || 0
            }))
        };

        res.json(formattedProduct);

    } catch (error) {
        console.error('❌ Error en la ruta /products/:id:', error);
        res.status(500).json({ error: error.message });
    }
});


// 🔹 Buscar producto por Código Modelo (SKU)
router.get('/products/sku/:codigoModelo', async (req, res) => {
    try {
        const { codigoModelo } = req.params;
        if (!codigoModelo) return res.status(400).json({ error: "SKU es requerido" });

        const products = await callOdooAPI('product.product', ['name', 'default_code', 'list_price', 'qty_available'], [['default_code', '=', codigoModelo]]);
        if (products.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        res.json(products[0]);
    } catch (error) {
        res.status(500).json({ error: "Error en la consulta de Odoo" });
    }
});

// 🔹 Listar usuarios
router.get('/users', async (req, res) => {
    try {
        const users = await callOdooAPI('res.users', ['name', 'login', 'email', 'partner_id']);
        
        res.json({ total_users: users.length,
            users: users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Buscar usuario por ID
router.get('/users/:id', async (req, res) => {
    try {
        const user = await getByIdFromOdoo('res.users', ['name', 'login', 'email', 'partner_id'], parseInt(req.params.id));
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// 🔹 Buscar usuario por ID y obtener partner_id para consultar el crédito
router.get('/users/credit/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await getByIdFromOdoo('res.users', ['name', 'login', 'email', 'partner_id'], userId);

        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const partnerId = user.partner_id[0]; // Odoo devuelve un array con el ID en la primera posición

        if (!partnerId) {
            return res.json({ ...user, credit: "No disponible (sin partner_id)" });
        }

        // Consultar el crédito con el partner_id
        const creditData = await getByIdFromOdoo('res.partner', ['credit'], partnerId);

        res.json({
            ...user,
            partner_id: partnerId,
            credit: creditData ? creditData.credit : "No disponible"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Listar órdenes de venta
router.get('/orders', async (req, res) => {
    try {
        const orders = await callOdooAPI('sale.order', ['name', 'state', 'amount_total']);
        res.json({ orders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Buscar orden por ID
router.get('/orders/:id', async (req, res) => {
    try {
        const order = await getByIdFromOdoo('sale.order', ['name', 'state', 'amount_total'], parseInt(req.params.id));
        res.json(order);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// 🔹 Listar partners (clientes/proveedores)
router.get('/partners', async (req, res) => {
    try {
        const partners = await callOdooAPI('res.partner', ['name', 'email', 'phone', 'credit']);
        res.json({ partners });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Buscar partner por ID
router.get('/partners/:id', async (req, res) => {
    try {
        const partner = await getByIdFromOdoo('res.partner', ['name', 'email', 'phone', 'credit'], parseInt(req.params.id));
        res.json(partner);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// 🔹 Obtener documentos adjuntos de un producto
router.get('/products/:id/attachments', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (!productId) return res.status(400).json({ error: 'ID de producto es requerido' });

        const attachments = await callOdooAPI('ir.attachment', ['name', 'datas', 'type'], [['res_model', '=', 'product.product'], ['res_id', '=', productId]]);
        if (!attachments || attachments.length === 0) {
            return res.json({ message: 'No se encontraron documentos adjuntos para este producto', attachments: [] });
        }

        res.json({ attachments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
