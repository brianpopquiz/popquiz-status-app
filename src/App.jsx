// PopQuiz MSP Status Tracker - Full App with Admin Fix and UI Restore

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whgpzllhmnitibslaick.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ3B6bGxobW5pdGlic2xhaWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTY4MjAsImV4cCI6MjA2MDQ3MjgyMH0.8mXISi_mCZdeU4ZM6n-G7XjigpetwLdc2Ms5yBRuqgo";
const supabase = createClient(supabaseUrl, supabaseKey);

const TECHS = ["Brian", "Walter", "Rich", "Silouan", "Trevor", "Novick IT"];
const ADMIN_ACCOUNT = "Admin";
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
  "Out for the day"
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
  "Residential Member", "Residential"
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
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("admin") === "true");
  const [pin, setPin] = useState("");
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [overrideTech, setOverrideTech] = useState("");
  const [filter, setFilter] = useState("active");
  const [confirmSecond, setConfirmSecond] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

    await supabase.from("status_logs").insert([{
      tech: selectedTech,
      status,
      client: CLIENT_REQUIRED_STATUSES.includes(status) ? client : "",
      startTime: new Date().toISOString(),
      endTime: null
    }]);
    setConfirmSecond(false);
    fetchLogs();
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

  const handleEdit = async (id, field, value) => {
    await supabase.from("status_logs").update({ [field]: value }).eq("id", id);
    fetchLogs();
  };

  const handleLogin = () => {
    if (tech === ADMIN_ACCOUNT && pin === "1337") {
      setIsAdmin(true);
      localStorage.setItem("admin", "true");
      setTech(ADMIN_ACCOUNT);
    } else if (tech && tech !== ADMIN_ACCOUNT) {
      localStorage.setItem("selectedTech", tech);
      setTech(tech);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("selectedTech");
    setIsAdmin(false);
    setTech("");
  };

  const techTotals = getTechTotals(logs);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PopQuiz MSP Status Tracker</h1>

      {!tech && (
        <div className="mb-4">
          <select onChange={e => setTech(e.target.value)} className="border p-2 mr-2">
            <option value="">Select Name</option>
            <option value={ADMIN_ACCOUNT}>Admin</option>
            {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {tech === ADMIN_ACCOUNT && (
            <input type="password" placeholder="PIN" className="border p-2 mr-2" onChange={e => setPin(e.target.value)} />
          )}
          <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
        </div>
      )}

      {tech && (
        <>
          <button onClick={handleLogout} className="bg-gray-600 text-white px-3 py-1 rounded mb-4">Logout</button>

          {isAdmin && (
            <select value={overrideTech} onChange={e => setOverrideTech(e.target.value)} className="border p-2 mr-2">
              <option value="">Self</option>
              {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          <select value={status} onChange={e => setStatus(e.target.value)} className="border p-2 mr-2">
            <option value="">Select Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {CLIENT_REQUIRED_STATUSES.includes(status) && (
            <select value={client} onChange={e => setClient(e.target.value)} className="border p-2 mr-2">
              <option value="">Select Client</option>
              {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          <button onClick={handleStart} className="bg-green-600 text-white px-4 py-2 rounded">Start</button>

          {confirmSecond && (
            <div className="bg-yellow-100 p-2 my-2 rounded">
              You already have an active task. Start another?
              <button onClick={handleStart} className="ml-2 bg-red-600 text-white px-2 py-1 rounded">Yes, Start Anyway</button>
            </div>
          )}

          <div className="my-4">
            <button onClick={() => setFilter("active")} className="mr-2 px-3 py-1 rounded border">Active</button>
            <button onClick={() => setFilter("idle")} className="mr-2 px-3 py-1 rounded border">Idle</button>
            <button onClick={() => setFilter("completed")} className="px-3 py-1 rounded border">Completed</button>
          </div>

          {filter === "active" && activeLogs.map(log => (
            <div key={log.id} className="mb-2">
              <strong>{log.tech}</strong> – {log.status} {log.client && `(${log.client})`}<br />
              Started: {formatESTTime(log.startTime)}
              {isAdmin && <button onClick={() => handleDone(log.id)} className="ml-2 bg-blue-500 text-white px-2 py-0.5 rounded">Mark Done</button>}
            </div>
          ))}

          {filter === "idle" && idleTechs.map(t => (
            <div key={t} className="text-gray-600">{t} – No active task</div>
          ))}

          {filter === "completed" && completedLogs.map(log => (
            <div key={log.id} className="text-sm text-gray-700">
              ✅ {log.tech} – {log.status} {log.client && `(${log.client})`} | {formatESTTime(log.startTime)} - {formatESTTime(log.endTime)} ({getDuration(log.startTime, log.endTime)})
              {isAdmin && (
                <>
                  <button onClick={() => handleDelete(log.id)} className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs">Delete</button>
                  <button onClick={() => setEditingId(log.id)} className="ml-1 bg-yellow-500 text-white px-2 py-0.5 rounded text-xs">Edit</button>
                  {editingId === log.id && (
                    <div className="mt-1">
                      <input type="text" placeholder="New status" className="border p-1" onBlur={(e) => handleEdit(log.id, 'status', e.target.value)} />
                      <input type="text" placeholder="New client" className="border p-1 ml-2" onBlur={(e) => handleEdit(log.id, 'client', e.target.value)} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          <div className="mt-8">
            <h2 className="text-lg font-bold mb-2">Daily and Weekly Totals</h2>
            <ul>
              {Object.entries(techTotals).map(([t, { day, week }]) => (
                <li key={t}><strong>{t}</strong> – Today: {getDuration(0, day)} | This Week: {getDuration(0, week)}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
