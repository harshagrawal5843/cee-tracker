import { db, auth } from "./firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const STORAGE_COMPLETIONS = "neet-tracker-completions";
export const STORAGE_THEME = "neet-tracker-theme";

// Fallback to localStorage if Firebase is not available
let firebaseAvailable = false;
try {
  if (db && auth) {
    firebaseAvailable = true;
  }
} catch (e) {
  firebaseAvailable = false;
}

export async function readCompletions(userId = null) {
  // If Firebase is available and user is logged in, fetch from Firestore
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
      console.warn("Error reading from Firebase, falling back to localStorage:", error);
      return readCompletionsLocal();
    }
  }
  
  // Fallback to localStorage
  return readCompletionsLocal();
}

function readCompletionsLocal() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_COMPLETIONS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeCompletions(map, userId = null) {
  // Always save to localStorage as fallback
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_COMPLETIONS, JSON.stringify(map));
  }
  
  // If Firebase is available and user is logged in, save to Firestore
  if (firebaseAvailable && userId) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        completions: map,
        lastUpdated: new Date(),
      }, { merge: true });
    } catch (error) {
      console.warn("Error writing to Firebase:", error);
    }
  }
}

export function clearCompletions() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_COMPLETIONS);
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