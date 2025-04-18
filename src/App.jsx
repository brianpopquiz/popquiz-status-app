// PopQuiz MSP Status Tracker - Web App
// Connected to Supabase backend

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whgpzllhmnitibslaick.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ3B6bGxobW5pdGlic2xhaWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTY4MjAsImV4cCI6MjA2MDQ3MjgyMH0.8mXISi_mCZdeU4ZM6n-G7XjigpetwLdc2Ms5yBRuqgo";
const supabase = createClient(supabaseUrl, supabaseKey);

const TECHS = ["Brian", "Walter", "Rich", "Silouan", "Trevor", "Novick IT"];
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

export default function App() {
  const [tech, setTech] = useState("");
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [logs, setLogs] = useState([]);

  const handleStart = async () => {
    if (!tech || !status) {
      alert("Please select both tech and status.");
      return;
    }

    const entry = {
      tech,
      status,
      client: status === "Working ticket for:" ? client : "",
      startTime: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from("status_logs").insert([entry]);
      if (error) {
        console.error("Supabase insert error:", error.message);
        alert("Error saving status: " + error.message);
      } else {
        console.log("Status logged:", data);
        fetchLogs();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("status_logs")
      .select("*")
      .order("startTime", { ascending: false });
    setLogs(data);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6">PopQuiz MSP Status Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <select
          className="border p-2 rounded"
          value={tech}
          onChange={(e) => setTech(e.target.value)}
        >
          <option value="">Select Tech</option>
          {TECHS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Select Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {status === "Working ticket for:" && (
          <select
            className="border p-2 rounded"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">Select Client</option>
            {CLIENTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-8 hover:bg-blue-700 transition"
        onClick={handleStart}
      >
        Start
      </button>

      <h2 className="text-xl font-semibold mb-2">Current Activity</h2>
      <div className="grid gap-4">
        {logs.map((log) => (
          <div key={log.id} className="border rounded p-4 shadow">
            <p className="font-bold">{log.tech}</p>
            <p>Status: {log.status} {log.client && `(${log.client})`}</p>
            <p>Started: {new Date(log.startTime).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
