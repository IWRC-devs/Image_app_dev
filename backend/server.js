const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer'); // for handling multipart/form-data
const cloudinary = require('cloudinary').v2;


/*const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT
});*/

app.use(cors());
app.use(express.json());
// express.json() and express.urlencoded() are only needed for application/json or application/x-www-form-urlencoded bodies, 
//Multer parses multipart/form-data requests, which is what sent from the frontend when uploading images.
//app.use(express.json({ limit: '10mb' })); // for JSON + base64 images
//app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create a connection pool for Railway MySQL
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// GroundCoverPercent route
app.get('/api/ground-cover-percent', (req, res) => {
  const sql = 'SELECT id, name FROM ground_cover_percent';
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json(results);
  });
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload batch route
app.post('/api/upload-batch', upload.array('images', 500), async (req, res) => {
  try {
    const {
      name,
      affiliation_id,
      size_class,
      flower_answer,
      crop_answer,
      ground_cover_percent_id
    } = req.body;

    const files = req.files; // array of uploaded files
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Upload images to Cloudinary
    const uploadedUrls = [];
    for (const file of req.files) {
      const result = await new Promise < any > ((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: `batches/${name}`, format: 'jpg' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });
      uploadedUrls.push(result.secure_url);
    }

    // Insert into MySQL
    const query = `
      INSERT INTO batches
      (name, affiliation_id, size_class, flower_answer, crop_answer, ground_cover_percent_id, images)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      name,
      affiliation_id || null,
      size_class || null,
      flower_answer || null,
      crop_answer || null,
      ground_cover_percent_id || null,
      JSON.stringify(uploadedUrls),
    ]);

    res.json({ success: true, batchId: result.insertId, uploadedUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/env', (req, res) => {
  res.send('All env variables: ' + JSON.stringify(process.env, null, 2));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});


