const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
 
require('dotenv').config();
 
const app = express();
 
app.use(cors());
app.use(express.json());
 
const PORT = process.env.PORT || 4000;
 
let pool = null;
let dbConnected = false;
 
async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
 
  try {
    await pool.query('SELECT 1');
 
    dbConnected = true;
 
    console.log('Conexão com MySQL estabelecida');
  } catch (err) {
    dbConnected = false;
 
    console.error('MySQL indisponível:', err.message);
    console.log('Servidor continuará funcionando em modo de teste.');
  }
}
 
// Rota de teste
app.get('/', (req, res) => {
  res.json({
    message: 'API Projetofinal funcionando!',
    database: dbConnected ? 'conectado' : 'indisponível'
  });
});
 
// Status da API
app.get('/api/status', (req, res) => {
  res.json({
    api: 'online',
    database: dbConnected ? 'online' : 'offline'
  });
});
 
// Listar produtos
app.get('/api/products', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({
      error: 'Banco de dados indisponível'
    });
  }
 
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products ORDER BY id DESC'
    );
 
    res.json(rows);
  } catch (err) {
    console.error(err);
 
    res.status(500).json({
      error: 'Erro ao listar produtos'
    });
  }
});
 
// Inserir produto
app.post('/api/products', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({
      error: 'Banco de dados indisponível'
    });
  }
 
  const { name, description, price } = req.body;
 
  if (!name || price === undefined) {
    return res.status(400).json({
      error: 'name e price são obrigatórios'
    });
  }
 
  try {
    const [result] = await pool.query(
      'INSERT INTO products (name, description, price) VALUES (?, ?, ?)',
      [name, description || null, price]
    );
 
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );
 
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
 
    res.status(500).json({
      error: 'Erro ao inserir produto'
    });
  }
});
 
// Consultar produto por ID
app.get('/api/products/:id', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({
      error: 'Banco de dados indisponível'
    });
  }
 
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
 
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }
 
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
 
    res.status(500).json({
      error: 'Erro ao consultar produto'
    });
  }
});
 
// Inicia servidor mesmo sem banco
initDb().finally(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API rodando na porta ${PORT}`);
  });
});
 
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
 
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
