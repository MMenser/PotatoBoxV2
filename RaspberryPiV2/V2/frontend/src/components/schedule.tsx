import { useEffect, useState } from "react";
import axios from "axios";

interface Schedule {
  id: number;
  box_id: number;
  time: string;
  delta: number;
}

interface ScheduleManagerProps {
  boxId: number;
}

const route = "https://api.potatoheatbox.live/";

function Schedule({ boxId }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [time, setTime] = useState("08:00");
  const [delta, setDelta] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(route + "schedules/" + boxId);
      setSchedules(response.data);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  };

  const createSchedule = async () => {
    if (isNaN(delta) || delta < 0) {
      setError("Delta must be a positive number.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.post(route + "schedules", { box_id: boxId, time, delta });
      setSuccess("Schedule created.");
      fetchSchedules();
    } catch (err) {
      setError("Failed to create schedule.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      await axios.delete(route + "schedules/" + id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting schedule:", err);
      setError("Failed to delete schedule.");
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [boxId]);

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* New schedule form */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-slate-500 text-xs font-mono">TIME</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-mono rounded px-2 py-1 w-full focus:outline-none focus:border-cyan-600"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-slate-500 text-xs font-mono">DELTA (°F)</span>
            <input
              type="number"
              value={delta}
              step="0.1"
              onChange={(e) => setDelta(parseFloat(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-mono rounded px-2 py-1 w-full text-center focus:outline-none focus:border-cyan-600"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
        {success && <p className="text-green-400 text-xs font-mono">{success}</p>}

        <button
          onClick={createSchedule}
          disabled={loading}
          className="bg-cyan-800 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-mono py-1.5 rounded tracking-widest transition-colors"
        >
          {loading ? "SAVING..." : "+ ADD SCHEDULE"}
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* Schedule list */}
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
        {schedules.length === 0 ? (
          <p className="text-slate-600 text-xs font-mono text-center py-4">NO SCHEDULES</p>
        ) : (
          schedules.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded px-3 py-2"
            >
              <div className="flex gap-5 flex-1">
                <div>
                  <p className="text-slate-600 text-xs font-mono">TIME</p>
                  <p className="text-white text-sm font-mono font-bold">{s.time}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-xs font-mono">DELTA</p>
                  <p className="text-yellow-400 text-sm font-mono font-bold">{s.delta} °F</p>
                </div>
                <div>
                  <p className="text-slate-600 text-xs font-mono">REPEATS</p>
                  <p className="text-slate-300 text-xs font-mono pt-0.5">EVERYDAY</p>
                </div>
              </div>
              <button
                onClick={() => deleteSchedule(s.id)}
                className="text-red-600 hover:text-red-400 text-xs font-mono tracking-wider transition-colors"
              >
                DEL
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Schedule;
