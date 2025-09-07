const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: '192.168.254.52',       
    user: 'iwrc_app_user',
    password: 'iwrc@tamu',
    database: 'iwrcimaging'
  });

app.use(express.json());

app.get('/', (req, res) => {
res.send('Hello from Express!');
});


app.listen(port, '0.0.0.0', () => {
 console.log(`Server is running on http://0.0.0.0:${port}`);
});

app.get('/api/affiliations', (req, res) => {
  const sql = 'SELECT id, name FROM affiliations';
  connection.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Database error '+err.message);
    }
    res.json(results);
  });
});


