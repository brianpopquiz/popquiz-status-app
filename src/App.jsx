// PopQuiz MSP Status Tracker - Web App
// Connected to Supabase backend with start and done logging, auto-refresh, and manager view logic

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
  "On break",
  "In meeting",
  "Studying",
  "Making KB",
  "Onsite",
  "Out for the day",
];
const CLIENTS = [
  "Novick", "Fabio", "Sullivans", "Pro Storm", "Metal and Wood", "DDS",
  "Foglia", "Northeast Fence", "Steel Penny", "Super Impulse", "Pennypack",
  "St Doms", "Ferreira Law", "Pollack Law", "Email Support", "Break Fix",
  "Residential Member", "Residential"
];

export default function Dashboard() {
  const [tech, setTech] = useState("");
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [logs, setLogs] = useState([]);

  const handleStart = async () => {
    if (!tech || !status) return;
    const entry = {
      tech,
      status,
      client: status === "Working ticket for:" ? client : "",
      startTime: new Date().toISOString(),
      endTime: null,
    };
    await supabase.from("status_logs").insert([entry]);
    fetchLogs();
  };

  const handleDone = async (id) => {
    await supabase.from("status_logs").update({ endTime: new Date().toISOString() }).eq("id", id);
    fetchLogs();
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from("status_logs").select("*").order("startTime", { ascending: false });
    setLogs(data);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const isManager = MANAGERS.includes(tech);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PopQuiz MSP Status Tracker</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <select className="border p-2 rounded" value={tech} onChange={(e) => setTech(e.target.value)}>
          <option value="">Select Tech</option>
          {TECHS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
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
        <button className="col-span-1 md:col-span-3 bg-blue-600 text-white px-4 py-2 rounded" onClick={handleStart}>Start</button>
      </div>

      <h2 className="text-xl font-semibold mb-2">Current Activity</h2>
      <div className="grid gap-4">
        {logs.map((log) => (
          <div key={log.id} className="border p-4 rounded shadow">
            <p className="font-semibold">{log.tech}</p>
            <p>Status: {log.status} {log.client && `(${log.client})`}</p>
            <p>Started: {new Date(log.startTime).toLocaleTimeString()}</p>
            {log.endTime && <p className="text-green-700">Done: {new Date(log.endTime).toLocaleTimeString()}</p>}
            {!log.endTime && log.tech === tech && (
              <button onClick={() => handleDone(log.id)} className="mt-2 bg-green-600 text-white px-3 py-1 rounded">Done</button>
            )}
          </div>
        ))}
      </div>

      {isManager && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-2">Manager View</h2>
          <p className="text-gray-600">You can see all entries and who is active or idle.</p>
        </div>
      )}
    </div>
  );
}
