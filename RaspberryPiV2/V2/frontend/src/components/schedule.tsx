import { useEffect, useState } from "react";
import axios from "axios";

interface Schedule {
  id: number;
  box_id: number;
  time: string;
  day: string;
  voltage: number;
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
  const selectedBox = boxId;

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(route + "schedules/" + selectedBox);
      setSchedules(response.data);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  };

  const createSchedule = async () => {
    if (isNaN(delta) || delta < 0) {
      setError("Voltage must be a positive number.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.post(route + "schedules", {
        box_id: selectedBox,
        time,
        day: "everyday",
        delta,
      });
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
  }, [selectedBox]);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-white">
            Voltage Scheduler
          </h1>
          <p className="text-gray-500 text-sm mt-1 tracking-wider">
            Automate delta changes by time of day
          </p>
        </div>

        {/* Create Schedule Form */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-5">
            New Schedule
          </h2>

          <div className="flex flex-col space-y-4">
            {/* Box selector */}
            <div className="flex flex-row items-center space-x-4">
              <label className="text-gray-400 text-sm w-24 tracking-wider">Box</label>
              <span className="text-gray-300 text-sm rounded px-3 py-2 w-40 text-center">
                {boxId}
              </span>
            </div>

            {/* Time */}
            <div className="flex flex-row items-center space-x-4">
              <label className="text-gray-400 text-sm w-24 tracking-wider">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 w-40 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Delta */}
            <div className="flex flex-row items-center space-x-4">
              <label className="text-gray-400 text-sm w-24 tracking-wider">Delta</label>
              <input
                type="number"
                value={delta}
                step="0.1"
                onChange={(e) => setDelta(parseFloat(e.target.value))}
                className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 w-40 text-center focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Day - always everyday */}
            <div className="flex flex-row items-center space-x-4">
              <label className="text-gray-400 text-sm w-24 tracking-wider">Repeats</label>
              <span className="text-gray-300 text-sm rounded px-3 py-2 w-40 text-center">
                Everyday
              </span>
            </div>
          </div>

          {/* Feedback */}
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          {success && <p className="text-green-400 text-sm mt-4">{success}</p>}

          <button
            onClick={createSchedule}
            disabled={loading}
            className="mt-6 w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded tracking-widest uppercase text-sm transition-colors"
          >
            {loading ? "Saving..." : "Add Schedule"}
          </button>
        </div>

        {/* Existing Schedules */}
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4">
            Active Schedules — Box {selectedBox}
          </h2>

          {schedules.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8 border border-gray-800 rounded-lg">
              No schedules yet.
            </p>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex flex-row items-center justify-between bg-gray-900 border border-gray-700 rounded-lg px-5 py-4"
                >
                  <div className="flex flex-row space-x-8">
                    <div>
                      <p className="text-xs text-gray-500 tracking-wider uppercase mb-1">Time</p>
                      <p className="text-white font-bold">{schedule.time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 tracking-wider uppercase mb-1">Voltage</p>
                      <p className="text-yellow-400 font-bold">{schedule.voltage} V</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 tracking-wider uppercase mb-1">Repeats</p>
                      <p className="text-gray-300">Everyday</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="text-red-500 hover:text-red-400 text-sm font-bold tracking-wider uppercase transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedule;