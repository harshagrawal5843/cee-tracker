import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ceeData, ceeSubjects, getSubjectDisplayName } from "@/data";
import { getDailyDateKey } from "@/lib/dailyChallenge";

const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const FIRESTORE_TIMEOUT_MS = 3000;
const GEMINI_TIMEOUT_MS = 4000;
const DAILY_PLAN_PROMPT_VERSION = 4;

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(label));
    }, timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

function hashString(value) {
  let hash = 0;
  const input = String(value || "");

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.subject}::${candidate.chapter}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDailyCandidates(dateKey) {
  const seed = hashString(`${dateKey}-${DAILY_PLAN_PROMPT_VERSION}`);
  const candidates = [];

  ceeSubjects.forEach((subject, subjectIndex) => {
    const chapters = ceeData[subject] || [];
    if (!chapters.length) return;

    const firstIndex = (seed + subjectIndex * 7) % chapters.length;
    const secondIndex =
      (firstIndex + Math.max(1, Math.floor(chapters.length / 3))) %
      chapters.length;

    [firstIndex, secondIndex].forEach((chapterIndex) => {
      const chapter = chapters[chapterIndex];
      candidates.push({
        subjectKey: subject,
        subject: getSubjectDisplayName(subject),
        chapter: chapter.chapterName || chapter.name || chapter.id,
      });
    });
  });

  return uniqueCandidates(candidates);
}

function normalizeAnswer(answer, options) {
  const raw = String(answer || "").trim();
  if (!raw) return "";

  if (options.includes(raw)) {
    return raw;
  }

  const letter = raw.match(/^[A-D]$/i)?.[0]?.toUpperCase();
  if (letter) {
    const option = options[letter.charCodeAt(0) - 65];
    if (option) return option;
  }

  return options.find((option) => option === raw) || options[0] || raw;
}

function normalizePlan(rawPlan, dateKey) {
  const tasks = Array.isArray(rawPlan?.tasks) ? rawPlan.tasks : [];
  const normalizedTasks = [];

  tasks.forEach((task) => {
    const subject = String(task?.subject || "").trim();
    const chapter = String(task?.chapter || "").trim();
    const questions = Array.isArray(task?.questions) ? task.questions : [];

    if (!subject || !chapter) return;

    const normalizedQuestions = questions
      .map((question) => {
        const options = Array.isArray(question?.options)
          ? question.options
              .map((option) => String(option).trim())
              .filter(Boolean)
              .slice(0, 4)
          : [];

        if (options.length !== 4) return null;

        const questionText = String(question?.question || "").trim();
        if (!questionText) return null;

        return {
          question: questionText,
          options,
          answer: normalizeAnswer(question?.answer, options),
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    if (normalizedQuestions.length < 5) return;

    normalizedTasks.push({
      subject,
      chapter,
      estimatedMinutes: 10,
      questions: normalizedQuestions,
    });
  });

  return {
    date: dateKey,
    promptVersion: DAILY_PLAN_PROMPT_VERSION,
    tasks: normalizedTasks.slice(0, 6),
  };
}

const EASY_QUESTION_PATTERNS = [
  /\bwhat is\b/i,
  /\bwhich organ\b/i,
  /\bwhere does\b/i,
  /\bsi unit\b/i,
  /\bpumps blood\b/i,
  /\bmainly occur\b/i,
  /\bare characterized by\b/i,
  /\brelated to\b/i,
  /\bcalled\??$/i,
];

const HARD_QUESTION_PATTERNS = [
  /\bassertion\b/i,
  /\breason\b/i,
  /\bincorrect\b/i,
  /\bnot true\b/i,
  /\bexcept\b/i,
  /\bwhich of the following\b/i,
  /\bcalculate\b/i,
  /\bcompute\b/i,
  /\bderive\b/i,
  /\bapply\b/i,
  /\bif\b/i,
  /\bcase\b/i,
  /\btwo statements\b/i,
];

function isLowDifficultyQuestion(questionText) {
  const text = String(questionText || "").trim();
  if (!text) return true;

  const looksEasy = EASY_QUESTION_PATTERNS.some((pattern) => pattern.test(text));
  const looksHard = HARD_QUESTION_PATTERNS.some((pattern) => pattern.test(text));

  return looksEasy || !looksHard;
}

function planLooksTooEasy(plan) {
  const questions = (plan?.tasks || []).flatMap((task) => task?.questions || []);
  if (!questions.length) return true;

  const easyCount = questions.filter((question) =>
    isLowDifficultyQuestion(question?.question),
  ).length;

  const hardTaskCount = (plan?.tasks || []).filter((task) =>
    (task?.questions || []).some(
      (question) => !isLowDifficultyQuestion(question?.question),
    ),
  ).length;

  return easyCount / questions.length > 0.35 || hardTaskCount < Math.max(4, (plan?.tasks || []).length - 1);
}

function buildRejectedQuestionNotes(plan) {
  return (plan?.tasks || [])
    .flatMap((task) =>
      (task?.questions || []).map((question) => String(question?.question || "").trim()),
    )
    .filter(Boolean)
    .slice(0, 8)
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");
}

function buildGeminiPrompt(candidates, isRetry = false, rejectedNotes = "") {
  return `You are a study planner for CEE Tracker.

Generate a daily challenge for students preparing for the Nepal CEE medical/engineering entrance exam.

Think as if you have surveyed a broad collection of Nepal CEE past papers and similar entrance-exam question sets across the web, then use that depth to produce the toughest possible version of each chapter.

Rules:
- Create 4 to 6 tasks
- Each task must be from subjects:
  Physics, Chemistry, Zoology, Botany, Mental Ability
- Keep tasks balanced across subjects
- Each task should be solvable in about 10 minutes

Task rules:
- Tasks must ONLY involve solving MCQs
- Do NOT include lectures or theory
- Each task must include:
  subject, chapter, estimatedMinutes, questions
- Each task must contain exactly 5 questions, not fewer

MCQ rules:
- Each question must be deeply conceptual, application-based, and difficult enough for top Nepal CEE aspirants
- Each MCQ must include:
  question, options (4), correct answer
- Questions must be extremely difficult and match the high-end Nepal CEE standard
- Do NOT generate basic definitions, direct recall, or level-1 formula substitution problems
- Prefer application-based questions, multi-step calculations, assertion-reasoning questions, and "Which of the following is incorrect?" style questions
- For every task, make the 5 questions follow these archetypes as closely as possible:
  1. one multi-step application/calculation problem
  2. one Assertion-Reasoning or statement-combination question
  3. one "Which of the following is incorrect/NOT true/EXCEPT" question
  4. one comparison/exception/trick question using close distractors
  5. one deep conceptual trap question that punishes memorized shortcuts
- Select obscure, deep sub-topics from the requested chapter whenever possible
- DO NOT generate the most common or obvious questions for this chapter. Assume the student has already solved the basic MCQs.
- Distractors must be highly confusing, closely related, and designed to trap careless reasoning
- Avoid repeating the same question pattern, concept, or setup across tasks and across days
- Avoid generic stems such as "what is", "which organ", "where does", "the SI unit of", "mammals are characterized by", and other recall-only prompts unless they are part of a harder multi-step question

${isRetry ? "This is a retry because the previous output was too easy. Replace every easy or recall-based question with genuinely advanced CEE-level reasoning." : ""}
${rejectedNotes ? `Rejected question patterns that must not reappear:\n${rejectedNotes}\n` : ""}

Use only the candidate chapters below. Do not invent chapters outside this list.

When possible, vary the framing heavily from day to day by choosing different sub-topics, different data sets, and different reasoning paths for the same chapter.

Before outputting JSON, mentally check that every question requires reasoning beyond direct recall. If any question can be answered by simple memorization, rewrite it.

Candidate chapters:
${JSON.stringify(candidates, null, 2)}

Output JSON ONLY:

{
  "date": "YYYY-MM-DD",
  "tasks": [
    {
      "subject": "Physics",
      "chapter": "Laws of Motion",
      "estimatedMinutes": 10,
      "questions": [
        {
          "question": "Sample question?",
          "options": ["A", "B", "C", "D"],
          "answer": "A"
        }
      ]
    }
  ]
}`;
}

function buildFallbackQuestions(subjectKey, chapter, dateKey) {
  const pools = {
    physics: [
      {
        question: `A body moves with changing velocity in ${chapter}. Which statement is most accurate?`,
        options: [
          "Its acceleration must always be zero",
          "Its velocity and acceleration can point in different directions",
          "Its speed must remain constant",
          "Its displacement must be zero",
        ],
        answer: "Its velocity and acceleration can point in different directions",
      },
      {
        question: `In ${chapter}, a 2 kg object experiences 6 N east and 2 N west. What is its acceleration?`,
        options: ["1 m/s² east", "2 m/s² east", "4 m/s² east", "8 m/s² east"],
        answer: "2 m/s² east",
      },
      {
        question: `Which of the following is incorrect about inertia in ${chapter}?`,
        options: [
          "It depends on mass",
          "A heavier body has greater inertia",
          "It resists change in motion",
          "It is a measure of force",
        ],
        answer: "It is a measure of force",
      },
      {
        question: `A velocity-time graph in ${chapter} is a straight line with positive slope. Which interpretation is best?`,
        options: [
          "Uniform acceleration",
          "Uniform retardation",
          "Zero displacement",
          "Constant speed",
        ],
        answer: "Uniform acceleration",
      },
      {
        question: `Which of the following best explains why two bodies in ${chapter} may have different responses to the same force?`,
        options: [
          "Their masses may differ",
          "Their weights must always be zero",
          "Their speeds must be equal",
          "Their distances must be the same",
        ],
        answer: "Their masses may differ",
      },
    ],
    chemistry: [
      {
        question: `Which of the following is incorrect regarding isotopes in ${chapter}?`,
        options: [
          "They have the same atomic number",
          "They have different mass numbers",
          "They show similar chemical properties",
          "They always have different numbers of protons",
        ],
        answer: "They always have different numbers of protons",
      },
      {
        question: `An element in ${chapter} has atomic number 17 and mass number 35. How many neutrons does it contain?`,
        options: [
          "16",
          "17",
          "18",
          "35",
        ],
        answer: "18",
      },
      {
        question: `Which statement is most accurate for ${chapter}?`,
        options: [
          "Atomic number decides the identity of an element",
          "Mass number alone determines chemical behavior",
          "Neutrons determine the number of valence electrons",
          "Electrons do not affect chemical properties",
        ],
        answer: "Atomic number decides the identity of an element",
      },
      {
        question: `Which of the following is most likely to remain chemically similar across a group in ${chapter}?`,
        options: [
          "Elements with the same number of valence electrons",
          "Elements with the same mass number",
          "Elements with the same density",
          "Elements with the same atomic radius only",
        ],
        answer: "Elements with the same number of valence electrons",
      },
      {
        question: `A species in ${chapter} shows the same atomic number but a different mass number. What is the most likely relationship?`,
        options: [
          "They are isotopes",
          "They are ions of different charges only",
          "They are completely unrelated elements",
          "They must have different valence shells",
        ],
        answer: "They are isotopes",
      },
    ],
    zoology: [
      {
        question: `Which of the following is incorrect about mammals in ${chapter}?`,
        options: [
          "They generally show endothermy",
          "They feed young ones with milk",
          "They always lay eggs",
          "They have differentiated teeth",
        ],
        answer: "They always lay eggs",
      },
      {
        question: `In ${chapter}, an alveolus must maintain a thin wall mainly to support which process?`,
        options: [
          "Rapid gas exchange",
          "Blood clotting",
          "Food storage",
          "Bone formation",
        ],
        answer: "Rapid gas exchange",
      },
      {
        question: `Which statement best fits ${chapter}?`,
        options: [
          "A dominant adaptive trait can improve survival in a changing environment",
          "All vertebrates lack a backbone",
          "Respiration is identical to digestion",
          "Blood circulation occurs only in plants",
        ],
        answer: "A dominant adaptive trait can improve survival in a changing environment",
      },
      {
        question: `Which of the following is the best inference if a trait appears in ${chapter} but not in all animals?`,
        options: [
          "The trait may be adaptive and specific to certain conditions",
          "The trait is always harmful",
          "The trait must be an artifact",
          "The trait is unrelated to survival",
        ],
        answer: "The trait may be adaptive and specific to certain conditions",
      },
      {
        question: `If a body system in ${chapter} is optimized for exchange across a thin surface, what is the strongest implication?`,
        options: [
          "Diffusion or exchange rate is likely important",
          "The structure must be unrelated to function",
          "The organism cannot survive",
          "The surface must be solid and impermeable",
        ],
        answer: "Diffusion or exchange rate is likely important",
      },
    ],
    botany: [
      {
        question: `Which of the following is incorrect about transport tissues in ${chapter}?`,
        options: [
          "Xylem mainly carries water and minerals",
          "Phloem helps in translocation of food",
          "Xylem always carries food only",
          "Both tissues are important for plant survival",
        ],
        answer: "Xylem always carries food only",
      },
      {
        question: `A plant in ${chapter} shows slow growth in low water availability. Which factor is most directly affected?`,
        options: [
          "Turgor pressure",
          "Chlorophyll absorption by sound waves",
          "Seed coat color only",
          "Petal fragrance",
        ],
        answer: "Turgor pressure",
      },
      {
        question: `Which statement is most reasonable for ${chapter}?`,
        options: [
          "A structure may be specialized for absorption or support",
          "All plant tissues perform photosynthesis equally",
          "Water transport and food transport use the same cells",
          "Plants do not respond to environmental change",
        ],
        answer: "A structure may be specialized for absorption or support",
      },
      {
        question: `Which of the following is most likely to be true if a plant in ${chapter} has reduced photosynthetic efficiency?`,
        options: [
          "Its light capture or gas exchange may be affected",
          "Its roots must become animals",
          "Its seeds must stop existing",
          "Its cells will no longer respire",
        ],
        answer: "Its light capture or gas exchange may be affected",
      },
      {
        question: `If a structure in ${chapter} is specialized for transport over long distances, what property is most likely essential?`,
        options: [
          "Efficient conducting tissue organization",
          "Absence of any vascular elements",
          "Only bright color",
          "Complete lack of internal movement",
        ],
        answer: "Efficient conducting tissue organization",
      },
    ],
    "mental-ability-test": [
      {
        question: `A series follows 3, 6, 12, 24, ?. What is the next term?`,
        options: ["30", "36", "48", "60"],
        answer: "48",
      },
      {
        question: `If A is the sister of B and B is the brother of C, what is A to C?`,
        options: ["Brother", "Sister", "Mother", "Cannot be determined"],
        answer: "Sister",
      },
      {
        question: `Which of the following is incorrect for a number series pattern in ${chapter}?`,
        options: [
          "A pattern can alternate between addition and multiplication",
          "A pattern may depend on two interleaved sequences",
          "All series must increase by the same amount",
          "The next term may require a hidden rule",
        ],
        answer: "All series must increase by the same amount",
      },
      {
        question: `A code replaces each letter with the next letter in the alphabet. What is the code for CEE?`,
        options: ["DFF", "CDF", "DEE", "BEE"],
        answer: "DFF",
      },
      {
        question: `If all apples are fruits and some fruits are sweet, which statement is definitely true?`,
        options: [
          "Some apples are sweet",
          "All fruits are apples",
          "All apples are fruits",
          "No fruits are sweet",
        ],
        answer: "All apples are fruits",
      },
    ],
  };

  const seed = hashString(`${dateKey}-${subjectKey}-${chapter}`);
  const pool = pools[subjectKey] || pools.physics;
  return [0, 1, 2, 3, 4].map((offset) => {
    const template = pool[(seed + offset) % pool.length];
    return {
      question: template.question.replace(/${chapter}/g, chapter),
      options: template.options,
      answer: template.answer,
    };
  });
}

function buildFallbackPlan(dateKey) {
  const bySubject = new Map();
  buildDailyCandidates(dateKey).forEach((candidate) => {
    if (!bySubject.has(candidate.subjectKey)) {
      bySubject.set(candidate.subjectKey, candidate);
    }
  });

  const tasks = [];
  ceeSubjects.forEach((subjectKey) => {
    const candidate = bySubject.get(subjectKey);
    if (!candidate) return;

    tasks.push({
      subject: candidate.subject,
      chapter: candidate.chapter,
      estimatedMinutes: 10,
      questions: buildFallbackQuestions(subjectKey, candidate.chapter, dateKey),
    });
  });

  return {
    date: dateKey,
    tasks: tasks.slice(0, 6),
    __source: "fallback",
  };
}

async function generateWithGemini(dateKey) {
  const candidates = buildDailyCandidates(dateKey);
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = ai.getGenerativeModel({ model: MODEL_CANDIDATES[0] });

  try {
    let rejectedNotes = "";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await withTimeout(
        model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildGeminiPrompt(
                    candidates,
                    attempt > 0,
                    rejectedNotes,
                  ),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.95,
            topP: 0.95,
            topK: 40,
            responseMimeType: "application/json",
          },
        }),
        GEMINI_TIMEOUT_MS,
        "Gemini request timed out.",
      );

      const text = result.response.text();
      const parsed = JSON.parse(text);
      const normalized = normalizePlan(parsed, dateKey);
      if (normalized.tasks.length >= 4 && !planLooksTooEasy(normalized)) {
        return {
          ...normalized,
          __source: "gemini",
        };
      }

      rejectedNotes = buildRejectedQuestionNotes(normalized);
    }
  } catch (error) {
    throw error;
  }

  throw new Error("Gemini returned an invalid daily plan.");
}

async function getOrCreateDailyPlan(dateKey) {
  const planRef = doc(db, "dailyPlans", dateKey);
  let planSnap = null;

  try {
    planSnap = await withTimeout(
      getDoc(planRef),
      FIRESTORE_TIMEOUT_MS,
      "dailyPlans read timed out.",
    );
  } catch (error) {
    console.warn(
      "dailyPlans read failed, falling back to generation:",
      error?.message || error,
    );
  }

  if (planSnap?.exists()) {
    const data = planSnap.data();
    if (
      data?.promptVersion === DAILY_PLAN_PROMPT_VERSION &&
      Array.isArray(data?.tasks) &&
      data.tasks.length > 0
    ) {
      return data;
    }

    try {
      await withTimeout(
        deleteDoc(planRef),
        FIRESTORE_TIMEOUT_MS,
        "dailyPlans delete timed out.",
      );
    } catch (error) {
      console.warn(
        "dailyPlans delete failed, continuing with regeneration:",
        error?.message || error,
      );
    }
  }

  let generatedPlan = null;

  try {
    generatedPlan = await generateWithGemini(dateKey);
  } catch (error) {
    console.warn(
      "Gemini generation failed, using fallback plan:",
      error?.message || error,
    );
    generatedPlan = buildFallbackPlan(dateKey);
  }

  const payload = {
    ...generatedPlan,
    promptVersion: DAILY_PLAN_PROMPT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: generatedPlan?.__source || "fallback",
  };

  try {
    await withTimeout(
      setDoc(planRef, payload, { merge: true }),
      FIRESTORE_TIMEOUT_MS,
      "dailyPlans write timed out.",
    );
  } catch (error) {
    console.warn(
      "dailyPlans write failed, returning generated plan only:",
      error?.message || error,
    );
  }
  return payload;
}

export async function GET() {
  try {
    const dateKey = getDailyDateKey();
    const plan = await getOrCreateDailyPlan(dateKey);
    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    console.error("generate-daily-plan error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate today's challenge.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return GET();
}

export const maxDuration = 60;