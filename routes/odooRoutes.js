const express = require('express');
const { callOdooAPI, getByIdFromOdoo } = require('../config/odoo');
const router = express.Router();

// 🔹 Listar productos con paginación
router.get('/products', async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const products = await callOdooAPI('product.product', ['name', 'default_code', 'list_price', 'qty_available'], [], parseInt(limit), parseInt(offset));
        res.json({ products, pagination: { limit, offset, total: products.length } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Buscar producto por ID
router.get('/products/:id', async (req, res) => {
    try {
        const product = await getByIdFromOdoo('product.product', ['name', 'default_code', 'list_price', 'qty_available'], parseInt(req.params.id));
        res.json(product);
    } catch (error) {
        res.status(404).json({ error: error.message });
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
        const users = await callOdooAPI('res.users', ['name', 'login', 'email']);
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Buscar usuario por ID
router.get('/users/:id', async (req, res) => {
    try {
        const user = await getByIdFromOdoo('res.users', ['name', 'login', 'email'], parseInt(req.params.id));
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: error.message });
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
        const partners = await callOdooAPI('res.partner', ['name', 'email', 'phone']);
        res.json({ partners });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Buscar partner por ID
router.get('/partners/:id', async (req, res) => {
    try {
        const partner = await getByIdFromOdoo('res.partner', ['name', 'email', 'phone'], parseInt(req.params.id));
        res.json(partner);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

module.exports = router;
