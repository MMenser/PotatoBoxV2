import React, { useEffect, useState } from "react";
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
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [inputDelta, setInputDelta] = useState(0);
  const [deltaMsg, setDeltaMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sensor1, setSensor1] = useState(0.0);
  const [sensor2, setSensor2] = useState(0.0);
  const [sensor3, setSensor3] = useState(0.0);
  const [sensor4, setSensor4] = useState(0.0);

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
      if (latest._timestamp) {
        setLastReceived(calculateTimeAgo(latest._timestamp));
        setLastTimestamp(latest._timestamp);
      }
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
      setDeltaMsg({ text: "Delta must be between 0 and 30.", ok: false });
      return;
    }
    try {
      const roundedDelta = Math.round(inputDelta);
      await axios.post(`${route}changeDelta/${id}/${roundedDelta}`);
      setDelta(inputDelta);
      setDeltaMsg({ text: "Delta updated successfully.", ok: true });
    } catch (err) {
      console.error("Error updating delta:", err);
      setDeltaMsg({ text: "Failed to update delta.", ok: false });
    }
    setTimeout(() => setDeltaMsg(null), 4000);
  };

  useEffect(() => {
    fetchAPI();
    const interval = setInterval(() => {
      fetchAPI();
    }, 60000);
    return () => clearInterval(interval);
  }, [id]);

  const panelHeader = (label: string, right?: React.ReactNode) => (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-4 bg-cyan-400" />
        <span className="text-cyan-400 text-xs tracking-widest font-mono">{label}</span>
      </div>
      {right}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full gap-2 bg-slate-950 text-white">

      {/* Header bar */}
      {(() => {
        const isOnline = lastTimestamp !== null && (Date.now() / 1000 - lastTimestamp) < 300;
        return (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-700 rounded flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-500"}`}
                  style={{ boxShadow: isOnline ? "0 0 6px #4ade80" : "0 0 6px #ef4444" }}
                />
                <span className={`text-xs tracking-widest font-mono ${isOnline ? "text-green-400" : "text-red-400"}`}>
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <span className="text-slate-600 text-xs">|</span>
              <span className="text-white font-mono font-bold tracking-wide">BOX {id}</span>
            </div>
          </div>
        );
      })()}

      {/* Middle row: Parameters + Live Data + Scheduler */}
      <div className="flex gap-2 flex-shrink-0">

        {/* Parameters panel */}
        <div className="bg-slate-900 border border-slate-700 rounded p-3 flex flex-col gap-3" style={{ minWidth: 200 }}>
          {panelHeader("PARAMETERS")}

          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-xs font-mono">EXPORT RANGE</span>
            <div className="flex gap-1">
              <select
                value={isCustom ? "custom" : exportTimeLimit}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "custom") { setIsCustom(true); setExportTimeLimit(0); }
                  else { setIsCustom(false); setExportTimeLimit(Number(value)); }
                }}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 flex-1 font-mono"
              >
                <option value={30}>Last 30 Min</option>
                <option value={720}>Last 12 Hr</option>
                <option value={99}>All</option>
                <option value="custom">Custom...</option>
              </select>
              <button onClick={exportData} className="bg-cyan-800 hover:bg-cyan-700 text-white text-xs px-3 py-1 rounded font-mono transition-colors">
                EXPORT
              </button>
            </div>
            {isCustom && (
              <input
                type="number" min={1} placeholder="Minutes" value={customTime}
                onChange={(e) => { setCustomTime(e.target.value); setExportTimeLimit(Number(e.target.value)); }}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 text-center font-mono"
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-xs font-mono">DELTA (°F)</span>
            <div className="flex gap-1">
              <input
                type="number" step="1.0" value={inputDelta}
                onChange={(e) => setInputDelta(parseFloat(e.target.value))}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 w-16 text-center font-mono"
              />
              <button onClick={changeDelta} className="bg-cyan-800 hover:bg-cyan-700 text-white text-xs px-3 py-1 rounded font-mono transition-colors flex-1">
                APPLY
              </button>
            </div>
            {deltaMsg && (
              <span className={`text-xs font-mono ${deltaMsg.ok ? "text-green-400" : "text-red-400"}`}>
                {deltaMsg.text}
              </span>
            )}
          </div>
        </div>

        {/* Live Data panel */}
        <div className="bg-slate-900 border border-slate-700 rounded p-3 flex-1">
          {panelHeader("INSTANTANEOUS DATA",
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs font-mono">LAST UPDATE</span>
              <span className="text-white font-mono font-bold text-sm">{lastReceived}</span>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "AVG TEMP", value: averageTemperature, unit: "°F", color: "text-green-400", glow: "#4ade80" },
              { label: "AMBIENT",  value: ambientTemperature, unit: "°F", color: "text-green-400", glow: "#4ade80" },
              { label: "DELTA",    value: delta,              unit: "°F", color: "text-green-400", glow: "#4ade80" },
              { label: "VOLTAGE",  value: currentVoltage,     unit: "V",  color: "text-yellow-400", glow: "#facc15" },
              { label: "SENSOR 1", value: sensor1,            unit: "°F", color: "text-cyan-400",  glow: "#22d3ee" },
              { label: "SENSOR 2", value: sensor2,            unit: "°F", color: "text-cyan-400",  glow: "#22d3ee" },
              { label: "SENSOR 3", value: sensor3,            unit: "°F", color: "text-cyan-400",  glow: "#22d3ee" },
              { label: "SENSOR 4", value: sensor4,            unit: "°F", color: "text-cyan-400",  glow: "#22d3ee" },
            ].map(({ label, value, unit, color, glow }) => (
              <div key={label} className="bg-slate-950 border border-slate-800 rounded p-3">
                <p className="text-slate-500 text-xs font-mono mb-1">{label}</p>
                <p className={`text-2xl font-mono font-bold ${color}`} style={{ textShadow: `0 0 12px ${glow}` }}>
                  {value}
                  <span className="text-sm text-slate-400 ml-1 font-normal">{unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Voltage Scheduler panel */}
        <div className="bg-slate-900 border border-slate-700 rounded p-3 flex flex-col" style={{ minWidth: 340 }}>
          {panelHeader("VOLTAGE SCHEDULER")}
          <Schedule boxId={id} />
        </div>
      </div>

      {/* Graphs row */}
      <div className="flex gap-2 flex-1 min-h-0">
        {[
          { label: "TEMPERATURE", graph: 0 },
          { label: "VOLTAGE",     graph: 2 },
          { label: "SENSORS",     graph: 1 },
        ].map(({ label, graph }) => (
          <div key={graph} className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded p-3 flex flex-col min-h-0">
            {panelHeader(label)}
            <div className="flex-1 min-h-0">
              <DataGraph id={id} whichGraph={graph} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Box;