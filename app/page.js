"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { neetData, neetSubjects } from "@/data";
import { readCompletions, writeCompletions } from "@/lib/storage";
import { SubjectCard } from "@/components/SubjectCard";
import { ProgressBar } from "@/components/ProgressBar";
import { LoginComponent } from "@/components/LoginComponent";

function calculateSubjectProgress(chapters, completions, subject) {
  if (!chapters || chapters.length === 0) return 0;

  let totalChapters = 0;
  let completedChapters = 0;

  chapters.forEach((chapter) => {
    totalChapters++;
    const key = `${subject}-${chapter.id}`;
    if (completions[key]) {
      completedChapters++;
    }
  });

  return totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;
}

function calculateGlobalProgress(completions) {
  let totalChapters = 0;
  let completedChapters = 0;

  neetSubjects.forEach((subject) => {
    const chapters = neetData[subject];
    chapters.forEach((chapter) => {
      totalChapters++;
      const key = `${subject}-${chapter.id}`;
      if (completions[key]) {
        completedChapters++;
      }
    });
  });

  return totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;
}

function getSubjectChapterStats(subject, completions) {
  const chapters = neetData[subject];
  let totalChapters = 0;
  let completedChapters = 0;

  chapters.forEach((chapter) => {
    totalChapters++;
    const key = `${subject}-${chapter.id}`;
    if (completions[key]) {
      completedChapters++;
    }
  });

  return { totalChapters, completedChapters };
}

export default function HomePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [completions, setCompletions] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadCompletions = async () => {
      if (authLoading) return;
      
      if (user) {
        // Load from Firebase if user is logged in
        const data = await readCompletions(user.uid);
        setCompletions(data);
      } else {
        // Load from localStorage if not logged in
        const data = readCompletions();
        setCompletions(data);
      }
      setReady(true);
    };

    loadCompletions();
  }, [user, authLoading]);

  const globalProgress = useMemo(
    () => calculateGlobalProgress(completions),
    [completions]
  );

  const subjectProgressData = useMemo(() => {
    return neetSubjects.reduce((acc, subject) => {
      const percentage = calculateSubjectProgress(
        neetData[subject],
        completions,
        subject
      );
      const { totalChapters, completedChapters } =
        getSubjectChapterStats(subject, completions);

      acc[subject] = {
        percentage,
        totalChapters,
        completedChapters,
      };
      return acc;
    }, {});
  }, [completions]);

  if (!ready || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if user is not authenticated
  if (!user) {
    return <LoginComponent />;
  }

  return (
    <div>
      {/* Header with Logout */}
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            CEE Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Master your CEE preparation across all subjects
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Logged in as <span className="font-semibold">{user.email}</span>
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Global Progress Card */}
      <div className="mb-12 p-8 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 border border-blue-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Overall Progress
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(globalProgress)}%
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
              {neetSubjects.length}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Subjects</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
              {Object.values(subjectProgressData).reduce(
                (sum, data) => sum + data.totalChapters,
                0
              )}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Chapters</p>
          </div>
        </div>
        <ProgressBar percentage={globalProgress} size="lg" />
      </div>

      {/* Subject Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Subjects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {neetSubjects.map((subject) => (
            <SubjectCard
              key={subject}
              subject={subject}
              chaptersCompleted={
                subjectProgressData[subject].completedChapters
              }
              chaptersTotal={subjectProgressData[subject].totalChapters}
              percentage={subjectProgressData[subject].percentage}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
