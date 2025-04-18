// PopQuiz MSP Status Tracker - Full App (Enhanced + Admin Edit Support)

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

function getWeeklyClientBreakdown(logs) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const summary = [];

  logs.forEach(log => {
    if (!log.endTime || BREAK_STATUSES.includes(log.status)) return;
    const logDate = new Date(log.startTime);
    if (logDate < weekStart) return;
    const timeSpent = getDuration(log.startTime, log.endTime);
    summary.push({
      tech: log.tech,
      client: log.client || "N/A",
      date: logDate.toLocaleDateString("en-US"),
      start: formatESTTime(log.startTime),
      end: formatESTTime(log.endTime),
      duration: timeSpent,
    });
  });

  return summary;
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

  const techTotals = getTechTotals(logs);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PopQuiz MSP Status Tracker</h1>

      {/* Existing UI omitted for brevity */}

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
    </div>
  );
}
