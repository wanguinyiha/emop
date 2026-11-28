const express = require('express');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('EMOP server is running');
});

app.post('/reports', async (req, res) => {
  const { area, description } = req.body || {};

  if (typeof area !== 'string' || area.trim() === '') {
    return res.status(400).json({ error: 'area is required and cannot be empty' });
  }
  if (typeof description !== 'string' || description.trim() === '') {
    return res.status(400).json({ error: 'description is required and cannot be empty' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO reports (area, description) VALUES ($1, $2) RETURNING *',
      [area.trim(), description.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save report' });
  }
});

app.get('/reports', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reports ORDER BY created_at DESC, id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.listen(PORT, () => {
  console.log(`EMOP server is running on port ${PORT}`);
});
