// PopQuiz MSP Status Tracker - Web App
// Connected to Supabase backend

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whgpzllhmnitibslaick.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ3B6bGxobW5pdGlic2xhaWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTY4MjAsImV4cCI6MjA2MDQ3MjgyMH0.8mXISi_mCZdeU4ZM6n-G7XjigpetwLdc2Ms5yBRuqgo";
const supabase = createClient(supabaseUrl, supabaseKey);

const TECHS = ["Alice", "Bob", "Charlie", "Dana", "Eli"];
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
    };
    await supabase.from("status_logs").insert([entry]);
    fetchLogs();
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from("status_logs").select("*").order("startTime", { ascending: false });
    setLogs(data);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PopQuiz MSP Status Tracker</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select value={tech} onValueChange={setTech} placeholder="Select Tech">
          {TECHS.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </Select>
        <Select value={status} onValueChange={setStatus} placeholder="Select Status">
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </Select>
        {status === "Working ticket for:" && (
          <Select value={client} onValueChange={setClient} placeholder="Select Client">
            {CLIENTS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </Select>
        )}
        <Button className="col-span-1 md:col-span-3" onClick={handleStart}>Start</Button>
      </div>

      <h2 className="text-xl font-semibold mb-2">Current Activity</h2>
      <div className="grid gap-4">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="p-4">
              <p className="font-semibold">{log.tech}</p>
              <p>Status: {log.status} {log.client && `(${log.client})`}</p>
              <p>Started: {new Date(log.startTime).toLocaleTimeString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
