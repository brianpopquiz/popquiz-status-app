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
  "St Doms", "Ferreira Law", "Pollack Law", "Email Support", "Break Fix",
  "Residential Member", "Residential", "M&T", "Make and Take", "Your Approved Contractors", "Winderco", "Groom'n Room"
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
  const ms = getDurationMs(start, end);
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}

function getWeeklyClientBreakdown(logs) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const summary = [];
  const clientDayTotals = {};
  const clientWeekTotals = {};
  const techClientDay = {};

  logs.forEach(log => {
    if (!log.endTime || BREAK_STATUSES.includes(log.status)) return;

    const start = new Date(log.startTime);
    const end = new Date(log.endTime);
    const ms = end - start;
    const client = log.client || "N/A";
    const tech = log.tech;
    const dateKey = start.toLocaleDateString("en-US");

    if (!clientWeekTotals[client]) clientWeekTotals[client] = 0;
    clientWeekTotals[client] += ms;

    if (start >= new Date(new Date().setHours(0,0,0,0))) {
      if (!clientDayTotals[client]) clientDayTotals[client] = 0;
      clientDayTotals[client] += ms;

      if (!techClientDay[tech]) techClientDay[tech] = {};
      if (!techClientDay[tech][client]) techClientDay[tech][client] = 0;
      techClientDay[tech][client] += ms;
    }

    summary.push({
      tech,
      task: log.status, // 👈 This is the fix
      client,
      date: dateKey,
      start: formatESTTime(log.startTime),
      end: formatESTTime(log.endTime),
      duration: getDuration(log.startTime, log.endTime),
    });
  });

  return { summary, clientDayTotals, clientWeekTotals, techClientDay };
}


function getTechTotals(logs) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const summary = {};

  logs.forEach(log => {
    if (!log.endTime || BREAK_STATUSES.includes(log.status)) return;
    const start = new Date(log.startTime);
    const end = new Date(log.endTime);
    const ms = end - start;
    if (!summary[log.tech]) summary[log.tech] = { day: 0, week: 0 };
    if (start >= dayStart) summary[log.tech].day += ms;
    if (start >= weekStart) summary[log.tech].week += ms;
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

  const selectedTech = isAdmin && overrideTech ? overrideTech : tech;

  const fetchLogs = async () => {
    const { data } = await supabase.from("status_logs").select("*").order("startTime", { ascending: false });
    setLogs(data);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleExportWeekly = () => {
    const summary = getWeeklyClientBreakdown(logs);
    const totals = getTechTotals(logs);
    const csv = [
  ["Tech", "Task", "Client", "Date", "Start", "End", "Duration"],
  ...summary.map(x => [x.tech, x.task, x.client, x.date, x.start, x.end, x.duration]),
      [""],
      ["Tech", "Total Time Today", "Total Time This Week"],
      ...Object.entries(totals).map(([t, d]) => {
        const day = getDuration(0, d.day);
        const week = getDuration(0, d.week);
        return [t, day, week];
      })
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
                  <div key={log.id} className="text-sm text-gray-700">
                    ✅ {log.tech} – {log.status} {log.client && `(${log.client})`} | {formatESTTime(log.startTime)} - {formatESTTime(log.endTime)} ({getDuration(log.startTime, log.endTime)})
                    {isAdmin && (
                      <button onClick={() => handleDelete(log.id)} className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs">Delete</button>
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
