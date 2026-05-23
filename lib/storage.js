import { db, auth } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export const STORAGE_COMPLETIONS = "cee-tracker-completions";
export const STORAGE_THEME = "cee-tracker-theme";
export const STORAGE_DAILY_CHALLENGE_PREFIX = "daily-challenge-history-";

// Fallback to localStorage if Firebase is not available
let firebaseAvailable = false;
try {
  if (db && auth) {
    firebaseAvailable = true;
  }
} catch (e) {
  firebaseAvailable = false;
}

export function readThemePreference() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(STORAGE_THEME);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return "dark";
}

export function writeThemePreference(theme) {
  if (typeof window === "undefined") return;

  const nextTheme = theme === "light" ? "light" : "dark";
  window.localStorage.setItem(STORAGE_THEME, nextTheme);
  // Apply class for Tailwind's class-based dark mode and keep a data attribute
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
  try {
    document.documentElement.setAttribute("data-theme", nextTheme);
  } catch (e) {
    /* ignore in non-browser env */
  }
  window.dispatchEvent(new Event("cee-theme-updated"));
}

export function applyStoredThemePreference() {
  if (typeof window === "undefined") return "dark";

  const theme = readThemePreference();
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    /* ignore */
  }
  return theme;
}

export async function readCompletions(userId = null) {
  // Only read per-user completions from Firestore. Do not use localStorage.
  if (firebaseAvailable && userId) {
    try {
      const userRef = doc(db, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.completions || {};
      }
      return {};
    } catch (error) {
      console.warn("Error reading completions from Firebase:", error);
      return {};
    }
  }

  // No user or no Firebase: return empty (no localStorage usage per new policy)
  return {};
}

function completionsLocalKey(userId = null) {
  return userId ? `${STORAGE_COMPLETIONS}-${userId}` : STORAGE_COMPLETIONS;
}

function readCompletionsLocal(userId = null) {
  if (typeof window === "undefined") return {};
  try {
    const key = completionsLocalKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeCompletions(map, userId = null) {
  // Persist completions to Firestore for the given userId. Do NOT write to localStorage.
  if (firebaseAvailable && userId) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          completions: map,
          lastUpdated: new Date(),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn("Error writing completions to Firebase:", error);
    }
  } else {
    // No-op: per-user data must be stored in Firestore. Return silently.
  }
}

export async function clearCompletions(userId = null) {
  if (firebaseAvailable && userId) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { completions: {} }, { merge: true });
    } catch (error) {
      console.warn("Error clearing completions in Firebase:", error);
    }
  }
  // Do NOT manipulate localStorage per new requirement
}

function getDailyChallengeHistoryStorageKey(dateKey) {
  return `${STORAGE_DAILY_CHALLENGE_PREFIX}${dateKey}`;
}

// Local caching removed: read/write daily challenge history should use Firestore per-user.

export async function readDailyChallengeHistory(userId = null) {
  if (firebaseAvailable && userId) {
    try {
      const userRef = doc(db, "users", userId);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) return [];

      const data = docSnap.data() || {};
      const historyMap = data.dailyChallengeHistoryByDate || {};
      return Object.values(historyMap)
        .filter(Boolean)
        .sort((a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")),
        );
    } catch (error) {
      console.warn(
        "Error reading daily challenge history from Firebase:",
        error,
      );
      return [];
    }
  }

  return [];
}

export async function readDailyChallengeHistoryByDate(dateKey, userId = null) {
  const records = await readDailyChallengeHistory(userId);
  return records.find((record) => record?.date === dateKey) || null;
}

export async function readDailyProgress(dateKey = null, userId = null) {
  if (!firebaseAvailable || !userId || !dateKey) return {};

  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return {};

    const data = docSnap.data() || {};
    return data.dailyProgressByDate?.[dateKey] || {};
  } catch (error) {
    console.warn("Error reading daily progress from Firebase:", error);
    return {};
  }
}

export async function writeDailyProgress(
  progress,
  dateKey = null,
  userId = null,
) {
  if (!firebaseAvailable || !userId || !dateKey) return;

  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    const data = docSnap.exists() ? docSnap.data() || {} : {};
    const nextDailyProgressByDate = {
      ...(data.dailyProgressByDate || {}),
      [dateKey]: progress || {},
    };

    await setDoc(
      userRef,
      {
        dailyProgressByDate: nextDailyProgressByDate,
        lastUpdated: new Date(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Error writing daily progress to Firebase:", error);
  }
}

// Study streak read/write (local + optional Firestore sync)
export function readStudyStreakLocal() {
  if (typeof window === "undefined") {
    return { count: 0, lastDate: null };
  }

  try {
    const raw = window.localStorage.getItem("study-streak");
    if (!raw) return { count: 0, lastDate: null };
    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed?.count) || 0,
      lastDate: parsed?.lastDate || null,
    };
  } catch {
    return { count: 0, lastDate: null };
  }
}

export function writeStudyStreakLocal(count, lastDate) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      "study-streak",
      JSON.stringify({ count, lastDate }),
    );
    window.dispatchEvent(new Event("study-streak-updated"));
  } catch (e) {
    /* ignore */
  }
}

export async function readStudyStreakRemote(userId = null) {
  if (!firebaseAvailable || !userId) return null;
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { count: 0, lastDate: null };
    const data = snap.data();
    return data?.studyStreak || { count: 0, lastDate: null };
  } catch (error) {
    console.warn("Error reading study streak from Firebase:", error);
    return null;
  }
}

export async function writeStudyStreakRemote(count, lastDate, userId = null) {
  if (!firebaseAvailable || !userId) return;
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      { studyStreak: { count, lastDate }, lastUpdated: new Date() },
      { merge: true },
    );
  } catch (error) {
    console.warn("Error writing study streak to Firebase:", error);
  }
}

export async function writeDailyChallengeHistory(record, userId = null) {
  if (!record?.date || !userId || !firebaseAvailable) return;

  try {
    const historyRef = doc(db, "users", userId);
    const snap = await getDoc(historyRef);
    const data = snap.exists() ? snap.data() || {} : {};
    const nextHistoryByDate = {
      ...(data.dailyChallengeHistoryByDate || {}),
      [record.date]: {
        ...record,
        updatedAt: new Date().toISOString(),
      },
    };

    await setDoc(
      historyRef,
      {
        dailyChallengeHistoryByDate: nextHistoryByDate,
        lastUpdated: new Date(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Error writing daily challenge history to Firebase:", error);
  }
}

export function chapterKey(subject, chapterId) {
  return `${subject}-${chapterId}`;
}

export function calculateSubjectProgress(units, completions, subject) {
  if (!units || units.length === 0) return 0;

  let totalChapters = 0;
  let completedChapters = 0;

  units.forEach((unit) => {
    unit.chapters.forEach((chapter) => {
      totalChapters++;
      const key = chapterKey(subject, chapter.id);
      if (completions[key]) {
        completedChapters++;
      }
    });
  });

  return totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;
}

export function calculateDetailedProgress(units, completions, subject) {
  if (!units || units.length === 0) {
    return {
      totalChapters: 0,
      completedChapters: 0,
      totalPercentage: 0,
    };
  }

  let totalChapters = 0;
  let completedChapters = 0;

  units.forEach((unit) => {
    unit.chapters.forEach((chapter) => {
      totalChapters++;
      const key = chapterKey(subject, chapter.id);
      if (completions[key]) {
        completedChapters++;
      }
    });
  });

  const totalPercentage =
    totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;

  return {
    totalChapters,
    completedChapters,
    totalPercentage,
  };
}

export function calculateGlobalProgress(allSubjectsData, completions) {
  let totalChapters = 0;
  let completedChapters = 0;

  // allSubjectsData is an object with subject keys containing arrays of units
  Object.values(allSubjectsData).forEach((units) => {
    units.forEach((unit) => {
      unit.chapters.forEach(() => {
        totalChapters++;
      });
    });
  });

  Object.keys(completions).forEach((key) => {
    if (completions[key]) {
      completedChapters++;
    }
  });

  return totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;
}
