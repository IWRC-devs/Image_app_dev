const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const mysql = require('mysql2');
const cors = require('cors');

/*const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT
});*/

app.use(cors());
app.use(express.json());

// Create a connection pool for Railway MySQL
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: test the pool on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database via pool.');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
})();

// Root endpoint
app.get('/', (req, res) => {
  res.send('Hello from IWRC Imaging Backend!');
});

// Affiliations route
app.get('/api/affiliations', (req, res) => {
  const sql = 'SELECT id, name FROM affiliations';
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json(results);
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});


