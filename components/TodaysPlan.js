"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  getDailyDateKey,
  getTaskProgressKey,
  incrementStudyStreakIfNeeded,
} from "@/lib/dailyChallenge";
import {
  readDailyProgress,
  writeDailyProgress,
  writeDailyChallengeHistory,
} from "@/lib/storage";
import { QuizPage } from "./QuizPage";

export function TodaysPlan() {
  const { user } = useAuth();
  const [dateKey, setDateKey] = useState(getDailyDateKey());
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    const todayKey = getDailyDateKey();
    setDateKey(todayKey);

    let cancelled = false;

    const loadPlan = async () => {
      try {
        // Always fetch the global plan from the server API which reads/writes dailyPlans in Firestore
        const response = await fetch("/api/generate-daily-plan", {
          method: "GET",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load today's challenge.");
        }

        if (!cancelled) {
          setPlan(data);
          setLoading(false);
        }
      } catch (fetchError) {
        console.error("Error loading daily challenge:", fetchError);
        if (!cancelled) {
          setError(
            fetchError?.message ||
              "Unable to load today's challenge. Check Gemini and Firestore setup.",
          );
          setLoading(false);
        }
      }
    };

    loadPlan();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      if (!dateKey || !user?.uid) {
        if (!cancelled) {
          setProgressMap({});
        }
        return;
      }

      try {
        const savedProgress = await readDailyProgress(dateKey, user.uid);
        if (!cancelled) {
          setProgressMap(savedProgress || {});
        }
      } catch (error) {
        console.error("Error loading daily progress:", error);
        if (!cancelled) {
          setProgressMap({});
        }
      }
    };

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [dateKey, user?.uid]);

  const completedCount = useMemo(() => {
    if (!plan?.tasks?.length) return 0;

    return plan.tasks.filter((task) => {
      const taskKey = getTaskProgressKey(task.subject, task.chapter);
      return Boolean(progressMap[taskKey]);
    }).length;
  }, [plan, progressMap]);

  const isAllCompleted =
    plan?.tasks?.length > 0 && completedCount === plan.tasks.length;

  const handleTaskOpen = (task) => {
    const taskKey = getTaskProgressKey(task.subject, task.chapter);
    if (progressMap[taskKey]) return;

    setSelectedTask(task);
    setQuizOpen(true);
  };

  const handleQuizComplete = async (result) => {
    if (!selectedTask) return;

    const taskKey = getTaskProgressKey(
      selectedTask.subject,
      selectedTask.chapter,
    );
    const updatedTask = {
      ...selectedTask,
      status: "completed",
      result,
      completedAt: result.completedAt,
    };

    const updatedTasks = (plan?.tasks || []).map((task) =>
      getTaskProgressKey(task.subject, task.chapter) === taskKey
        ? updatedTask
        : task,
    );

    const nextProgress = {
      ...progressMap,
      [taskKey]: result,
    };

    const updatedPlan = {
      ...plan,
      tasks: updatedTasks,
    };

    setPlan(updatedPlan);
    setProgressMap(nextProgress);
    // Persist per-user progress to Firestore
    await writeDailyProgress(nextProgress, dateKey, user?.uid);

    if (
      updatedTasks.length > 0 &&
      updatedTasks.every((task) => {
        const tk = getTaskProgressKey(task.subject, task.chapter);
        return Boolean(nextProgress[tk]);
      })
    ) {
      incrementStudyStreakIfNeeded(dateKey, user?.uid);
    }

    // Save final completed tasks/attempt to per-user challenge history in Firestore
    await writeDailyChallengeHistory(
      {
        date: dateKey,
        plan: updatedPlan,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
        source: plan?.source || "gemini",
      },
      user?.uid || null,
    );
    setQuizOpen(false);
    setSelectedTask(null);
  };

  if (loading && !plan) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              Today's Global Challenge
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading your daily MCQ set...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-6 shadow-sm">
        <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
          Today's Global Challenge
        </p>
        <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-300/80">
          {error}
        </p>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🔥</div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Today's Global Challenge
              </h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                {dateKey} • {completedCount}/{plan.tasks.length} completed
              </p>
            </div>
          </div>

          <div className="rounded-full bg-blue-100 px-3 py-1 dark:bg-blue-900/50">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {plan.tasks.length} tasks
            </span>
          </div>
        </div>

        {isAllCompleted ? (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
            🎉 All challenge tasks are completed for today.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plan.tasks.map((task, index) => {
            const taskKey = getTaskProgressKey(task.subject, task.chapter);
            const isDone = Boolean(progressMap[taskKey]);
            const questionCount = task.questions?.length || 0;

            return (
              <button
                key={`${task.subject}-${task.chapter}`}
                type="button"
                onClick={() => handleTaskOpen(task)}
                disabled={isDone}
                className="group rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50/80 to-gray-100/80 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-75 dark:border-gray-700 dark:from-gray-800/40 dark:to-gray-900/50 dark:hover:border-blue-500"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Task #{index + 1}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      isDone
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}
                  >
                    {isDone ? "✔ Completed" : "⏳ Pending"}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-black text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                  {task.subject}
                </h3>

                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {task.chapter}
                </p>

                <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      10 min challenge
                    </p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {questionCount} MCQs
                    </p>
                  </div>
                  <span className="text-lg text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <QuizPage
        isOpen={quizOpen}
        task={selectedTask}
        onClose={() => {
          setQuizOpen(false);
          setSelectedTask(null);
        }}
        onComplete={handleQuizComplete}
      />
    </>
  );
}
