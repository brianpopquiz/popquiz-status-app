// PopQuiz MSP Status Tracker - Full App (Admin Persist + Live Task View Fix)

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";



const supabaseUrl = "https://whgpzllhmnitibslaick.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ3B6bGxobW5pdGlic2xhaWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTY4MjAsImV4cCI6MjA2MDQ3MjgyMH0.8mXISi_mCZdeU4ZM6n-G7XjigpetwLdc2Ms5yBRuqgo";
const supabase = createClient(supabaseUrl, supabaseKey);

const TECHS = ["Brian", "Walter", "Rich", "Silouan", "Trevor", "Novick IT"];
const MANAGERS = ["Brian", "Walter", "Trevor", "Novick IT"];
const STATUSES = [
  "Working ticket for:",
  "Working on project",
  "Client call",
  "Business Improvement",
  "PopQuiz Internal Task",
  "On break",
  "In meeting",
  "Studying",
  "Making KB",
  "Onsite",
  "Out for the day",
];

const CLIENT_REQUIRED_STATUSES = [
  "Working ticket for:",
  "Working on project",
  "Client call",
  "In meeting",
  "Onsite"
];
const BREAK_STATUSES = ["On break", "Out for the day"];
const CLIENTS = [
  "Novick", "Fabio", "Sullivans", "Pro Storm", "Metal and Wood", "DDS",
  "Foglia", "Northeast Fence", "Steel Penny", "Super Impulse", "Pennypack",
  "St Doms", "Ferreira Law", "Pollack Law", "Harmony Decking", "ITAF", "Email Support", "Break Fix",
  "Residential Member", "Residential", "M&T", "Make and Take", "Your Approved Contractors", "Winderco", "Groom'n Room", "Vendor Call"
];

function formatESTTime(isoTime) {
  return new Date(isoTime).toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function getDurationMs(start, end) {
  return new Date(end || new Date()) - new Date(start);
}

function getDuration(start, end) {
  const startDate = new Date(start || 0);
  const endDate = new Date(end || 0);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return "0m";
  }

  const ms = endDate - startDate;
  if (ms <= 0) return "0m";

  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}


function getWeeklyClientBreakdown(logs, startDate, endDate) {
 const parsedStart = new Date(startDate);
const parsedEnd = new Date(endDate);

const startRange = isNaN(parsedStart) ? new Date(0) : parsedStart;
const endRange = isNaN(parsedEnd) ? new Date() : parsedEnd;




  const summary = [];
  const clientDayTotals = {};
  const clientWeekTotals = {};
  const techClientDay = {};
  const techClientWeek = {};


  logs.forEach(log => {
    if (!log.endTime || BREAK_STATUSES.includes(log.status)) return;

    if (!log.endTime) return; // 🔒 Skip entries with no end time

    const start = new Date(log.startTime);
    const end = new Date(log.endTime);
    if (isNaN(start) || isNaN(end) || start < startRange || end > endRange) return;

    const ms = end - start;
    const client = log.client || "N/A";
    const tech = log.tech;
    const task = log.status;
    const dateKey = start.toLocaleDateString("en-US");


      if (start >= weekStart) {
      if (!clientWeekTotals[client]) clientWeekTotals[client] = 0;
      clientWeekTotals[client] += ms;


      if (!techClientDay[tech]) techClientDay[tech] = {};
      if (!techClientDay[tech][client]) techClientDay[tech][client] = 0;
      techClientDay[tech][client] += ms;

      if (!techClientWeek[tech]) techClientWeek[tech] = {};
      if (!techClientWeek[tech][client]) techClientWeek[tech][client] = 0;
      techClientWeek[tech][client] += ms;

    }

   if (start >= weekStart) {
  summary.push({
    tech,
    client,
    status: log.status,
    date: dateKey,
    start: formatESTTime(log.startTime),
    end: formatESTTime(log.endTime),
    duration: getDuration(log.startTime, log.endTime),
  });
}

  });

  return { summary, clientDayTotals, clientWeekTotals, techClientDay, techClientWeek };

}


function getTechTotals(logs, startDate, endDate) {
  const parsedStart = new Date(startDate);
const parsedEnd = new Date(endDate);

const startRange = isNaN(parsedStart) ? new Date(0) : parsedStart;
const endRange = isNaN(parsedEnd) ? new Date() : parsedEnd;

  const summary = {};

  TECHS.forEach(tech => {
    summary[tech] = { day: 0, week: 0 };
  });

  logs.forEach(log => {
    if (!log.startTime || !log.endTime) return;
    if (BREAK_STATUSES.includes(log.status)) return;

    const start = new Date(log.startTime);
    const end = new Date(log.endTime);
    if (isNaN(start) || isNaN(end)) return;

    const ms = end - start;
    if (ms <= 0) return;

    const tech = log.tech;
    if (!summary[tech]) summary[tech] = { day: 0, week: 0 };

    summary[tech].week += ms;

  });

  return summary;
}

export default function App() {
  const [tech, setTech] = useState(localStorage.getItem("selectedTech") || "");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("isAdmin") === "true");
  const [pin, setPin] = useState("");
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [overrideTech, setOverrideTech] = useState("");
  const [filter, setFilter] = useState("active");
  const [confirmSecond, setConfirmSecond] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [showMissedForm, setShowMissedForm] = useState(false);
  const [disableTimeouts, setDisableTimeouts] = useState(localStorage.getItem("disableTimeouts") === "true");
  const [missedEntry, setMissedEntry] = useState({
  tech: "",
  status: "",
  client: "",
  startTime: "",
  endTime: ""
});

  const selectedTech = isAdmin && overrideTech ? overrideTech : tech;

  const fetchLogs = async () => {
  const now = new Date();
  const { data } = await supabase.from("status_logs").select("*").order("startTime", { ascending: false });

  const expiredIds = [];

  for (const log of data) {
    if (!log.endTime) {
      const start = new Date(log.startTime);
      const hoursOpen = (now - start) / (1000 * 60 * 60);
      const maxHours = log.status === "Working ticket for:" ? 2 : 8;

      if (hoursOpen >= maxHours) {
        await supabase.from("status_logs").update({ endTime: now.toISOString() }).eq("id", log.id);
        expiredIds.push(log.id);
      }
    }
  }

  const { data: refreshed } = await supabase.from("status_logs").select("*").order("startTime", { ascending: false });

  const withAutoExpireFlags = refreshed.map(l => ({
    ...l,
    _autoExpired: expiredIds.includes(l.id)
  }));

  setLogs(withAutoExpireFlags);
};


  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
  if (disableTimeouts) return; // ✅ Skip expiration logic if toggled off

  const interval = setInterval(async () => {
    const { data } = await supabase.from("status_logs").select("*").eq("endTime", null);
    const now = new Date();

    for (let log of data) {
      const start = new Date(log.startTime);
      const maxMs = log.status === "Working ticket for:" ? 2 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
      if (now - start > maxMs) {
        await supabase.from("status_logs").update({ endTime: now.toISOString() }).eq("id", log.id);
      }
    }
  }, 60000); // every 60 seconds

  return () => clearInterval(interval);
}, [disableTimeouts]);

  const activeLogs = logs.filter(log => !log.endTime);
  const completedLogs = logs.filter(log => log.endTime);
  const idleTechs = TECHS.filter(t => !activeLogs.find(log => log.tech === t));

  const handleStart = async () => {
    const hasOpen = logs.some(l => l.tech === selectedTech && !l.endTime);
    if (hasOpen && !confirmSecond) return setConfirmSecond(true);

    const newEntry = {
      tech: selectedTech,
      status,
      client: CLIENT_REQUIRED_STATUSES.includes(status) ? client : "",
      startTime: new Date().toISOString(),
      endTime: null
    };
    await supabase.from("status_logs").insert([newEntry]);

    setConfirmSecond(false);
    setLogs(prev => [newEntry, ...prev]);
    setTimeout(fetchLogs, 500);
  };

  const handleDone = async (id) => {
    await supabase.from("status_logs").update({ endTime: new Date().toISOString() }).eq("id", id);
    fetchLogs();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this entry?")) {
      await supabase.from("status_logs").delete().eq("id", id);
      fetchLogs();
    }
  };
const saveEdit = async () => {
  if (!editingLog || !editingLog.id) return;

  await supabase
    .from("status_logs")
    .update({
      startTime: editingLog.startTime,
      endTime: editingLog.endTime,
    })
    .eq("id", editingLog.id);

  setEditingLog(null);
  fetchLogs(); // refresh logs
};
const handleExportWeekly = () => {
  const today = new Date();
const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
weekStart.setHours(0, 0, 0, 0);

const filteredStart = reportStart || weekStart.toISOString().slice(0, 10);
const filteredEnd = reportEnd || new Date().toISOString().slice(0, 10);

const { summary, clientDayTotals, clientWeekTotals, techClientDay } = getWeeklyClientBreakdown(logs, filteredStart, filteredEnd);
const totals = getTechTotals(logs, filteredStart, filteredEnd);

 const csv = [
  // Section 1: Activity Logs
  ["Tech", "Status", "Client", "Date", "Start", "End", "Duration"],
  ...summary.map(x => [x.tech, x.status, x.client, x.date, x.start, x.end, x.duration]),

  [""],
  ["Tech", "Total Time Today", "Total Time This Week"],
  ...TECHS.map(t => {
    const d = totals[t] || { day: 0, week: 0 };
    const day = getDuration(0, d.day);
    const week = getDuration(0, d.week);
    return [t, day, week];
  }),

  [""],
  ["Client", "Total Time Today", "Total Time This Week"],
...Array.from(new Set([
  ...Object.keys(clientDayTotals),
  ...Object.keys(clientWeekTotals)
])).map(client => {
  const day = getDuration(0, clientDayTotals[client] || 0);
  const week = getDuration(0, clientWeekTotals[client] || 0);
  return [client, day, week];
}),


  [""],
 ["Tech", "Client", "Time Today", "Time This Week"],
...TECHS.flatMap(tech => {
  return CLIENTS.map(client => {
    let dayMs = 0;
    let weekMs = 0;

    logs.forEach(l => {
      if (l.tech !== tech || l.client !== client || !l.endTime) return;

      const start = new Date(l.startTime);
      const end = new Date(l.endTime);
      const delta = end - start;
      if (isNaN(start) || isNaN(end) || delta <= 0) return;

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      if (start >= weekStart) weekMs += delta;
      if (start >= dayStart) dayMs += delta;
    });

    if (dayMs > 0 || weekMs > 0) {
      return [tech, client, getDuration(0, dayMs), getDuration(0, weekMs)];
    }
    return null;
  }).filter(Boolean); // << This line removes the nulls
}),



].map(r => r.join(",")).join("\n");

const blob = new Blob([csv], { type: "text/csv" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "weekly_client_report.csv";
a.click();
URL.revokeObjectURL(url);

};


  const techTotals = getTechTotals(logs);

  const handlePinEntry = (value) => {
    setPin(value);
    if (value === "1337") {
      setIsAdmin(true);
      localStorage.setItem("isAdmin", "true");
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PopQuiz MSP Status Tracker</h1>
      {!tech ? (
        <div>
          <label>Select Tech:</label>
          <select onChange={(e) => setTech(e.target.value)} className="ml-2">
            <option value="">-- Select --</option>
            {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      ) : (
        <>
          {MANAGERS.includes(tech) && !isAdmin ? (
            <div>
              <label>Enter Admin PIN:</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => handlePinEntry(e.target.value)}
                className="ml-2 border px-2"
              />
            </div>
          ) : (
            <>
             {isAdmin && (
              <div>
                <select value={overrideTech} onChange={(e) => setOverrideTech(e.target.value)}>
                <option value="">Self</option>
              {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <button
              className="ml-2 bg-purple-600 text-white px-3 py-1 rounded"
                onClick={() => setShowMissedForm(true)}
                      >
      Add Missed Time
    </button>
  </div>
              )}
   
              <div className="my-2">
  <label className="mr-2">
    <input
      type="checkbox"
      checked={disableTimeouts}
      onChange={(e) => {
        setDisableTimeouts(e.target.checked);
        localStorage.setItem("disableTimeouts", e.target.checked.toString());
      }}
    />
    Disable Auto Timeout 
  </label>
</div>


              {showMissedForm && (
  <div className="border p-4 mt-4 bg-gray-100 rounded">
    <h3 className="text-lg font-semibold mb-2">Add Missed Time</h3>

    <select
      value={missedEntry.tech}
      onChange={(e) => setMissedEntry({ ...missedEntry, tech: e.target.value })}
      className="block mb-2 border px-2 py-1"
    >
      <option value="">Select Tech</option>
      {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
    </select>

    <select
      value={missedEntry.status}
      onChange={(e) => setMissedEntry({ ...missedEntry, status: e.target.value })}
      className="block mb-2 border px-2 py-1"
    >
      <option value="">Select Status</option>
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>

    <select
      value={missedEntry.client}
      onChange={(e) => setMissedEntry({ ...missedEntry, client: e.target.value })}
      className="block mb-2 border px-2 py-1"
    >
      <option value="">Select Client</option>
      {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
    </select>

    <label className="block text-sm font-medium">Start Time</label>
    <input
      type="datetime-local"
      value={missedEntry.startTime}
      onChange={(e) => setMissedEntry({ ...missedEntry, startTime: e.target.value })}
      className="block mb-2 border px-2 py-1"
    />

    <label className="block text-sm font-medium">End Time</label>
    <input
      type="datetime-local"
      value={missedEntry.endTime}
      onChange={(e) => setMissedEntry({ ...missedEntry, endTime: e.target.value })}
      className="block mb-2 border px-2 py-1"
    />

    <button
      onClick={async () => {
        await supabase.from("status_logs").insert([{
          tech: missedEntry.tech,
          status: missedEntry.status,
          client: missedEntry.client,
          startTime: new Date(missedEntry.startTime).toISOString(),
          endTime: new Date(missedEntry.endTime).toISOString()
        }]);
        setShowMissedForm(false);
        fetchLogs();
      }}
      className="bg-green-600 text-white px-4 py-2 rounded mr-2"
    >
      Submit
    </button>

    <button
      onClick={() => setShowMissedForm(false)}
      className="bg-gray-400 text-white px-4 py-2 rounded"
    >
      Cancel
    </button>
  </div>
)}


              <div className="my-2">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="mr-2">
                  <option value="">Select Status</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {CLIENT_REQUIRED_STATUSES.includes(status) && (
                  <select value={client} onChange={(e) => setClient(e.target.value)}>
                    <option value="">Select Client</option>
                    {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <button onClick={handleStart} className="ml-2 bg-blue-600 text-white px-2 py-1 rounded">Start</button>
                <button onClick={() => {
                  localStorage.removeItem("selectedTech");
                  localStorage.removeItem("isAdmin");
                  setTech("");
                  setIsAdmin(false);
                }} className="ml-2 text-sm">Logout</button>
              </div>
              {confirmSecond && (
                <div className="bg-yellow-100 p-2 rounded mb-2">
                  You already have an active task. Start another?
                  <button onClick={handleStart} className="ml-2 bg-red-600 text-white px-2 py-1 rounded">Yes</button>
                </div>
              )}
              <div className="mb-4">
                <button onClick={() => setFilter("active")} className="mr-2">Active</button>
                <button onClick={() => setFilter("idle")} className="mr-2">Idle</button>
                <button onClick={() => setFilter("completed")} className="mr-2">Completed</button>
              </div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Current Activity</h2>
                {filter === "idle" && idleTechs.map(t => <div key={t}>{t} is idle</div>)}
                {filter === "active" && activeLogs.map(log => (
                  <div key={log.id} className="border p-2 my-2">
                    <strong>{log.tech}</strong> – {log.status} {log.client && `(${log.client})`}<br />
                    Started: {formatESTTime(log.startTime)}<br />
                    {(isAdmin || log.tech === tech) && (
                      <>
                        <button onClick={() => handleDone(log.id)} className="mt-1 bg-green-600 text-white px-2 py-1 rounded mr-2">Mark Done</button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(log.id)} className="mt-1 bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {filter === "completed" && completedLogs.map(log => (
  <div key={log.id} className="text-sm text-gray-700 mb-2">
    ✅ {log._autoExpired && <span title="Auto-expired" className="ml-1 text-red-500">⏰</span>} <strong>{log.tech}</strong> – {log.status} {log.client && `(${log.client})`}
    {formatESTTime(log.startTime)} - {formatESTTime(log.endTime)} ({getDuration(log.startTime, log.endTime)})
    {isAdmin && (
      <>
        <button
          onClick={() => setEditingLog({ ...log })}
          className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(log.id)}
          className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
        >
          Delete
        </button>
      </>
    )}

    {editingLog?.id === log.id && (
      <div className="mt-2">
        <label className="block text-sm font-medium">New Start Time:</label>
        <input
        type="datetime-local"
        value={new Date(editingLog.startTime).toISOString().slice(0, 16)}
        onChange={(e) =>
          setEditingLog({ ...editingLog, startTime: new Date(e.target.value).toISOString() })
        }
        className="border rounded px-2 py-1 mr-2 mb-2"
      />

        <label className="block text-sm font-medium">New End Time:</label>
        <input
          type="datetime-local"
          value={new Date(editingLog.endTime).toISOString().slice(0, 16)}
          onChange={(e) =>
            setEditingLog({ ...editingLog, endTime: new Date(e.target.value).toISOString() })
          }
          className="border rounded px-2 py-1 mr-2"
        />
        <button
          onClick={saveEdit}
          className="bg-green-600 text-white px-3 py-1 rounded text-xs"
        >
          Save
        </button>
        <button
          onClick={() => setEditingLog(null)}
          className="ml-2 bg-gray-500 text-white px-3 py-1 rounded text-xs"
        >
          Cancel
        </button>
      </div>
    )}
  </div>
))}

              </div>
              <div className="mb-6">
                <h2 className="text-lg font-bold">Daily and Weekly Totals</h2>
                <ul>
                  {Object.entries(techTotals).map(([tech, t]) => (
                    <li key={tech}><strong>{tech}</strong> – Today: {getDuration(0, t.day)} | This Week: {getDuration(0, t.week)}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-10">
                <h2 className="text-lg font-bold">Weekly Client Report</h2>
                <button onClick={handleExportWeekly} className="bg-gray-800 text-white px-4 py-2 rounded">Download Weekly Report</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
