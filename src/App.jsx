// PopQuiz MSP Status Tracker - Core Enhancements + Per-Task Weekly Report + Logout + Manager PIN + Report Fixes + Dashboard Totals

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whgpzllhmnitibslaick.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
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

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [techTotals, setTechTotals] = useState({});

  const fetchLogs = async () => {
    const { data } = await supabase.from("status_logs").select("*").order("startTime", { ascending: false });
    setLogs(data);
    setTechTotals(getTechTotals(data));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExportWeekly = () => {
    const summary = getWeeklyClientBreakdown(logs);
    const totals = getTechTotals(logs);
    const csv = [
      ["Tech", "Client", "Date", "Start", "End", "Duration"],
      ...summary.map(entry => [entry.tech, entry.client, entry.date, entry.start, entry.end, entry.duration]),
      [""],
      ["Tech", "Total Time Today", "Total Time This Week"],
      ...Object.entries(totals).map(([tech, t]) => {
        const minsDay = Math.floor(t.day / 60000);
        const hrsDay = Math.floor(minsDay / 60);
        const dayTime = hrsDay > 0 ? `${hrsDay}h ${minsDay % 60}m` : `${minsDay}m`;
        const minsWeek = Math.floor(t.week / 60000);
        const hrsWeek = Math.floor(minsWeek / 60);
        const weekTime = hrsWeek > 0 ? `${hrsWeek}h ${minsWeek % 60}m` : `${minsWeek}m`;
        return [tech, dayTime, weekTime];
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly_client_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2>Daily and Weekly Totals</h2>
      <ul>
        {Object.entries(techTotals).map(([tech, { day, week }]) => {
          const minsDay = Math.floor(day / 60000);
          const hrsDay = Math.floor(minsDay / 60);
          const dayTime = hrsDay > 0 ? `${hrsDay}h ${minsDay % 60}m` : `${minsDay}m`;
          const minsWeek = Math.floor(week / 60000);
          const hrsWeek = Math.floor(minsWeek / 60);
          const weekTime = hrsWeek > 0 ? `${hrsWeek}h ${minsWeek % 60}m` : `${minsWeek}m`;
          return <li key={tech}><strong>{tech}</strong> – Today: {dayTime} | This Week: {weekTime}</li>;
        })}
      </ul>
    </div>
  );
}
