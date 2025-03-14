require('dotenv').config();
const axios = require('axios');

const ODOO_LOGIN_URL = process.env.ODOO_LOGIN_URL;
const ODOO_SERVICE_URL = process.env.ODOO_SERVICE_URL;
const ODOO_USER = process.env.ODOO_USER;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;
const ODOO_DB = process.env.ODOO_DB;

let sessionId = null;


//probar que imprima los datos correctos
console.log("🔹 ODOO_LOGIN_URL:", ODOO_LOGIN_URL);
console.log("🔹 ODOO_SERVICE_URL:", ODOO_SERVICE_URL);
console.log("🔹 ODOO_USER:", ODOO_USER);
console.log("🔹 ODOO_DB:", ODOO_DB);


// 🔹 Autenticar en Odoo
async function authenticateOdoo() {
    try {
        const response = await axios.post(ODOO_LOGIN_URL, {
            jsonrpc: "2.0",
            params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_PASSWORD }
        });
        if (response.data.result) {
            sessionId = response.headers['set-cookie'][0].split(';')[0]; 
            console.log(`✅ Autenticación exitosa en Odoo. Session ID: ${sessionId}`);
        } else {
            throw new Error("❌ Error en autenticación de Odoo");
        }
    } catch (error) {
        console.error("❌ Error al autenticar en Odoo:", error.message);
    }
}

// 🔹 Llamar API de Odoo
async function callOdooAPI(model, fields = [], domain = [], limit = 10, offset = 0) {
    try {
        if (!sessionId) await authenticateOdoo();

        const response = await axios.post(ODOO_SERVICE_URL, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                model,
                method: "search_read",
                args: [domain],
                kwargs: { fields, limit, offset }
            }
        }, { headers: { Cookie: sessionId } });

        return response.data.result;
    } catch (error) {
        console.error(`❌ Error al consultar ${model}:`, error.message);
        throw new Error(`Error en la consulta de ${model}`);
    }
}

// 🔹 Obtener un registro por ID
async function getByIdFromOdoo(model, fields = [], id) {
    try {
        const result = await callOdooAPI(model, fields, [['id', '=', id]]);
        if (result.length === 0) throw new Error("❌ No se encontró el registro");
        return result[0]; // Devuelve el primer resultado
    } catch (error) {
        throw new Error(`Error al obtener ${model} con ID ${id}: ${error.message}`);
    }
}

module.exports = { callOdooAPI, getByIdFromOdoo };
