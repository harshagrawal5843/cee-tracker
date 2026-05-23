"use client";

export function ChapterAccordion({
  chapter,
  subject,
  completions,
  onCompletionChange,
}) {
  const chapterKey = `${subject}-${chapter.id}`;
  const isChapterCompleted = completions[chapterKey] || false;

  const handleChapterToggle = () => {
    const newCompletions = { ...completions };
    if (isChapterCompleted) {
      delete newCompletions[chapterKey];
    } else {
      newCompletions[chapterKey] = true;
    }
    onCompletionChange(newCompletions);
  };

  return (
    <div className="mb-3 flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-4 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:bg-white dark:hover:bg-gray-800">
      <input
        type="checkbox"
        checked={isChapterCompleted}
        onChange={handleChapterToggle}
        className="h-5 w-5 flex-shrink-0 cursor-pointer rounded accent-blue-600"
      />
      <p
        className={`flex-1 text-[15px] font-medium leading-relaxed ${
          isChapterCompleted
            ? "line-through text-gray-500 dark:text-gray-500"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {chapter.chapterName}
      </p>
    </div>
  );
}
