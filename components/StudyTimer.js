"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useUserData, useStudyTimerState } from "@/lib/UserDataContext";
import {
  getDailyDateKey,
  migrateAndSyncTimerData,
  readStudyTimerHistoryMap 
} from "@/lib/dailyChallenge";
import { 
  writeStudyTimerStateRemote, 
  writeStudyTimerHistoryRemote 
} from "@/lib/storage";

/**
 * OPTIMIZED StudyTimer Component
 * 
 * OPTIMIZATIONS:
 * ✅ Removed subscribeToStudyTimerState() onSnapshot listener - saves continuous Firestore reads
 * ✅ Now uses useStudyTimerState() hook from UserDataContext - single shared listener
 * ✅ Manual sync: only writes to Firebase on user actions (start, pause, reset)
 * ✅ History sync: batches updates every 30 seconds instead of continuous syncs
 * ✅ Removed repeated writeStudyTimerStateRemote() calls on every setServerState
 *
 * Result: Eliminates continuous Firestore listener overhead for Study Timer
 */
export function StudyTimer() {
  const { user } = useAuth();
  const { userData } = useUserData();
  const [isClient, setIsClient] = useState(false);

  // Get timer state from context (shared single listener, not per-component)
  const contextTimerState = userData.studyTimerState || {
    version: "v2",
    dateKey: getDailyDateKey(),
    isRunning: false,
    sessionAccumulated: 0,
    sessionStartTime: null,
    todayBaseTime: 0,
  };

  // Local state for visual display (doesn't trigger Firestore reads)
  const [serverState, setServerState] = useState(contextTimerState);
  const [displaySessionTime, setDisplaySessionTime] = useState(0);
  const [displayTodayTime, setDisplayTodayTime] = useState(0);

  /**
   * Sync history map to Firebase
   * Called periodically (every 30s) or on user action
   */
  const syncHistoryMap = (totalSeconds) => {
    if (!user?.uid) return;
    const currentHistory = readStudyTimerHistoryMap();
    const existing = currentHistory[serverState.dateKey]?.seconds || 0;
    
    // Only push if the time has actually increased
    if (totalSeconds > existing) {
       currentHistory[serverState.dateKey] = {
          seconds: totalSeconds,
          updatedAt: new Date().toISOString()
       };
       if (typeof window !== "undefined") {
          window.localStorage.setItem("study-time-history", JSON.stringify(currentHistory));
       }
       // Fire-and-forget remote write (don't await)
       writeStudyTimerHistoryRemote(currentHistory, user.uid).catch((err) => {
          console.warn("⚠️ Failed to sync timer history:", err);
       });
    }
  };

  // Initialize on mount (migrate old data, don't subscribe)
  useEffect(() => {
    setIsClient(true);

    const setupTimer = async () => {
      if (user?.uid) {
        await migrateAndSyncTimerData(user.uid);
        // Set local state from context on mount
        setServerState(contextTimerState);
      }
    };

    setupTimer();
  }, [user?.uid]);

  // Sync context changes to local state (for day rollover detection)
  useEffect(() => {
    if (contextTimerState && contextTimerState.dateKey !== serverState.dateKey) {
      // Day rolled over - reset session
      const newState = {
        version: "v2",
        dateKey: getDailyDateKey(),
        isRunning: false,
        sessionAccumulated: 0,
        sessionStartTime: null,
        todayBaseTime: 0,
      };
      setServerState(newState);
      if (user?.uid) {
        writeStudyTimerStateRemote(newState, user.uid).catch((err) => {
          console.warn("⚠️ Failed to sync timer state on rollover:", err);
        });
      }
    }
  }, [contextTimerState?.dateKey]);

  // Visual ticker + periodic history backup (every 30 seconds)
  useEffect(() => {
    const updateDisplay = () => {
      let currentSession = serverState.sessionAccumulated;
      
      if (serverState.isRunning && serverState.sessionStartTime) {
        const elapsedSinceStart = Math.floor((Date.now() - serverState.sessionStartTime) / 1000);
        currentSession += elapsedSinceStart;
      }

      setDisplaySessionTime(currentSession);
      const currentToday = serverState.todayBaseTime + currentSession;
      setDisplayTodayTime(currentToday);

      // Periodically backup history (every 30s) if running
      // This prevents data loss if user closes tab without pausing
      if (serverState.isRunning && currentSession > 0 && Math.floor(currentSession) % 30 === 0) {
        syncHistoryMap(currentToday);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [serverState]);

  const toggleTimer = () => {
    if (!user?.uid) return;

    const nextRunningState = !serverState.isRunning;
    const now = Date.now();
    let nextAccumulated = serverState.sessionAccumulated;

    if (!nextRunningState && serverState.sessionStartTime) {
      nextAccumulated += Math.floor((now - serverState.sessionStartTime) / 1000);
    }

    const newState = {
      ...serverState,
      isRunning: nextRunningState,
      sessionAccumulated: nextAccumulated,
      sessionStartTime: nextRunningState ? now : null,
    };

    setServerState(newState);
    
    // Manual sync: only write on action, not on every state change
    writeStudyTimerStateRemote(newState, user.uid).catch((err) => {
      console.warn("⚠️ Failed to sync timer state on toggle:", err);
    });

    // Explicitly save to History Log when user hits Pause
    if (!nextRunningState) {
      syncHistoryMap(serverState.todayBaseTime + nextAccumulated);
    }
  };

  const resetSession = () => {
    if (!user?.uid) return;

    const totalBeforeReset = serverState.todayBaseTime + displaySessionTime;

    const newState = {
      ...serverState,
      isRunning: false,
      sessionAccumulated: 0,
      sessionStartTime: null,
      todayBaseTime: totalBeforeReset 
    };

    setServerState(newState);
    
    // Manual sync: only write on action
    writeStudyTimerStateRemote(newState, user.uid).catch((err) => {
      console.warn("⚠️ Failed to sync timer state on reset:", err);
    });
    
    // Explicitly save to History Log when user hits Reset
    syncHistoryMap(totalBeforeReset);
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