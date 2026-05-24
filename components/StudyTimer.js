"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  getDailyDateKey,
  migrateAndSyncTimerData
} from "@/lib/dailyChallenge";
import { 
  writeStudyTimerStateRemote, 
  subscribeToStudyTimerState
} from "@/lib/storage";

export function StudyTimer() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Server Source of Truth
  const [serverState, setServerState] = useState({
    version: "v2",
    dateKey: getDailyDateKey(),
    isRunning: false,
    sessionAccumulated: 0,
    sessionStartTime: null,
    todayBaseTime: 0,
  });

  // What the user actually sees on screen (updates every second)
  const [displaySessionTime, setDisplaySessionTime] = useState(0);
  const [displayTodayTime, setDisplayTodayTime] = useState(0);

  // 1. Initial Migration & Real-Time Listener setup
  useEffect(() => {
    setIsClient(true);
    let unsubscribe = () => {};

    const setupTimer = async () => {
      if (user?.uid) {
        // Run migration securely in the background
        await migrateAndSyncTimerData(user.uid);
        
        // Listen to Firebase Real-time updates
        unsubscribe = subscribeToStudyTimerState(user.uid, (remoteState) => {
          if (remoteState && remoteState.version === "v2") {
            // If the date rolled over, force a reset for the new day
            if (remoteState.dateKey !== getDailyDateKey()) {
              handleNewDayRollover(remoteState, user.uid);
            } else {
              setServerState(remoteState);
            }
          }
        });
      }
    };

    setupTimer();
    return () => unsubscribe();
  }, [user?.uid]);

  // Handle midnight rollover
  const handleNewDayRollover = (oldState, uid) => {
    const newState = {
      version: "v2",
      dateKey: getDailyDateKey(),
      isRunning: false,
      sessionAccumulated: 0,
      sessionStartTime: null,
      todayBaseTime: 0,
    };
    writeStudyTimerStateRemote(newState, uid);
    setServerState(newState);
  };

  // 2. The Visual Ticker (Updates screen every second, DOES NOT write to DB)
  useEffect(() => {
    const updateDisplay = () => {
      let currentSession = serverState.sessionAccumulated;
      
      if (serverState.isRunning && serverState.sessionStartTime) {
        const elapsedSinceStart = Math.floor((Date.now() - serverState.sessionStartTime) / 1000);
        currentSession += elapsedSinceStart;
      }

      setDisplaySessionTime(currentSession);
      setDisplayTodayTime(serverState.todayBaseTime + currentSession);
    };

    updateDisplay(); // Run immediately
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [serverState]);

  // 3. Action Buttons (Push to Firebase instantly)
  const toggleTimer = () => {
    if (!user?.uid) return;

    const nextRunningState = !serverState.isRunning;
    const now = Date.now();
    let nextAccumulated = serverState.sessionAccumulated;

    // If we are pausing, lock in the time that just passed
    if (!nextRunningState && serverState.sessionStartTime) {
      nextAccumulated += Math.floor((now - serverState.sessionStartTime) / 1000);
    }

    const newState = {
      ...serverState,
      isRunning: nextRunningState,
      sessionAccumulated: nextAccumulated,
      sessionStartTime: nextRunningState ? now : null,
    };

    // Optimistic UI update, then push to server
    setServerState(newState);
    writeStudyTimerStateRemote(newState, user.uid);
  };

  const resetSession = () => {
    if (!user?.uid) return;

    const newState = {
      ...serverState,
      isRunning: false,
      sessionAccumulated: 0,
      sessionStartTime: null,
      todayBaseTime: serverState.todayBaseTime + displaySessionTime // Move session time to base time
    };

    setServerState(newState);
    writeStudyTimerStateRemote(newState, user.uid);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!isClient) return null;

  return (
    <div
      className={`rounded-xl border transition-all duration-300 p-6 ${
        serverState.isRunning
          ? "border-green-400 dark:border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg shadow-green-200 dark:shadow-green-900/50"
          : "border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className={`text-3xl transition-transform ${serverState.isRunning ? "animate-pulse" : ""}`}>
            ⏱️
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Study Timer</h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {serverState.isRunning ? "✨ Session in progress (Syncing Live)" : "Track your learning sessions"}
            </p>
          </div>
        </div>
        <div className={`w-4 h-4 rounded-full ${serverState.isRunning ? "bg-green-500 shadow-lg shadow-green-500" : "bg-gray-300 dark:bg-gray-600"}`}></div>
      </div>

      {/* Main Timer Display */}
      <div className="mb-8 text-center">
        <div className="mb-6">
          <p className="text-xs uppercase font-semibold tracking-widest text-gray-600 dark:text-gray-400 mb-3">Session Time</p>
          <p className={`text-6xl md:text-7xl font-bold font-mono transition-all ${
              serverState.isRunning ? "text-green-600 dark:text-green-400" : "text-indigo-600 dark:text-indigo-400"
            } tracking-wider drop-shadow-sm`}
          >
            {formatTime(displaySessionTime)}
          </p>
        </div>

        <div className="rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm p-4 border border-gray-200 dark:border-gray-600">
          <p className="text-xs uppercase font-semibold tracking-widest text-gray-600 dark:text-gray-400 mb-2">Today's Total</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {formatTime(displayTodayTime)}
          </p>
        </div>
      </div>

      {/* Button Controls */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={toggleTimer}
          className={`py-3 rounded-lg font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 transform hover:scale-105 active:scale-95 col-span-2 ${
            serverState.isRunning
              ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/50"
              : "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/50"
          }`}
        >
          <span className="text-xl">{serverState.isRunning ? "⏸️" : "▶️"}</span>
          <span className="text-sm">{serverState.isRunning ? "Pause" : "Start"}</span>
        </button>

        <button
          onClick={resetSession}
          disabled={displaySessionTime === 0 && !serverState.isRunning}
          className={`py-3 rounded-lg font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 transform hover:scale-105 active:scale-95 ${
            displaySessionTime === 0 && !serverState.isRunning
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-600 cursor-not-allowed opacity-60"
              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md hover:shadow-lg"
          }`}
        >
          <span className="text-lg">🔄</span>
          <span className="text-xs">Reset</span>
        </button>
      </div>
    </div>
  );
}