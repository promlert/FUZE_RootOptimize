const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const NEXTBILLION_API_KEY = '678c1cacb26447169219a90759b11cbc';
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
// POST /api/optimize
app.post('/api/optimize', async (req, res) => {
  try {
    const { jobs, vehicles, options } = req.body;
    console.log('Received payload:', JSON.stringify({ jobs, vehicles, options }, null, 2));

    // Validate payload
    if (!jobs || !vehicles || !options || !Array.isArray(jobs) || !Array.isArray(vehicles)) {
      console.error('Invalid payload structure:', { jobs, vehicles, options });
      return res.status(400).json({ error: 'Jobs, vehicles, and options must be provided as arrays' });
    }
    if (jobs.length === 0 || vehicles.length === 0) {
      console.error('Empty jobs or vehicles array');
      return res.status(400).json({ error: 'Jobs and vehicles cannot be empty' });
    }

    // Validate API key
    if (!NEXTBILLION_API_KEY) {
      console.error('NEXTBILLION_API_KEY is not set in .env');
      return res.status(500).json({ error: 'Missing NEXTBILLION_API_KEY' });
    }

    // Build locations array
    const locationMap = new Map();
    const locationsArray = [];
    let locationIndex = 0;

    // Process job locations
    for (const job of jobs) {
      if (!job.latitude || !job.longitude) {
        console.warn(`Job ${job.id} missing coordinates: lat=${job.latitude}, lon=${job.longitude}`);
        continue;
      }
      const lat = parseFloat(job.latitude);
      const lon = parseFloat(job.longitude);
      if (isNaN(lat) || isNaN(lon)) {
        console.warn(`Invalid coordinates for job ${job.id}: lat=${job.latitude}, lon=${job.longitude}`);
        continue;
      }
      const coords = `${lat.toFixed(6)},${lon.toFixed(6)}`; // Format: "lat,lon"
      const coordsKey = coords;
      if (!locationMap.has(coordsKey)) {
        locationMap.set(coordsKey, locationIndex);
        locationsArray.push(coords);
        locationIndex++;
      }
    }

    // Process vehicle locations
    for (const vehicle of vehicles) {
      if (vehicle.start_location_lat && vehicle.start_location_lon) {
        const lat = parseFloat(vehicle.start_location_lat);
        const lon = parseFloat(vehicle.start_location_lon);
        if (isNaN(lat) || isNaN(lon)) {
          console.warn(`Invalid coordinates for vehicle ${vehicle.id}: lat=${vehicle.start_location_lat}, lon=${vehicle.start_location_lon}`);
          continue;
        }
        const coords = `${lat.toFixed(6)},${lon.toFixed(6)}`;
        const coordsKey = coords;
        if (!locationMap.has(coordsKey)) {
          locationMap.set(coordsKey, locationIndex);
          locationsArray.push(coords);
          locationIndex++;
        }
      } else {
        console.log(`Vehicle ${vehicle.id} has no start location (optional)`);
      }
    }

    // Validate locations
    if (locationsArray.length === 0) {
      console.error('No valid locations found');
      return res.status(400).json({
        error: 'No valid location coordinates provided',
        details: 'Ensure jobs and vehicles have valid latitude/longitude',
      });
    }

    // Construct locations object
    const locations = {
      location: locationsArray,
    };

    // Transform jobs
    const transformedJobs = jobs
      .filter((job) => !isNaN(parseFloat(job.latitude)) && !isNaN(parseFloat(job.longitude)))
      .map((job) => {
        const lat = parseFloat(job.latitude).toFixed(6);
        const lon = parseFloat(job.longitude).toFixed(6);
        const coordsKey = `${lat},${lon}`;
        return {
          id: job.id,
          location_index: locationMap.get(coordsKey),
          service: parseInt(job.service_time),
          time_windows: [[parseInt(job.time_window_start), parseInt(job.time_window_end)]],
          amount: job.amount ? [parseInt(job.amount)] : [0],
        };
      });

    // Transform vehicles
    const transformedVehicles = vehicles.map((vehicle) => {
      let startIndex;
      if (vehicle.start_location_lat && vehicle.start_location_lon) {
        const lat = parseFloat(vehicle.start_location_lat).toFixed(6);
        const lon = parseFloat(vehicle.start_location_lon).toFixed(6);
        const coordsKey = `${lat},${lon}`;
        if (locationMap.has(coordsKey)) {
          startIndex = locationMap.get(coordsKey);
        }
      }
      return {
        id: vehicle.id,
        capacity: [parseInt(vehicle.capacity)],
        start_index: startIndex,
        shift_time: [parseInt(vehicle.shift_start), parseInt(vehicle.shift_end)],
      };
    });

    // Validate transformed data
    if (transformedJobs.length === 0) {
      console.error('No valid jobs after transformation');
      return res.status(400).json({ error: 'No valid jobs with coordinates' });
    }

    // Construct API payload
    const apiPayload = {
      locations,
      jobs: transformedJobs,
      vehicles: transformedVehicles,
      options: {
        max_waiting_time: parseInt(options.max_waiting_time) || 300,
        max_tasks: options.max_tasks ? parseInt(options.max_tasks) : undefined,
      },
    };

    // Log raw payload
    console.log('Raw payload to Nextbillion API:', JSON.stringify(apiPayload, null, 2));

    // Send POST request to Nextbillion API
    try {
      const postResponse = await axios.post(
        `https://api.nextbillion.io/optimization/v2?key=${NEXTBILLION_API_KEY}`,
        apiPayload,
        {
          headers: { 'Content-Type': 'application/json' },
          transformRequest: [(data) => {
            const serialized = JSON.stringify(data);
            console.log('Serialized request body:', serialized);
            return serialized;
          }],
        }
      );
      console.log('Nextbillion POST response:', JSON.stringify(postResponse.data, null, 2));

      // Extract job ID
      const jobId = postResponse.data.id;
      if (!jobId) {
        console.error('No job ID in POST response');
        return res.status(500).json({ error: 'No job ID returned from POST request' });
      }

      // Poll GET request for result
      let getResponse;
      let attempts = 0;
      const maxAttempts = 10;
      const delay = 2000; // 2 seconds

      while (attempts < maxAttempts) {
        try {
          getResponse = await axios.get(
            `https://api.nextbillion.io/optimization/v2/result?id=${jobId}&key=${NEXTBILLION_API_KEY}`,
            { headers: { 'Content-Type': 'application/json' } }
          );
          console.log('Nextbillion GET response:', JSON.stringify(getResponse.data, null, 2));

          // Check if result is ready
          if (getResponse.data.status === 'Ok' && getResponse.data.result) {
            break;
          }
          console.log(`Result not ready, retrying (${attempts + 1}/${maxAttempts})...`);
        } catch (getError) {
          console.error('GET request error:', {
            message: getError.message,
            status: getError.response?.status,
            data: getError.response?.data,
          });
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (!getResponse || !getResponse.data.result) {
        console.error('Failed to retrieve optimization result after max attempts');
        return res.status(500).json({ error: 'Failed to retrieve optimization result' });
      }

      // Save result to database
      const result = await pool.query(
        'INSERT INTO optimization_results (result) VALUES ($1) RETURNING *',
        [getResponse.data]
      );

      res.json(result.rows[0]);
    } catch (apiError) {
      console.error('Nextbillion API error:', {
        message: apiError.message,
        status: apiError.response?.status,
        data: apiError.response?.data,
      });
      return res.status(apiError.response?.status || 500).json({
        error: 'Nextbillion API request failed',
        details: apiError.response?.data || apiError.message,
      });
    }
  } catch (error) {
    console.error('Error in /api/optimize:', {
      message: error.message,
      stack: error.stack,
      response: error.response ? error.response.data : null,
    });
    res.status(500).json({ error: 'Internal server error', details: error.response?.data || error.message });
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