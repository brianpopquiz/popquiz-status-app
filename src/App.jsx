// PopQuiz MSP Status Tracker - Core Enhancements + Per-Task Weekly Report

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
const BREAK_STATUSES = ["On break"];
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
    if (!log.endTime) return;
    const logDate = new Date(log.startTime);
    if (logDate < weekStart) return;
    if (!log.client) return;

    const dateString = logDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
    const timeSpent = getDuration(log.startTime, log.endTime);
    summary.push({ tech: log.tech, client: log.client, date: dateString, duration: timeSpent });
  });

  return summary;
}

export default function Dashboard() {
  const [tech, setTech] = useState(localStorage.getItem("selectedTech") || "");
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("active");
  const [showConfirm, setShowConfirm] = useState(false);
  const [overrideTech, setOverrideTech] = useState("");

  const fetchLogs = async () => {
    const { data } = await supabase.from("status_logs").select("*").order("startTime", { ascending: false });
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expired = data.filter(log => log.endTime && log.endTime < cutoff);
    if (expired.length) {
      const ids = expired.map(x => x.id);
      await supabase.from("status_logs").delete().in("id", ids);
    }
    setLogs(data.filter(log => !expired.some(e => e.id === log.id)));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const isManager = MANAGERS.includes(tech);
  const selectedTech = isManager && overrideTech ? overrideTech : tech;

  const handleStart = async () => {
    const hasOpen = logs.some(log => log.tech === selectedTech && !log.endTime);
    if (hasOpen && !showConfirm) {
      setShowConfirm(true);
      return;
    }
    const entry = {
      tech: selectedTech,
      status,
      client: status === "Working ticket for:" ? client : "",
      startTime: new Date().toISOString(),
      endTime: null,
    };
    await supabase.from("status_logs").insert([entry]);
    setShowConfirm(false);
    fetchLogs();
  };

  const handleDone = async (id) => {
    await supabase.from("status_logs").update({ endTime: new Date().toISOString() }).eq("id", id);
    fetchLogs();
  };

  const handleExportWeekly = () => {
    const summary = getWeeklyClientBreakdown(logs);
    const csv = [
      ["Tech", "Client", "Date", "Duration"],
      ...summary.map(entry => [entry.tech, entry.client, entry.date, entry.duration])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly_client_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeLogs = logs.filter(log => !log.endTime);
  const idleTechs = TECHS.filter(t => !activeLogs.some(log => log.tech === t));
  const completedLogs = logs.filter(log => log.endTime);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PopQuiz MSP Status Tracker</h1>

      {!tech ? (
        <div className="mb-6">
          <label className="block font-semibold mb-2">Select Your Name to Sign In:</label>
          <select className="border p-2 rounded" onChange={(e) => {
            setTech(e.target.value);
            localStorage.setItem("selectedTech", e.target.value);
          }}>
            <option value="">Select Tech</option>
            {TECHS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      ) : (
        <>
          {isManager && (
            <select className="mb-2 border p-2 rounded" value={overrideTech} onChange={(e) => setOverrideTech(e.target.value)}>
              <option value="">Self</option>
              {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <select className="border p-2 rounded" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Select Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {status === "Working ticket for:" && (
              <select className="border p-2 rounded" value={client} onChange={(e) => setClient(e.target.value)}>
                <option value="">Select Client</option>
                {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button onClick={handleStart} disabled={!selectedTech} className="bg-blue-600 text-white px-4 py-2 rounded">
              Start
            </button>
          </div>

          <div className="mb-4">
            <button className={`mr-2 px-3 py-1 border rounded ${filter === "active" ? "bg-gray-300" : ""}`} onClick={() => setFilter("active")}>Active</button>
            <button className={`mr-2 px-3 py-1 border rounded ${filter === "idle" ? "bg-gray-300" : ""}`} onClick={() => setFilter("idle")}>Idle</button>
            <button className={`px-3 py-1 border rounded ${filter === "completed" ? "bg-gray-300" : ""}`} onClick={() => setFilter("completed")}>Completed</button>
          </div>
        </>
      )}

      {showConfirm && (
        <div className="bg-yellow-100 p-4 mb-4 rounded">
          <p>You already have an active task. Are you sure you want to start another?</p>
          <button onClick={() => handleStart()} className="mt-2 bg-red-600 text-white px-3 py-1 rounded">Yes, Start Anyway</button>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Current Activity</h2>
        {filter === "active" && activeLogs.map(log => (
          <div key={log.id} className="mb-4 border p-3 rounded bg-gray-100">
            <p><strong>{log.tech}</strong></p>
            <p>Status: {log.status}{log.client && ` (${log.client})`}</p>
            <p>Started: {formatESTTime(log.startTime)}</p>
            {isManager && <button onClick={() => handleDone(log.id)} className="mt-2 bg-green-700 text-white px-2 py-1 rounded">Mark Done</button>}
          </div>
        ))}

        {filter === "idle" && idleTechs.map(name => (
          <div key={name} className="mb-2 text-gray-700">{name} — <span className="italic text-sm">Idle</span></div>
        ))}

        {filter === "completed" && completedLogs.map(log => (
          <div key={log.id} className="mb-4 border p-3 rounded">
            <p><strong>{log.tech}</strong></p>
            <p>Status: {log.status}{log.client && ` (${log.client})`}</p>
            <p>Started: {formatESTTime(log.startTime)}</p>
            <p>Ended: {formatESTTime(log.endTime)}</p>
            <p>Total Time: {getDuration(log.startTime, log.endTime)}</p>
          </div>
        ))}
      </div>

      {isManager && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">Weekly Client Report</h2>
          <button onClick={handleExportWeekly} className="bg-gray-800 text-white px-4 py-2 rounded">
            Download Weekly Report
          </button>
        </div>
      )}
    </div>
  );
}
