const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Instancia o pool diretamente de forma síncrona
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Função para testar a conexão com o banco antes de subir o servidor
async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    connection.release();

    app.listen(PORT, () => {
      console.log(`API rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  }
}

// Listar todos os produtos
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Inserir produto (body: { name, description, price })
app.post('/api/products', async (req, res) => {
  const { name, description, price } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name e price são obrigatórios' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO products (name, description, price) VALUES (?, ?, ?)',
      [name, description || null, price]
    );
    const insertedId = result.insertId;
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [insertedId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao inserir produto' });
  }
});

// Consultar produto por id
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar produto' });
  }
});

// Tratamento de erros globais
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

// Inicia a aplicação
startServer();
