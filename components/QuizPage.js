"use client";

import { useEffect, useMemo, useState } from "react";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function QuizPage({ isOpen, task, onClose, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [submittedResult, setSubmittedResult] = useState(null);

  useEffect(() => {
    if (!isOpen || !task) return;

    const count = Math.max(task.questions?.length || 0, 1);
    const duration = Math.max(600, (Number(task.estimatedMinutes) || 10) * 60);

    setCurrentIndex(0);
    setSelectedAnswers(Array(count).fill(null));
    setRemainingSeconds(duration);
    setSubmittedResult(null);
  }, [isOpen, task]);

  const currentQuestion = useMemo(() => {
    if (!task?.questions?.length) return null;
    return task.questions[currentIndex] || null;
  }, [task, currentIndex]);

  const submitQuiz = (autoSubmitted = false) => {
    if (!task || submittedResult) return;

    const answers = (task.questions || []).map((question, index) => {
      const selected = selectedAnswers[index];
      const correct = question.answer;
      const isCorrect = normalizeText(selected) === normalizeText(correct);

      return {
        question: question.question,
        selected,
        correct,
        isCorrect,
      };
    });

    const result = {
      score: answers.filter((answer) => answer.isCorrect).length,
      totalQuestions: answers.length,
      answers,
      autoSubmitted,
      completedAt: new Date().toISOString(),
    };

    setSubmittedResult(result);
    onComplete?.(result);
  };

  useEffect(() => {
    if (!isOpen || !task || submittedResult) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          setTimeout(() => submitQuiz(true), 0);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, task, submittedResult]);

  if (!isOpen || !task) return null;

  const totalQuestions = task.questions?.length || 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const correctCount =
    submittedResult?.answers?.filter((answer) => answer.isCorrect).length || 0;
  const wrongCount = submittedResult
    ? submittedResult.totalQuestions - correctCount
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              10 minute challenge
            </p>
            <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
              {task.subject} · {task.chapter}
            </h3>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Time left
            </p>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {formatTime(remainingSeconds)}
            </p>
          </div>
        </div>

        <div className="max-h-[calc(100vh-140px)] overflow-y-auto px-5 py-5">
          {!submittedResult ? (
            <>
              <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span>
                  {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
                  done
                </span>
              </div>

              <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                  style={{
                    width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                  }}
                />
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-5">
                <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currentQuestion?.question}
                </p>

                <div className="grid gap-3">
                  {(currentQuestion?.options || []).map((option) => {
                    const isSelected = selectedAnswers[currentIndex] === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedAnswers((previous) => {
                            const next = [...previous];
                            next[currentIndex] = option;
                            return next;
                          });
                        }}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-gray-800"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() =>
                      setCurrentIndex((previous) => Math.max(previous - 1, 0))
                    }
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                </div>

                <div className="flex gap-3">
                  {!isLastQuestion ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((previous) =>
                          Math.min(previous + 1, totalQuestions - 1),
                        )
                      }
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => submitQuiz(false)}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700"
                    >
                      Submit
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Score
                </p>
                <p className="mt-2 text-4xl font-black text-emerald-700 dark:text-emerald-300">
                  {submittedResult.score}/{submittedResult.totalQuestions}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/70 p-3 dark:bg-gray-900/40">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Correct
                    </p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                      {correctCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3 dark:bg-gray-900/40">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Wrong
                    </p>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-300">
                      {wrongCount}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                  {submittedResult.autoSubmitted
                    ? "Auto-submitted when the timer ended."
                    : "Submitted successfully."}
                </p>
              </div>

              <div className="space-y-4">
                {submittedResult.answers.map((answer, index) => {
                  const isCorrect = answer.isCorrect;

                  return (
                    <div
                      key={`${answer.question}-${index}`}
                      className={`rounded-xl border p-4 ${
                        isCorrect
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                          : "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30"
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {index + 1}. {answer.question}
                      </p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        Your answer:{" "}
                        <span className="font-semibold">
                          {answer.selected || "Not answered"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        Correct answer:{" "}
                        <span className="font-semibold">{answer.correct}</span>
                      </p>
                      <p
                        className={`mt-1 text-sm font-semibold ${isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
