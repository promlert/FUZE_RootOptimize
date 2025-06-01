import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import './App.css';

const mapContainerStyle = {
  height: '500px',
  width: '100%',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

function App() {
  const [jobs, setJobs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [jobForm, setJobForm] = useState({
    id: '',
    latitude: '',
    longitude: '',
    service_time: '',
    time_window_start: '',
    time_window_end: '',
    amount: '',
  });
  const [vehicleForm, setVehicleForm] = useState({
    id: '',
    capacity: '',
    shift_start: '',
    shift_end: '',
    start_location_lat: '',
    start_location_lon: '',
  });
  const [options, setOptions] = useState({
    max_waiting_time: '300',
    max_tasks: '',
  });
  const [apiResponse, setApiResponse] = useState(null);
  const [resultsHistory, setResultsHistory] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 13.7563, lng: 100.5018 }); // เริ่มต้นที่กรุงเทพฯ
  const [selectedMarker, setSelectedMarker] = useState(null);

  // โหลดข้อมูลเมื่อเริ่มต้น
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsResponse, vehiclesResponse, resultsResponse] = await Promise.all([
        axios.get('http://localhost:3000/api/jobs'),
        axios.get('http://localhost:3000/api/vehicles'),
        axios.get('http://localhost:3000/api/results'),
      ]);
      setJobs(jobsResponse.data);
      setVehicles(vehiclesResponse.data);
      setResultsHistory(resultsResponse.data);
      if (jobsResponse.data.length > 0) {
        setMapCenter({
          lat: parseFloat(jobsResponse.data[0].latitude),
          lng: parseFloat(jobsResponse.data[0].longitude),
        });
      }
      setError(null);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้: ' + err.message);
    }
  };

  // จัดการการเปลี่ยนแปลงฟอร์มงาน
  const handleJobChange = (e) => {
    const { name, value } = e.target;
    setJobForm({ ...jobForm, [name]: value });
  };

  // จัดการการเปลี่ยนแปลงฟอร์มยานพาหนะ
  const handleVehicleChange = (e) => {
    const { name, value } = e.target;
    setVehicleForm({ ...vehicleForm, [name]: value });
  };

  // จัดการการเปลี่ยนแปลงตัวเลือก
  const handleOptionsChange = (e) => {
    setOptions({ ...options, [e.target.name]: e.target.value });
  };

  // ตรวจสอบฟอร์มงาน
  const validateJobForm = () => {
    const { id, latitude, longitude, service_time, time_window_start, time_window_end } = jobForm;
    if (!id || !latitude || !longitude || !service_time || !time_window_start || !time_window_end) {
      setError('กรุณากรอกข้อมูลงานให้ครบถ้วน');
      return false;
    }
    if (
      isNaN(parseFloat(latitude)) ||
      isNaN(parseFloat(longitude)) ||
      isNaN(parseInt(service_time)) ||
      isNaN(parseInt(time_window_start)) ||
      isNaN(parseInt(time_window_end))
    ) {
      setError('ข้อมูลพิกัด, เวลาให้บริการ, และหน้าต่างเวลาต้องเป็นตัวเลข');
      return false;
    }
    return true;
  };

  // ตรวจสอบฟอร์มยานพาหนะ
  const validateVehicleForm = () => {
    const { id, capacity, shift_start, shift_end } = vehicleForm;
    if (!id || !capacity || !shift_start || !shift_end) {
      setError('กรุณากรอกข้อมูลยานพาหนะให้ครบถ้วน');
      return false;
    }
    if (isNaN(parseInt(capacity)) || isNaN(parseInt(shift_start)) || isNaN(parseInt(shift_end))) {
      setError('ข้อมูลความจุและช่วงเวลาทำงานต้องเป็นตัวเลข');
      return false;
    }
    return true;
  };

  // เพิ่มงาน
  const addJob = async (e) => {
    e.preventDefault();
    if (!validateJobForm()) return;
    try {
      await axios.post('http://localhost:3000/api/jobs', {
        ...jobForm,
        latitude: parseFloat(jobForm.latitude),
        longitude: parseFloat(jobForm.longitude),
        service_time: parseInt(jobForm.service_time),
        time_window_start: parseInt(jobForm.time_window_start),
        time_window_end: parseInt(jobForm.time_window_end),
        amount: jobForm.amount ? parseInt(jobForm.amount) : null,
      });
      setJobForm({
        id: '',
        latitude: '',
        longitude: '',
        service_time: '',
        time_window_start: '',
        time_window_end: '',
        amount: '',
      });
      setSuccess('เพิ่มงานสำเร็จ');
      setError(null);
      loadData();
    } catch (err) {
      setError('เพิ่มงานล้มเหลว: ' + err.message);
      setSuccess(null);
    }
  };

  // ลบงาน
  const deleteJob = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/jobs/${id}`);
      setSuccess('ลบงานสำเร็จ');
      setError(null);
      loadData();
    } catch (err) {
      setError('ลบงานล้มเหลว: ' + err.message);
      setSuccess(null);
    }
  };

  // เพิ่มยานพาหนะ
  const addVehicle = async (e) => {
    e.preventDefault();
    if (!validateVehicleForm()) return;
    try {
      await axios.post('http://localhost:3000/api/vehicles', {
        ...vehicleForm,
        capacity: parseInt(vehicleForm.capacity),
        shift_start: parseInt(vehicleForm.shift_start),
        shift_end: parseInt(vehicleForm.shift_end),
        start_location_lat: vehicleForm.start_location_lat ? parseFloat(vehicleForm.start_location_lat) : null,
        start_location_lon: vehicleForm.start_location_lon ? parseFloat(vehicleForm.start_location_lon) : null,
      });
      setVehicleForm({
        id: '',
        capacity: '',
        shift_start: '',
        shift_end: '',
        start_location_lat: '',
        start_location_lon: '',
      });
      setSuccess('เพิ่มยานพาหนะสำเร็จ');
      setError(null);
      loadData();
    } catch (err) {
      setError('เพิ่มยานพาหนะล้มเหลว: ' + err.message);
      setSuccess(null);
    }
  };

  // ลบยานพาหนะ
  const deleteVehicle = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/vehicles/${id}`);
      setSuccess('ลบยานพาหนะสำเร็จ');
      setError(null);
      loadData();
    } catch (err) {
      setError('ลบยานพาหนะล้มเหลว: ' + err.message);
      setSuccess(null);
    }
  };

  // เพิ่มประสิทธิภาพเส้นทาง
  const optimizeRoutes = async () => {
    if (jobs.length === 0 || vehicles.length === 0) {
      setError('ต้องมีงานและยานพาหนะอย่างน้อย 1 รายการ');
      return;
    }
    const payload = {
      jobs,
      vehicles,
      options: {
        max_waiting_time: parseInt(options.max_waiting_time) || 300,
        ...(options.max_tasks && { max_tasks: parseInt(options.max_tasks) }),
      },
    };

    try {
      const response = await axios.post('http://localhost:3000/api/optimize', payload);
      setApiResponse(response.data);
      setSuccess('เพิ่มประสิทธิภาพเส้นทางสำเร็จ');
      setError(null);
      loadData();
    } catch (err) {
      setError('เพิ่มประสิทธิภาพล้มเหลว: ' + err.message);
      setSuccess(null);
      setApiResponse(null);
    }
  };

  // แปลงผลลัพธ์เป็นพิกัดสำหรับ Google Maps Polyline
  const getRoutePolylines = () => {
    if (!apiResponse || !apiResponse.result || !apiResponse.result.routes) return [];
    const polylines = [];
    apiResponse.result.routes.forEach((route) => {
      if (route.geometry) {
        const coordinates = route.geometry.coordinates.map((coord) => ({
          lat: coord[1],
          lng: coord[0],
        }));
        polylines.push({ id: route.vehicle, coordinates });
      }
    });
    return polylines;
  };

  // ล้างข้อความแจ้งเตือน
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          ระบบเพิ่มประสิทธิภาพเส้นทาง
        </h1>

        {/* Notifications */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            {error}
            <button onClick={clearMessages} className="ml-4 text-red-700 font-semibold">
              ปิด
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
            {success}
            <button onClick={clearMessages} className="ml-4 text-green-700 font-semibold">
              ปิด
            </button>
          </div>
        )}

        {/* Map Section */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">แผนที่</h2>
          <LoadScript googleMapsApiKey="AIzaSyAu9KbwnCnByz1GUaccu4XdChyi3p27tic">
            <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={10}>
              {/* Job Markers */}
              {jobs.map((job) => (
                <Marker
                  key={job.id}
                  position={{
                    lat: parseFloat(job.latitude),
                    lng: parseFloat(job.longitude),
                  }}
                  title={job.id}
                  onClick={() => setSelectedMarker({ type: 'job', data: job })}
                />
              ))}
              {/* Vehicle Markers */}
              {vehicles.map((vehicle) => (
                vehicle.start_location_lat &&
                vehicle.start_location_lon && (
                  <Marker
                    key={vehicle.id}
                    position={{
                      lat: parseFloat(vehicle.start_location_lat),
                      lng: parseFloat(vehicle.start_location_lon),
                    }}
                    title={vehicle.id}
                    icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    onClick={() => setSelectedMarker({ type: 'vehicle', data: vehicle })}
                  />
                )
              ))}
              {/* Route Polylines */}
              {getRoutePolylines().map((polyline) => (
                <Polyline
                  key={polyline.id}
                  path={polyline.coordinates}
                  options={{
                    strokeColor: '#0000FF',
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />
              ))}
              {/* Info Window */}
              {selectedMarker && (
                <InfoWindow
                  position={
                    selectedMarker.type === 'job'
                      ? {
                          lat: parseFloat(selectedMarker.data.latitude),
                          lng: parseFloat(selectedMarker.data.longitude),
                        }
                      : {
                          lat: parseFloat(selectedMarker.data.start_location_lat),
                          lng: parseFloat(selectedMarker.data.start_location_lon),
                        }
                  }
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2">
                    <h3 className="font-bold">{selectedMarker.data.id}</h3>
                    {selectedMarker.type === 'job' ? (
                      <>
                        <p>
                          พิกัด: ({selectedMarker.data.latitude}, {selectedMarker.data.longitude})
                        </p>
                        <p>เวลาให้บริการ: {selectedMarker.data.service_time} วินาที</p>
                        <p>
                          หน้าต่างเวลา: [{selectedMarker.data.time_window_start}, {selectedMarker.data.time_window_end}]
                        </p>
                        {selectedMarker.data.amount && <p>จำนวน: {selectedMarker.data.amount}</p>}
                      </>
                    ) : (
                      <>
                        <p>
                          พิกัดเริ่มต้น: ({selectedMarker.data.start_location_lat}, {selectedMarker.data.start_location_lon})
                        </p>
                        <p>ความจุ: {selectedMarker.data.capacity}</p>
                        <p>
                          ช่วงเวลาทำงาน: [{selectedMarker.data.shift_start}, {selectedMarker.data.shift_end}]
                        </p>
                      </>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>

        {/* Job Form */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">เพิ่มงาน</h2>
          <form onSubmit={addJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="id"
              value={jobForm.id}
              onChange={handleJobChange}
              placeholder="รหัสงาน (เช่น job1)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              name="latitude"
              value={jobForm.latitude}
              onChange={handleJobChange}
              placeholder="ละติจูด (เช่น 13.7563)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              name="longitude"
              value={jobForm.longitude}
              onChange={handleJobChange}
              placeholder="ลองจิจูด (เช่น 100.5018)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              name="service_time"
              value={jobForm.service_time}
              onChange={handleJobChange}
              placeholder="เวลาให้บริการ (วินาที, เช่น 300)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              name="time_window_start"
              value={jobForm.time_window_start}
              onChange={handleJobChange}
              placeholder="เริ่มหน้าต่างเวลา (Unix timestamp)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              name="time_window_end"
              value={jobForm.time_window_end}
              onChange={handleJobChange}
              placeholder="สิ้นสุดหน้าต่างเวลา (Unix timestamp)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              name="amount"
              value={jobForm.amount}
              onChange={handleJobChange}
              placeholder="จำนวน (เช่น 10)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition"
              >
                เพิ่มงาน
              </button>
              <button
                type="button"
                onClick={() =>
                  setJobForm({
                    id: '',
                    latitude: '',
                    longitude: '',
                    service_time: '',
                    time_window_start: '',
                    time_window_end: '',
                    amount: '',
                  })
                }
                className="bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400 transition"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </div>

        {/* Vehicle Form */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">เพิ่มยานพาหนะ</h2>
          <form onSubmit={addVehicle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="id"
              value={vehicleForm.id}
              onChange={handleVehicleChange}
              placeholder="รหัสยานพาหนะ (เช่น vehicle1)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              name="capacity"
              value={vehicleForm.capacity}
              onChange={handleVehicleChange}
              placeholder="ความจุ (เช่น 100)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              name="shift_start"
              value={vehicleForm.shift_start}
              onChange={handleVehicleChange}
              placeholder="เริ่มกะ (Unix timestamp)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              name="shift_end"
              value={vehicleForm.shift_end}
              onChange={handleVehicleChange}
              placeholder="สิ้นสุดกะ (Unix timestamp)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              name="start_location_lat"
              value={vehicleForm.start_location_lat}
              onChange={handleVehicleChange}
              placeholder="ละติจูดเริ่มต้น (เช่น 13.7563)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="start_location_lon"
              value={vehicleForm.start_location_lon}
              onChange={handleVehicleChange}
              placeholder="ลองจิจูดเริ่มต้น (เช่น 100.5018)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition"
              >
                เพิ่มยานพาหนะ
              </button>
              <button
                type="button"
                onClick={() =>
                  setVehicleForm({
                    id: '',
                    capacity: '',
                    shift_start: '',
                    shift_end: '',
                    start_location_lat: '',
                    start_location_lon: '',
                  })
                }
                className="bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400 transition"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </div>

        {/* Optimization Options */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">ตัวเลือกการเพิ่มประสิทธิภาพ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="max_waiting_time"
              value={options.max_waiting_time}
              onChange={handleOptionsChange}
              placeholder="เวลารอสูงสุด (วินาที, เช่น 300)"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              name="max_tasks"
              value={options.max_tasks}
              onChange={handleOptionsChange}
              placeholder="จำนวนงานสูงสุดต่อยานพาหนะ"
              className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Job List */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">รายการงาน</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-600">ไม่มีงาน</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="text-left p-4">รหัส</th>
                    <th className="text-left p-4">พิกัด</th>
                    <th className="text-left p-4">เวลาให้บริการ</th>
                    <th className="text-left p-4">หน้าต่างเวลา</th>
                    <th className="text-left p-4">จำนวน</th>
                    <th className="text-right p-4">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-t">
                      <td className="p-4">{job.id}</td>
                      <td className="p-4">({job.latitude}, {job.longitude})</td>
                      <td className="p-4">{job.service_time} วินาที</td>
                      <td className="p-4">[{job.time_window_start}, {job.time_window_end}]</td>
                      <td className="p-4">{job.amount || '-'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle List */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">รายการยานพาหนะ</h2>
          {vehicles.length === 0 ? (
            <p className="text-gray-600">ไม่มียานพาหนะ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="text-left p-4">รหัส</th>
                    <th className="text-left p-4">ความจุ</th>
                    <th className="text-left p-4">ช่วงเวลาทำงาน</th>
                    <th className="text-left p-4">พิกัดเริ่มต้น</th>
                    <th className="text-right p-4">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t">
                      <td className="p-4">{vehicle.id}</td>
                      <td className="p-4">{vehicle.capacity}</td>
                      <td className="p-4">[{vehicle.shift_start}, {vehicle.shift_end}]</td>
                      <td className="p-4">
                        {vehicle.start_location_lat
                          ? `(${vehicle.start_location_lat}, ${vehicle.start_location_lon})`
                          : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteVehicle(vehicle.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Optimize Button */}
        <div className="mb-8">
          <button
            onClick={optimizeRoutes}
            className="w-full bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition text-lg font-semibold"
          >
            เพิ่มประสิทธิภาพเส้นทาง
          </button>
        </div>

        {/* Optimization Result */}
        {apiResponse && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">ผลลัพธ์การเพิ่มประสิทธิภาพ</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* Results History */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">ประวัติผลลัพธ์</h2>
          {resultsHistory.length === 0 ? (
            <p className="text-gray-600">ไม่มีประวัติผลลัพธ์</p>
          ) : (
            <div className="space-y-4">
              {resultsHistory.map((result) => (
                <div key={result.id} className="border p-4 rounded-lg">
                  <p className="text-sm text-gray-500">
                    วันที่: {new Date(result.created_at).toLocaleString()}
                  </p>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mt-2">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;