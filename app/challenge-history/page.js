"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useUserData, useDailyChallengeHistory } from "@/lib/UserDataContext";
import { Navbar } from "@/components/Navbar";
import { ceeSubjects, getSubjectDisplayName } from "@/data";

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function groupTasksBySubject(tasks = []) {
  return tasks.reduce((acc, task) => {
    const subject = task.subject || "Unknown";
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(task);
    return acc;
  }, {});
}

function summarizeTask(task) {
  const answers = task?.result?.answers || [];
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const wrong = answers.length - correct;
  return { correct, wrong, total: answers.length };
}

export default function ChallengeHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { loading: contextLoading } = useUserData();
  const history = useDailyChallengeHistory();
  const router = useRouter();
  const [subjectFilter, setSubjectFilter] = useState("all");

  /**
   * TASK 4: Refactored to consume from UserDataContext
   * ✅ Removed readDailyChallengeHistory() call - now using useDailyChallengeHistory() hook
   * ✅ No more useEffect fetching history - context handles all syncing via single onSnapshot
   * ✅ Real-time updates: when user completes tasks in another tab, history updates automatically
   */

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const filteredHistory = useMemo(() => {
    if (subjectFilter === "all") return history;

    return history
      .map((day) => ({
        ...day,
        tasks: (day.plan?.tasks || day.tasks || []).filter(
          (task) => task.subject === subjectFilter,
        ),
      }))
      .filter((day) => day.tasks.length > 0);
  }, [history, subjectFilter]);

  const overallStats = useMemo(() => {
    const tasks = history.flatMap((day) => day.plan?.tasks || day.tasks || []);
    const answers = tasks.flatMap((task) => task?.result?.answers || []);
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const wrong = answers.length - correct;

    return {
      days: history.length,
      tasks: tasks.length,
      correct,
      wrong,
    };
  }, [history]);

  if (authLoading || contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">
              Challenge History
            </h1>
            <p className="max-w-2xl text-gray-600 dark:text-gray-400">
              Review every day’s challenge, task score, and question-by-question
              right and wrong answers.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Days
              </p>
              <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">
                {overallStats.days}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tasks
              </p>
              <p className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {overallStats.tasks}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Correct
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {overallStats.correct}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Wrong
              </p>
              <p className="mt-2 text-3xl font-black text-rose-600 dark:text-rose-400">
                {overallStats.wrong}
              </p>
            </div>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubjectFilter("all")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                subjectFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
              }`}
            >
              All Subjects
            </button>
            {ceeSubjects.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => setSubjectFilter(subject)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  subjectFilter === subject
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                }`}
              >
                {getSubjectDisplayName(subject)}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center shadow-sm">
              <p className="text-4xl mb-3">📚</p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No challenge history yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Solve today’s challenge and your results will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredHistory.map((day) => {
                const tasks = day.plan?.tasks || day.tasks || [];
                const grouped = groupTasksBySubject(tasks);
                const dayAnswers = tasks.flatMap(
                  (task) => task?.result?.answers || [],
                );
                const correct = dayAnswers.filter(
                  (answer) => answer.isCorrect,
                ).length;
                const wrong = dayAnswers.length - correct;

                return (
                  <div
                    key={day.date}
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2">
                          {day.date}
                        </p>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                          {formatDateLabel(day.date)}
                        </h2>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm font-semibold">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          Tasks: {tasks.length}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Correct: {correct}
                        </span>
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          Wrong: {wrong}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {Object.entries(grouped).map(
                        ([subject, subjectTasks]) => {
                          const subjectAnswers = subjectTasks.flatMap(
                            (task) => task?.result?.answers || [],
                          );
                          const subjectCorrect = subjectAnswers.filter(
                            (answer) => answer.isCorrect,
                          ).length;
                          const subjectWrong =
                            subjectAnswers.length - subjectCorrect;

                          return (
                            <div
                              key={subject}
                              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-5"
                            >
                              <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {subject}
                                  </h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {subjectCorrect} correct • {subjectWrong}{" "}
                                    wrong
                                  </p>
                                </div>
                                <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                  {subjectTasks.length} tasks
                                </div>
                              </div>

                              <div className="space-y-4">
                                {subjectTasks.map((task) => {
                                  const summary = summarizeTask(task);

                                  return (
                                    <details
                                      key={`${task.subject}-${task.chapter}`}
                                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/40 p-4"
                                    >
                                      <summary className="cursor-pointer list-none">
                                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                          <div>
                                            <p className="font-bold text-gray-900 dark:text-white">
                                              {task.chapter}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                              {summary.correct}/{summary.total}{" "}
                                              correct • {summary.wrong} wrong
                                            </p>
                                          </div>
                                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                            {task.completedAt
                                              ? new Date(
                                                  task.completedAt,
                                                ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "Completed"}
                                          </span>
                                        </div>
                                      </summary>

                                      <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                                        {(task.result?.answers || []).map(
                                          (answer, index) => (
                                            <div
                                              key={`${task.chapter}-${index}`}
                                              className={`rounded-xl border p-4 ${
                                                answer.isCorrect
                                                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                                                  : "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30"
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-3">
                                                <div>
                                                  <p className="font-semibold text-gray-900 dark:text-white">
                                                    {index + 1}.{" "}
                                                    {answer.question}
                                                  </p>
                                                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                                    Your answer:{" "}
                                                    <span className="font-semibold">
                                                      {answer.selected ||
                                                        "Not answered"}
                                                    </span>
                                                  </p>
                                                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                                    Correct answer:{" "}
                                                    <span className="font-semibold">
                                                      {answer.correct}
                                                    </span>
                                                  </p>
                                                </div>
                                                <span
                                                  className={`rounded-full px-3 py-1 text-xs font-bold ${answer.isCorrect ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"}`}
                                                >
                                                  {answer.isCorrect
                                                    ? "Correct"
                                                    : "Wrong"}
                                                </span>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
