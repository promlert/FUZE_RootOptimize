const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// การตั้งค่า PostgreSQL
const pool = new Pool({
  user: 'postgres', // แทนที่ด้วย username ของ PostgreSQL
  host: 'localhost',
  database: 'route_optimization',
  password: 'changeme', // แทนที่ด้วย password ของ PostgreSQL
  port: 5432
});

// เพิ่มงาน (job)
app.post('/api/jobs', async (req, res) => {
  const { id, latitude, longitude, service_time, time_window_start, time_window_end, amount } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO jobs (id, latitude, longitude, service_time, time_window_start, time_window_end, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, latitude, longitude, service_time, time_window_start, time_window_end, amount || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ดึงรายการงานทั้งหมด
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ลบงาน
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เพิ่มยานพาหนะ (vehicle)
app.post('/api/vehicles', async (req, res) => {
  const { id, capacity, shift_start, shift_end, start_location_lat, start_location_lon } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO vehicles (id, capacity, shift_start, shift_end, start_location_lat, start_location_lon)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, capacity, shift_start, shift_end, start_location_lat || null, start_location_lon || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ดึงรายการยานพาหนะทั้งหมด
app.get('/api/vehicles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ลบยานพาหนะ
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เพิ่มประสิทธิภาพเส้นทาง
app.post('/api/optimize', async (req, res) => {
  const apiKey = '678c1cacb26447169219a90759b11cbc'; // แทนที่ด้วย API Key ของคุณ
  const { jobs, vehicles, options } = req.body;

  const payload = {
    jobs: jobs.map(job => {
      const jobData = {
        id: job.id,
        location: [parseFloat(job.longitude), parseFloat(job.latitude)],
        service: parseInt(job.service_time),
        time_windows: [[parseInt(job.time_window_start), parseInt(job.time_window_end)]]
      };
      if (job.amount) jobData.amount = [parseInt(job.amount)];
      return jobData;
    }),
    vehicles: vehicles.map(vehicle => {
      const vehicleData = {
        id: vehicle.id,
        capacity: [parseInt(vehicle.capacity)],
        shift_time: [[parseInt(vehicle.shift_start), parseInt(vehicle.shift_end)]]
      };
      if (vehicle.start_location_lat && vehicle.start_location_lon) {
        vehicleData.start_location = [parseFloat(vehicle.start_location_lon), parseFloat(vehicle.start_location_lat)];
      }
      return vehicleData;
    }),
    options: options || { max_waiting_time: 300 }
  };

  try {
    const response = await axios.post(
      `https://api.nextbillion.io/optimization/v2?key=${apiKey}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    // บันทึกผลลัพธ์ลงฐานข้อมูล
    await pool.query(
      `INSERT INTO optimization_results (result) VALUES ($1)`,
      [response.data]
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ดึงผลลัพธ์การเพิ่มประสิทธิภาพทั้งหมด
app.get('/api/results', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM optimization_results ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});