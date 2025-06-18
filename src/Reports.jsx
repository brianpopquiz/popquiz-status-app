import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://whgpzllhmnitibslaick.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ3B6bGxobW5pdGlic2xhaWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTY4MjAsImV4cCI6MjA2MDQ3MjgyMH0.8mXISi_mCZdeU4ZM6n-G7XjigpetwLdc2Ms5yBRuqgo");

function getDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  if (isNaN(ms) || ms <= 0) return "0m";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}

export default function Reports() {
  const [logs, setLogs] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    supabase.from("status_logs").select("*").then(({ data }) => {
      setLogs(data || []);
    });
  }, []);

  const handleExport = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filtered = logs.filter(l => {
      const s = new Date(l.startTime);
      const e = new Date(l.endTime);
      return s >= start && e <= end && l.endTime;
    });

    const rows = [
      ["Tech", "Status", "Client", "Start", "End", "Duration"],
      ...filtered.map(l => [
        l.tech,
        l.status,
        l.client || "",
        new Date(l.startTime).toLocaleString(),
        new Date(l.endTime).toLocaleString(),
        getDuration(l.startTime, l.endTime)
      ])
    ];

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Filtered Report</h1>

      <div className="mb-4 space-x-4">
        <label>Start Date:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label>End Date:</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <button
        onClick={handleExport}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Download Report
      </button>
    </div>
  );
}
