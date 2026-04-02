import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { useEffect, useState } from 'react';
import axios from 'axios';

// Register the required components for Chart.js
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

interface GraphProps {
  id: number;
  whichGraph: number, // 0 is for ambientAverage, 1 for sensors, 2 for voltage
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
      },
      {
        label: 'Ambient Temperature (°F)',
        data: data.map(d => d.ambientTemperature),
        borderColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const voltageChart = {
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
        label: 'Voltage (V)',
        data: data.map(d => d.voltage),
        borderColor: 'rgb(255, 206, 86)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      },
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

  const darkScale = {
    grid: { color: "rgba(30, 41, 59, 1)" },
    ticks: { color: "rgba(100, 116, 139, 1)", font: { family: "monospace", size: 10 } },
    border: { color: "rgba(51, 65, 85, 1)" },
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: "rgba(148, 163, 184, 1)", font: { family: "monospace", size: 10 }, boxWidth: 12 },
      },
      title: { display: false },
    },
    scales: {
      x: { ...darkScale, title: { display: false } },
      y: { ...darkScale, beginAtZero: false, title: { display: false } },
    },
  };

  const temperatureOptions = { ...commonOptions };
  const voltageOptions = { ...commonOptions };
  const sensorOptions = { ...commonOptions };

  useEffect(() => {
    fetchAPI();
    // Auto-refresh every 30 seconds to keep "time ago" updated
    const interval = setInterval(() => {
      fetchAPI();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [timeScale, id]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        {whichGraph === 1 ? (
          <Line data={sensorChart} options={sensorOptions} />
        ) : whichGraph === 2 ? (
          <Line data={voltageChart} options={voltageOptions} />
        ) : (
          <Line data={averageAndambient} options={temperatureOptions} />
        )}
      </div>
      <div className="mt-2 flex justify-center gap-1 flex-shrink-0">
        {[{ label: "30M", value: 30 }, { label: "12H", value: 720 }, { label: "24H", value: 1440 }].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTimeScale(value)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${timeScale === value ? "bg-cyan-800 text-cyan-200 border border-cyan-600" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"}`}
          >
            {label}
          </button>
        ))}
        <input
          type="text"
          placeholder="MIN"
          onChange={(e) => setTimeScale(Number(e.target.value))}
          className="px-2 py-1 bg-slate-800 text-white rounded text-xs font-mono placeholder-slate-600 w-14 text-center border border-slate-700"
        />
      </div>
    </div>
  );
}

export default datagraph;