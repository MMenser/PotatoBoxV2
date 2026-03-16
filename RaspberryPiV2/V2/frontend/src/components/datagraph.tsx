import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { useEffect, useState } from 'react';
import axios from 'axios';

// Register the required components for Chart.js
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

interface GraphProps {
  id: number;
  whichGraph: number, // 0 is for ambientAverage, 1 for sensors
}

interface GraphData {
  averageTemperature: number,
  ambientTemperature: number,
  voltage: number,
  sensor1: number,
  sensor2: number,
  sensor3: number,
  sensor4: number,
  timestamp: number;
}

const route = "https://api.potatoheatbox.live/";

function datagraph({ id, whichGraph }: GraphProps) {
  const [timeScale, setTimeScale] = useState(30); // Default time scale = limit of how many data points to show - data inserted every 1 minute
  const [data, setData] = useState<GraphData[]>([]);

  const fetchAPI = async () => {
    try {
      const response = await axios.get(route + "getData/" + id + "/" + timeScale); // Get the most recent data point for this box
      console.log("Response Data: ", response.data);
      const parsedData: GraphData[] = response.data.map((item: any) => ({
        averageTemperature: item._averageTemperature,
        ambientTemperature: item._ambientTemperature,
        voltage: item._currentVoltage,
        sensor1: item._sensor1,
        sensor2: item._sensor2,
        sensor3: item._sensor3,
        sensor4: item._sensor4,
        timestamp: item._timestamp,
      })).reverse();
      setData(parsedData);
      console.log("Data: ", data);
    } catch (err) {
      console.error("Error fetching box data:", err);
    }
  };

  // Prepare chart data
  const averageAndambient = {
    labels: data.map(d => {
      const date = new Date(d.timestamp * 1000);
      return date.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }),
    datasets: [
      {
        label: 'Average Temperature (°F)',
        data: data.map(d => d.averageTemperature),
        borderColor: 'rgb(173, 238, 116)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
        yAxisID: 'y', // Temperature axis
      },
      {
        label: 'Ambient Temperature (°F)',
        data: data.map(d => d.ambientTemperature),
        borderColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
        yAxisID: 'y', // Temperature axis
      },
      {
        label: 'Voltage (V)',
        data: data.map(d => d.voltage),
        borderColor: 'rgb(255, 206, 86)', // Yellow
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
        yAxisID: 'y1', // Voltage axis (secondary)
      }
    ],
  };

  const sensorChart = {
    labels: data.map(d => {
      const date = new Date(d.timestamp * 1000);
      return date.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }),
    datasets: [
      {
        label: 'Sensor 1 (°F)',
        data: data.map(d => d.sensor1),
        borderColor: 'rgb(173, 238, 116)', // light green
        backgroundColor: 'rgba(173, 238, 116, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Sensor 2 (°F)',
        data: data.map(d => d.sensor2),
        borderColor: 'rgb(255, 255, 255)', // white
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Sensor 3 (°F)',
        data: data.map(d => d.sensor3),
        borderColor: 'rgb(255, 99, 132)', // pink/red
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Sensor 4 (°F)',
        data: data.map(d => d.sensor4),
        borderColor: 'rgb(54, 162, 235)', // blue
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  // Chart options with dual y-axes
  const temperatureVoltageOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Temperature and Voltage Over Time' },
    },
    scales: {
      x: { 
        title: { display: true, text: 'Time' } 
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { 
          display: true, 
          text: 'Temperature (°F)' 
        },
        beginAtZero: false,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { 
          display: true, 
          text: 'Voltage (V)' 
        },
        beginAtZero: false,
        grid: {
          drawOnChartArea: false, // Only want the grid lines for one axis
        },
      },
    },
  };

  // Chart options for sensor chart
  const sensorOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Temperature Over Time' },
    },
    scales: {
      x: { title: { display: true, text: 'Time' } },
      y: { title: { display: true, text: 'Temperature (°F)' }, beginAtZero: false },
    },
  };

  useEffect(() => {
    fetchAPI();
    // Auto-refresh every 30 seconds to keep "time ago" updated
    const interval = setInterval(() => {
      fetchAPI();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [timeScale, id]);

  return (
    <div className="flex flex-col items-center">
      {whichGraph ? (
        <Line data={sensorChart} options={sensorOptions} />
      ) : (
        <Line data={averageAndambient} options={temperatureVoltageOptions} />
      )}
      <div className="mt-4 flex justify-center space-x-4">
        <button
          onClick={() => setTimeScale(30)}
          className={`px-4 py-2 rounded-md ${timeScale === 30 ? "bg-blue-600 text-white" : "bg-gray-700 text-white"
            }`}
        >
          30 Min
        </button>
        <button
          onClick={() => setTimeScale(720)}
          className={`px-4 py-2 rounded-md ${timeScale === 720 ? "bg-blue-600 text-white" : "bg-gray-700 text-white"
            }`}
        >
          12 Hr
        </button>
        <button
          onClick={() => setTimeScale(1440)}
          className={`px-4 py-2 rounded-md ${timeScale === 1440 ? "bg-blue-600 text-white" : "bg-gray-700 text-white"
            }`}
        >
          24 Hr
        </button>
        <input
          type="text"
          placeholder="Enter Min"
          onChange={(e) => setTimeScale(Number(e.target.value))}
          className="px-4 py-2 bg-gray-700 text-white rounded-md placeholder-gray-300 w-26 text-center"
        />
      </div>
    </div>
  );
}

export default datagraph;