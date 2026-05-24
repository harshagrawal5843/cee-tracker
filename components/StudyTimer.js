"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  getDailyDateKey,
  readStudyTimerState,
  syncStudyTimerDay,
  updateStudyTimerSnapshot,
  readStudyTimerHistoryMap,
  migrateAndSyncTimerData
} from "@/lib/dailyChallenge";
import { 
  writeStudyTimerStateRemote, 
  writeStudyTimerHistoryRemote 
} from "@/lib/storage";

export function StudyTimer() {
  const { user } = useAuth(); // Get user to sync to Firebase
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [todayTime, setTodayTime] = useState(0); 
  const [dateKey, setDateKey] = useState(getDailyDateKey());
  const [isClient, setIsClient] = useState(false);

  const syncCurrentDay = () => {
    const timerState = syncStudyTimerDay(getDailyDateKey());
    setDateKey(timerState.dateKey);
    setTodayTime(timerState.todayTime);
    setElapsedTime(timerState.elapsedTime);
    setIsRunning(timerState.isRunning);
  };

  // 1. Initialize timer & Trigger Migration
  useEffect(() => {
    setIsClient(true);
    syncCurrentDay();

    // Migrate past 2-3 days of local data to Firebase on load
    if (user?.uid) {
      migrateAndSyncTimerData(user.uid);
    }

    const syncTimer = () => {
      const timerState = readStudyTimerState();
      setDateKey(timerState.dateKey);
      setTodayTime(timerState.todayTime);
      setElapsedTime(timerState.elapsedTime);
      setIsRunning(timerState.isRunning);
    };

    window.addEventListener("storage", syncTimer);
    window.addEventListener("study-timer-updated", syncTimer);

    const rolloverInterval = setInterval(() => {
      const currentDateKey = getDailyDateKey();
      if (currentDateKey !== dateKey) {
        syncCurrentDay();
      }
    }, 30000);

    return () => {
      window.removeEventListener("storage", syncTimer);
      window.removeEventListener("study-timer-updated", syncTimer);
      clearInterval(rolloverInterval);
    };
  }, [dateKey, user?.uid]);

  // 2. Fast Local Interval (1 second ticks)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const currentDateKey = getDailyDateKey();

      if (currentDateKey !== dateKey) {
        syncCurrentDay();
        return;
      }

      setElapsedTime((prev) => {
        const newTime = prev + 1;
        setTodayTime((currentTodayTime) => {
          const newTodayTime = currentTodayTime + 1;
          updateStudyTimerSnapshot({
            dateKey,
            todayTime: newTodayTime,
            elapsedTime: newTime,
            isRunning: true,
          });
          return newTodayTime;
        });
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, dateKey]);

  // 3. Slow Remote Sync (every 30 seconds to save Firebase quota)
  useEffect(() => {
    if (!isRunning || !user?.uid) return;

    const remoteSyncInterval = setInterval(() => {
      const currentState = readStudyTimerState();
      const currentHistory = readStudyTimerHistoryMap();
      
      writeStudyTimerStateRemote(currentState, user.uid);
      writeStudyTimerHistoryRemote(currentHistory, user.uid);
    }, 30000);

    return () => clearInterval(remoteSyncInterval);
  }, [isRunning, user?.uid]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const forceRemoteSync = (stateData) => {
    if (!user?.uid) return;
    writeStudyTimerStateRemote(stateData, user.uid);
    writeStudyTimerHistoryRemote(readStudyTimerHistoryMap(), user.uid);
  };

  const toggleTimer = () => {
    const nextRunningState = !isRunning;
    setIsRunning(nextRunningState);
    
    const newState = {
      dateKey,
      todayTime,
      elapsedTime,
      isRunning: nextRunningState,
    };
    
    updateStudyTimerSnapshot(newState);
    forceRemoteSync(newState); // Push to Firebase immediately on pause/start
  };

  const resetSession = () => {
    const newState = {
      dateKey,
      todayTime,
      elapsedTime: 0,
      isRunning: false,
    };
    
    updateStudyTimerSnapshot(newState);
    setElapsedTime(0);
    setIsRunning(false);
    forceRemoteSync(newState); // Push to Firebase immediately on reset
  };

  if (!isClient) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-300 p-6 ${
        isRunning
          ? "border-green-400 dark:border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg shadow-green-200 dark:shadow-green-900/50"
          : "border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`text-3xl transition-transform ${isRunning ? "animate-pulse" : ""}`}
          >
            ⏱️
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Study Timer
            </h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {isRunning
                ? "✨ Session in progress..."
                : "Track your learning sessions"}
            </p>
          </div>
        </div>
        <div
          className={`w-4 h-4 rounded-full ${isRunning ? "bg-green-500 shadow-lg shadow-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
        ></div>
      </div>

      {/* Main Timer Display */}
      <div className="mb-8 text-center">
        {/* Current Session Time */}
        <div className="mb-6">
          <p className="text-xs uppercase font-semibold tracking-widest text-gray-600 dark:text-gray-400 mb-3">
            Session Time
          </p>
          <p
            className={`text-6xl md:text-7xl font-bold font-mono transition-all ${
              isRunning
                ? "text-green-600 dark:text-green-400"
                : "text-indigo-600 dark:text-indigo-400"
            } tracking-wider drop-shadow-sm`}
          >
            {formatTime(elapsedTime)}
          </p>
        </div>

        {/* Today's Total Time */}
        <div className="rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm p-4 border border-gray-200 dark:border-gray-600">
          <p className="text-xs uppercase font-semibold tracking-widest text-gray-600 dark:text-gray-400 mb-2">
            Today's Total
          </p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {formatTime(todayTime)}
          </p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div
          className={`w-2 h-2 rounded-full ${
            isRunning
              ? "bg-green-500 animate-pulse"
              : "bg-gray-400 dark:bg-gray-600"
          }`}
        ></div>
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          {isRunning ? "Session Active" : "Session Paused"}
        </p>
      </div>

      {/* Button Controls */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Start/Pause Button */}
        <button
          onClick={toggleTimer}
          className={`py-3 rounded-lg font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 transform hover:scale-105 active:scale-95 col-span-2 ${
            isRunning
              ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/50"
              : "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/50"
          }`}
        >
          <span className="text-xl">{isRunning ? "⏸️" : "▶️"}</span>
          <span className="text-sm">{isRunning ? "Pause" : "Start"}</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={resetSession}
          disabled={elapsedTime === 0 && !isRunning}
          className={`py-3 rounded-lg font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 transform hover:scale-105 active:scale-95 ${
            elapsedTime === 0 && !isRunning
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-600 cursor-not-allowed opacity-60"
              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md hover:shadow-lg"
          }`}
        >
          <span className="text-lg">🔄</span>
          <span className="text-xs">Reset</span>
        </button>
      </div>

      {/* Tips Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          💡 <span className="font-semibold">Pro Tip:</span> Your daily study
          time accumulates across multiple sessions. The timer automatically
          resumes if you refresh the page.
        </p>
      </div>
    </div>
  );
}