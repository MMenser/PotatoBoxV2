import { useEffect, useState } from "react";
import DataGraph from "./datagraph";
import axios from "axios";
import Schedule from "./schedule";

interface DataRow {
  _entryId: number;
  _boxId: number;
  _ambientTemperature: number;
  _averageTemperature: number;
  _delta: number;
  _currentVoltage: number;
  _sensor1: number;
  _sensor2: number;
  _sensor3: number;
  _sensor4: number;
  _timestamp: number;
}

interface BoxProps {
  id: number;
}

const route = "https://api.potatoheatbox.live/";

function Box({ id }: BoxProps) {
  const [averageTemperature, setAverageTemperature] = useState(0.0);
  const [ambientTemperature, setAmbientTemperature] = useState(0.0);
  const [delta, setDelta] = useState(0);
  const [currentVoltage, setCurrentVoltage] = useState(0);
  const [exportTimeLimit, setExportTimeLimit] = useState(30);
  const [customTime, setCustomTime] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [lastReceived, setLastReceived] = useState<string>("--");
  const [inputDelta, setInputDelta] = useState(0);
  const [sensor1, setSensor1] = useState(0.0);
  const [sensor2, setSensor2] = useState(0.0);
  const [sensor3, setSensor3] = useState(0.0);
  const [sensor4, setSensor4] = useState(0.0);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const calculateTimeAgo = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) return "Unknown";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSecs < 60) return `${diffSecs} sec ago`;
    else if (diffMins < 60) return `${diffMins} min ago`;
    else if (diffHours < 24) return `${diffHours} hr ago`;
    else return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const fetchAPI = async () => {
    try {
      const response = await axios.get(route + "/getData/" + id + "/1");
      const latest = response.data[0];
      setAverageTemperature(parseFloat(latest._averageTemperature));
      setAmbientTemperature(parseFloat(latest._ambientTemperature));
      setDelta(parseFloat(latest._delta));
      setInputDelta(delta);
      setCurrentVoltage(latest._currentVoltage);
      setSensor1(latest._sensor1);
      setSensor2(latest._sensor2);
      setSensor3(latest._sensor3);
      setSensor4(latest._sensor4);
      if (latest._timestamp) setLastReceived(calculateTimeAgo(latest._timestamp));
    } catch (err) {
      console.error("Error fetching box data:", err);
    }
  };

  const exportData = async () => {
    try {
      const response = await axios.get(route + "getData/" + id + "/" + exportTimeLimit);
      const data = response.data;
      const formattedData = (data as DataRow[]).reverse().map((row) => ({
        ...row,
        _timestamp: new Date(row._timestamp * 1000).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      }));
      const headers = Object.keys(formattedData[0]).join(",");
      const rows = formattedData.map((row) =>
        Object.values(row).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
      );
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `box_${id}_data_${exportTimeLimit}min.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  const changeDelta = async () => {
    if (isNaN(inputDelta) || inputDelta < 0 || inputDelta > 30) {
      alert("Delta must be a number between 0 and 30.");
      return;
    }
    try {
      const roundedDelta = Math.round(inputDelta);
      const res = await axios.post(`${route}changeDelta/${id}/${roundedDelta}`);
      console.log("Response:", res.data);
      setDelta(inputDelta);
    } catch (err) {
      console.error("Error updating delta:", err);
      alert("Failed to update delta. Check console for more info.");
    }
  };

  useEffect(() => {
    fetchAPI();
    const interval = setInterval(() => {
      fetchAPI();
    }, 60000);
    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="w-full h-full p-5 bg-black border border-white">
      <h2 className="text-xl text-white font-bold text-center mb-4">Box {id}</h2>

      <div className="flex flex-row gap-6">

        {/* Left: controls + stats */}
        <div className="flex flex-col space-y-2 min-w-fit">

          {/* Export */}
          <div className="flex flex-row items-center space-x-2">
            <select
              value={isCustom ? "custom" : exportTimeLimit}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "custom") {
                  setIsCustom(true);
                  setExportTimeLimit(0);
                } else {
                  setIsCustom(false);
                  setExportTimeLimit(Number(value));
                }
              }}
              className="w-28 bg-gray-700 text-white rounded px-2 py-1"
            >
              <option value={30}>Last 30 Min</option>
              <option value={720}>Last 12 Hr</option>
              <option value={99}>All</option>
              <option value="custom">Custom...</option>
            </select>
            {isCustom && (
              <input
                type="number"
                min={1}
                placeholder="Minutes"
                value={customTime}
                onChange={(e) => {
                  setCustomTime(e.target.value);
                  setExportTimeLimit(Number(e.target.value));
                }}
                className="bg-gray-700 text-white rounded px-2 py-1 w-28 text-center"
              />
            )}
            <button
              type="button"
              onClick={exportData}
              className="w-28 text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-3 py-2"
            >
              Export
            </button>
          </div>

          {/* Change Delta */}
          <div className="flex flex-row items-center space-x-2">
            <input
              type="number"
              step="1.0"
              value={inputDelta}
              onChange={(e) => setInputDelta(parseFloat(e.target.value))}
              className="bg-gray-700 text-white rounded px-2 py-1 w-28 text-center"
            />
            <button
              type="button"
              onClick={changeDelta}
              className="w-28 text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-3 py-2"
            >
              Set Delta
            </button>
          </div>

          {/* Stats */}
          <div className="mt-1 flex flex-col space-y-1 bg-gray-900 rounded-lg p-3">
            {[
              { label: "Last Received", value: lastReceived, color: "text-yellow-400" },
              { label: "Average", value: `${averageTemperature} °F`, color: "text-green-400" },
              { label: "Ambient", value: `${ambientTemperature} °F`, color: "text-green-400" },
              { label: "Delta", value: `${delta} °F`, color: "text-green-400" },
              { label: "Voltage", value: `${currentVoltage} V`, color: "text-green-400" },
              { label: "Sensor 1", value: `${sensor1} °F`, color: "text-green-400" },
              { label: "Sensor 2", value: `${sensor2} °F`, color: "text-green-400" },
              { label: "Sensor 3", value: `${sensor3} °F`, color: "text-green-400" },
              { label: "Sensor 4", value: `${sensor4} °F`, color: "text-green-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-row justify-between space-x-6">
                <p className="text-gray-400 text-sm">{label}</p>
                <p className={`text-sm font-mono ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Schedule toggle button + expandable panel */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setScheduleOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-900 text-white text-sm font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors"
            >
              <span>Voltage Schedule</span>
              <span className="text-gray-400">{scheduleOpen ? "▲" : "▼"}</span>
            </button>
            {scheduleOpen && (
              <div className="border-t border-gray-700">
                <Schedule boxId={id} />
              </div>
            )}
          </div>

        </div>

        {/* Right: graphs */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div>
            <DataGraph id={id} whichGraph={0} />
          </div>
          <div>
            <DataGraph id={id} whichGraph={1} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Box;