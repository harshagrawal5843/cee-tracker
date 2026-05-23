"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Navbar } from "@/components/Navbar";
import {
  readStudyTimerHistory,
  readStudyTimerState,
} from "@/lib/dailyChallenge";

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(secs).padStart(2, "0")}`;
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudyTimerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState({
    dateKey: null,
    todayTime: 0,
    elapsedTime: 0,
    isRunning: false,
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading) return;

    const loadTimerData = () => {
      setState(readStudyTimerState());
      setHistory(readStudyTimerHistory());
      setReady(true);
    };

    loadTimerData();

    const syncTimer = () => {
      setState(readStudyTimerState());
      setHistory(readStudyTimerHistory());
    };

    window.addEventListener("storage", syncTimer);
    window.addEventListener("study-timer-updated", syncTimer);

    return () => {
      window.removeEventListener("storage", syncTimer);
      window.removeEventListener("study-timer-updated", syncTimer);
    };
  }, [authLoading]);

  const totalHistorySeconds = useMemo(
    () => history.reduce((sum, entry) => sum + entry.seconds, 0),
    [history],
  );

  if (!ready || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="mb-3 text-4xl font-black text-gray-900 dark:text-white sm:text-5xl">
              Study Timer
            </h1>
            <p className="max-w-2xl text-gray-600 dark:text-gray-400">
              See today’s active session and the full daily study-time log
              across the week.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Today
              </p>
              <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">
                {formatTime(state.todayTime)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Session
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatTime(state.elapsedTime)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                History Days
              </p>
              <p className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {history.length}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total Logged
              </p>
              <p className="mt-2 text-3xl font-black text-orange-600 dark:text-orange-400">
                {formatTime(totalHistorySeconds)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Current Status
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {state.isRunning
                    ? "Timer is running"
                    : state.elapsedTime > 0
                      ? "Timer paused"
                      : "Timer stopped"}
                </p>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-sm font-bold ${state.isRunning ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
              >
                {state.isRunning ? "Active" : "Idle"}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Daily History
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Latest days first
              </p>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="text-4xl mb-3">⏱️</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No study time logged yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start the timer from the navbar or dashboard to build your
                  daily log.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((entry) => (
                  <div
                    key={entry.dateKey}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                          {entry.dateKey}
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                          {formatDateLabel(entry.dateKey)}
                        </h3>
                      </div>
                      <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                        {formatTime(entry.seconds)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
