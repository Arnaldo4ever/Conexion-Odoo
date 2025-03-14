require('dotenv').config();
const express = require('express');
const cors = require('cors');
const odooRoutes = require('./routes/odooRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(checkCreditRoute); // Usa la nueva ruta

app.use('/api/odoo', odooRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
