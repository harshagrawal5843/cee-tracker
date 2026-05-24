import { 
  readStudyTimerDataRemote, 
  writeStudyTimerStateRemote, 
  writeStudyTimerHistoryRemote 
} from "./storage";
const DAILY_TIME_ZONE = "Asia/Kolkata";
const DAILY_PLAN_PREFIX = "daily-plan-";
const DAILY_PROGRESS_PREFIX = "daily-challenge-progress-";
const STORAGE_STREAK = "study-streak";
const STORAGE_STUDY_TIME = "study-time";
const STORAGE_STUDY_TIME_DATE = "study-time-date";
const STORAGE_SESSION_TIME = "current-session-time";
const STORAGE_SESSION_ACTIVE = "session-active";
const STORAGE_STUDY_TIME_HISTORY = "study-time-history";


export function getDailyDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_TIME_ZONE,
  }).format(date);
}

export function getDailyPlanStorageKey(dateKey = getDailyDateKey()) {
  return `${DAILY_PLAN_PREFIX}${dateKey}`;
}

export function getDailyProgressStorageKey(dateKey = getDailyDateKey()) {
  return `${DAILY_PROGRESS_PREFIX}${dateKey}`;
}

// Daily plans are stored globally in Firestore via the server API (/api/generate-daily-plan).
// Client should fetch the plan from the server API which reads/writes the "dailyPlans" collection.
export function readDailyPlanCache() {
  // deprecated local cache - client should call the API directly
  return null;
}

export function writeDailyPlanCache() {
  // noop - server API handles global plan storage
}

// Daily progress should be stored per-user in Firestore under
// users/{userId}/dailyProgress/{dateKey}
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function readDailyProgress(
  dateKey = getDailyDateKey(),
  userId = null,
) {
  if (!userId) return {};
  try {
    const ref = doc(db, "users", userId, "dailyProgress", dateKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    return snap.data() || {};
  } catch (e) {
    console.warn("Error reading daily progress from Firestore:", e);
    return {};
  }
}

export async function writeDailyProgress(
  progress,
  dateKey = getDailyDateKey(),
  userId = null,
) {
  if (!userId) return;
  try {
    const ref = doc(db, "users", userId, "dailyProgress", dateKey);
    await setDoc(ref, { ...(progress || {}) }, { merge: true });
  } catch (e) {
    console.warn("Error writing daily progress to Firestore:", e);
  }
}

export function getTaskProgressKey(subject, chapter) {
  return `${subject}::${chapter}`;
}

import {
  readStudyStreakLocal,
  writeStudyStreakLocal,
  writeStudyStreakRemote,
  readStudyStreakRemote
} from "./storage";

export function readStudyStreak() {
  return readStudyStreakLocal();
}

// writeStudyStreak now accepts an optional userId to also sync to Firestore
export function writeStudyStreak(count, lastDate, userId = null) {
  writeStudyStreakLocal(count, lastDate);
  // fire-and-forget remote write if userId provided
  if (userId) {
    writeStudyStreakRemote(count, lastDate, userId).catch(() => {});
  }
}

export async function incrementStudyStreakIfNeeded(
  dateKey = getDailyDateKey(),
  userId = null,
) {
  // 1. Securely fetch true streak from remote if user is logged in
  let current;
  if (userId) {
    current = await readStudyStreakRemote(userId);
  }
  // 2. Fallback to local storage if needed
  if (!current || current.count === undefined) {
    current = readStudyStreakLocal();
  }

  if (current.lastDate === dateKey) {
    return current;
  }

  const currentDate = new Date(`${dateKey}T00:00:00`);
  const lastDate = current.lastDate
    ? new Date(`${current.lastDate}T00:00:00`)
    : null;
  let nextCount = 1;

  if (lastDate && !Number.isNaN(lastDate.getTime())) {
    const dayDiff = Math.round(
      (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (dayDiff === 1) {
      nextCount = current.count + 1;
    } else if (dayDiff > 1) {
      nextCount = 1;
    } else {
      nextCount = current.count || 1;
    }
  }

  const nextState = { count: nextCount, lastDate: dateKey };
  writeStudyStreakLocal(nextState.count, nextState.lastDate);
  if (userId) {
    await writeStudyStreakRemote(nextState.count, nextState.lastDate, userId);
  }
  return nextState;
}

export function readStudyTimerHistoryMap() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_STUDY_TIME_HISTORY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStudyTimerHistoryMap(historyMap) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    STORAGE_STUDY_TIME_HISTORY,
    JSON.stringify(historyMap || {}),
  );
}

export function readStudyTimerState() {
  if (typeof window === "undefined") {
    return {
      dateKey: getDailyDateKey(),
      todayTime: 0,
      elapsedTime: 0,
      isRunning: false,
    };
  }

  const dateKey =
    window.localStorage.getItem(STORAGE_STUDY_TIME_DATE) || getDailyDateKey();
  const todayTime =
    Number(window.localStorage.getItem(STORAGE_STUDY_TIME) || 0) || 0;
  const elapsedTime =
    Number(window.localStorage.getItem(STORAGE_SESSION_TIME) || 0) || 0;
  const isRunning =
    window.localStorage.getItem(STORAGE_SESSION_ACTIVE) === "true";

  return { dateKey, todayTime, elapsedTime, isRunning };
}

export function readStudyTimerHistory() {
  if (typeof window === "undefined") return [];

  const historyMap = readStudyTimerHistoryMap();

  return Object.entries(historyMap)
    .map(([dateKey, entry]) => ({
      dateKey,
      seconds: Number(entry?.seconds) || 0,
      updatedAt: entry?.updatedAt || null,
    }))
    .sort((a, b) => String(b.dateKey).localeCompare(String(a.dateKey)));
}

export function writeStudyTimerHistory(dateKey, seconds) {
  if (typeof window === "undefined" || !dateKey) return;

  const historyMap = readStudyTimerHistoryMap();
  historyMap[dateKey] = {
    seconds: Number(seconds) || 0,
    updatedAt: new Date().toISOString(),
  };

  writeStudyTimerHistoryMap(historyMap);
}

export function syncStudyTimerDay(currentDateKey = getDailyDateKey()) {
  if (typeof window === "undefined") {
    return readStudyTimerState();
  }

  const storedDateKey = window.localStorage.getItem(STORAGE_STUDY_TIME_DATE);
  const storedTodayTime =
    Number(window.localStorage.getItem(STORAGE_STUDY_TIME) || 0) || 0;

  if (
    storedDateKey &&
    storedDateKey !== currentDateKey &&
    storedTodayTime > 0
  ) {
    writeStudyTimerHistory(storedDateKey, storedTodayTime);
  }

  if (storedDateKey !== currentDateKey) {
    window.localStorage.setItem(STORAGE_STUDY_TIME, "0");
    window.localStorage.setItem(STORAGE_STUDY_TIME_DATE, currentDateKey);
  }

  return readStudyTimerState();
}

export function updateStudyTimerSnapshot({
  dateKey = getDailyDateKey(),
  todayTime = 0,
  elapsedTime = 0,
  isRunning = false,
}) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_STUDY_TIME_DATE, dateKey);
  window.localStorage.setItem(STORAGE_STUDY_TIME, String(todayTime));
  window.localStorage.setItem(STORAGE_SESSION_TIME, String(elapsedTime));
  window.localStorage.setItem(STORAGE_SESSION_ACTIVE, String(isRunning));

  writeStudyTimerHistory(dateKey, todayTime);
  window.dispatchEvent(new Event("study-timer-updated"));
}

export function resetStudyTimerSession() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_SESSION_TIME, "0");
  window.localStorage.setItem(STORAGE_SESSION_ACTIVE, "false");
  window.dispatchEvent(new Event("study-timer-updated"));
}

export async function migrateAndSyncTimerData(userId) {
  if (!userId) return;

  const remoteData = await readStudyTimerDataRemote(userId);
  const localHistory = readStudyTimerHistoryMap();
  const localState = readStudyTimerState(); // { dateKey, todayTime, elapsedTime, isRunning }

  let mergedHistory = { ...(remoteData?.history || {}) };
  let remoteNeedsUpdate = false;

  // Merge local into remote (keep highest values)
  Object.entries(localHistory).forEach(([date, entry]) => {
    if (!mergedHistory[date] || mergedHistory[date].seconds < entry.seconds) {
      mergedHistory[date] = entry;
      remoteNeedsUpdate = true;
    }
  });

  // CRITICAL FIX: Always save the merged history back to local storage!
  // This ensures a new device downloads the history so the History Page can read it.
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_STUDY_TIME_HISTORY, JSON.stringify(mergedHistory));
  }

  if (remoteNeedsUpdate) {
    await writeStudyTimerHistoryRemote(mergedHistory, userId);
  }

  // If remote already has a v2 timestamp state, don't overwrite it
  if (remoteData?.state?.version === "v2") {
    return;
  }

  // Convert old local seconds into V2 Timestamps
  const newState = {
    version: "v2",
    dateKey: localState.dateKey,
    isRunning: localState.isRunning,
    sessionAccumulated: localState.isRunning ? 0 : localState.elapsedTime,
    sessionStartTime: localState.isRunning ? (Date.now() - (localState.elapsedTime * 1000)) : null,
    todayBaseTime: localState.todayTime - localState.elapsedTime > 0 ? (localState.todayTime - localState.elapsedTime) : 0,
  };

  await writeStudyTimerStateRemote(newState, userId);
  
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_SESSION_ACTIVE, "false"); 
  }
}
