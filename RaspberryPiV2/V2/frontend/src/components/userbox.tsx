import { useEffect, useState } from "react";
import axios from "axios";

interface UserBoxProps {
  id: number;
}

const route = "https://api.potatoheatbox.live/";

function UserBox({ id }: UserBoxProps) {
  const [averageTemperature, setAverageTemperature] = useState<number | null>(null);
  const [ambientTemperature, setAmbientTemperature] = useState<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [inputDelta, setInputDelta] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const fetchAPI = async () => {
    try {
      const response = await axios.get(route + "getData/" + id + "/1");
      const latest = response.data[0];
      const fetchedDelta = parseFloat(latest._delta);
      setAverageTemperature(parseFloat(latest._averageTemperature));
      setAmbientTemperature(parseFloat(latest._ambientTemperature));
      setDelta(fetchedDelta);
      setInputDelta(fetchedDelta);
    } catch (err) {
      console.error("Error fetching box data:", err);
    }
  };

  const changeDelta = async (newDelta: number) => {
    const rounded = Math.round(newDelta);
    if (rounded < 0 || rounded > 30) return;
    setInputDelta(rounded);
    setSaving(true);
    setSaveError(false);
    try {
      await axios.post(`${route}changeDelta/${id}/${rounded}`);
      setDelta(rounded);
    } catch (err) {
      console.error("Error updating delta:", err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchAPI();
    const interval = setInterval(fetchAPI, 60000);
    return () => clearInterval(interval);
  }, [id]);

  const loading = averageTemperature === null;

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8 w-full max-w-sm">
      <h2 className="text-2xl font-bold text-white tracking-wide">Box {id}</h2>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <>
          {/* Temperature cards */}
          <div className="flex flex-col gap-4 w-full">
            <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-1">
              <p className="text-gray-400 text-sm uppercase tracking-widest">Ambient</p>
              <p className="text-5xl font-bold text-green-400">
                {ambientTemperature!.toFixed(1)}
                <span className="text-2xl font-normal text-gray-400"> °F</span>
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-1">
              <p className="text-gray-400 text-sm uppercase tracking-widest">Current Temp</p>
              <p className="text-5xl font-bold text-green-400">
                {averageTemperature!.toFixed(1)}
                <span className="text-2xl font-normal text-gray-400"> °F</span>
              </p>
            </div>
          </div>

          {/* Delta control */}
          <div className="bg-gray-900 rounded-2xl p-6 w-full flex flex-col items-center gap-3">
            <p className="text-gray-400 text-sm uppercase tracking-widest">Target Delta</p>
            <div className="flex items-center gap-5">
              <button
                onClick={() => changeDelta(inputDelta - 1)}
                disabled={saving || inputDelta <= 0}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-bold hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                −
              </button>
              <p className="text-5xl font-bold text-white w-16 text-center">{inputDelta}</p>
              <button
                onClick={() => changeDelta(inputDelta + 1)}
                disabled={saving || inputDelta >= 30}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-bold hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-gray-500 text-xs">
              {saving
                ? "Saving..."
                : saveError
                ? "Failed to save — try again"
                : delta !== null
                ? `Active: ${delta} °F`
                : ""}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default UserBox;
