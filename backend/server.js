const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database.');
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.get('/api/affiliations', (req, res) => {
  const sql = 'SELECT id, name FROM affiliations';
  connection.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Database error ' + err.message);
    }
    res.json(results);
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});


