"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  readCompletions,
  writeCompletions,
  clearCompletions,
} from "@/lib/storage";
import {
  readStudyStreakRemote,
  writeStudyStreakRemote,
  writeStudyStreakLocal,
} from "@/lib/storage";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        (async () => {
          try {
            // No localStorage migration: application now stores per-user data in Firestore only.
            // Ensure remote streak exists and is used as source of truth
            const remoteStreak = await readStudyStreakRemote(currentUser.uid);
            if (remoteStreak && (remoteStreak.count || remoteStreak.lastDate)) {
              writeStudyStreakRemote(
                remoteStreak.count,
                remoteStreak.lastDate,
                currentUser.uid,
              ).catch(() => {});
            }
          } catch (e) {
            console.warn("Error syncing user data on login:", e);
          }
        })();
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signup = async (email, password) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
