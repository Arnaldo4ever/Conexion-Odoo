const express = require("express");
const router = express.Router();
const fetch = globalThis.fetch || require('node-fetch'); // Si usas Node.js 18+, puedes usar fetch nativo

// Endpoint para validar crédito del usuario en Odoo
router.get("/api/shopify/check-credit", async (req, res) => {
    const { external_id, company, importe } = req.query;

    // Validar parámetros
    if (!external_id || !company || !importe) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    // Construir URL de la API de Odoo
    const odooUrl = `https://conexion-odoo-production.up.railway.app/api/odoo/check-credit?external_id=${external_id}&company=${company}&importe=${importe}`;

    try {
        const response = await fetch(odooUrl);
        if (!response.ok) {
            throw new Error(`Error en Odoo: ${response.statusText}`);
        }

        const data = await response.json();
        res.json({
            creditoValido: data.creditoValido || false,
            creditoDisponible: data.creditoDisponible || 0
        });

    } catch (error) {
        console.error("❌ Error al conectar con Odoo:", error);
        res.status(500).json({ error: "Error al consultar crédito en Odoo" });
    }
});

module.exports = router;
