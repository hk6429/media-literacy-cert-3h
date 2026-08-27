import { COURSE_MODULES } from "./course-content";
import { QUESTIONS, QUESTION_COUNT } from "./question-bank";
import { referenceFor } from "./source-registry";

export const PASSING_SCORE = 80;

const EVIDENCE_PROMPTS: Record<string, string> = {
  framing: "選一則校園或公共議題訊息，列出被呈現與缺席的角色，並說明一項仍需補查的證據。",
  advertising: "選一則社群商業內容，標出利益關係、說服手法、被淡化的限制，以及你的判斷依據。",
  representation: "分析一個媒體再現或網路傷害案例，指出標籤如何形成，並提出安全的旁觀者行動。",
  verification: "對一項可驗證主張完成來源、原始脈絡與至少一個獨立證據的查核紀錄。",
  platforms: "檢視一週內某平台的推薦內容，描述可能的互動訊號、資訊缺口與一項調整策略。",
  deepfake: "設計一個生成式 AI 教學使用情境，交代來源、標示、同意、個資與人工覆核做法。",
};

export function publicCourse() {
  return {
    modules: COURSE_MODULES.map((module) => ({
      ...module,
      evidencePrompt: EVIDENCE_PROMPTS[module.id],
      runOfShow: [
        "0–2 分鐘｜閱讀目標，寫下對案例的第一判斷",
        "2–9 分鐘｜精讀圖文教材、案例與官方來源摘要",
        "9–13 分鐘｜依提示完成實作並留下結構化證據",
        "13–25 分鐘｜完成 25 題評量，依解析回看相應教材",
      ],
    })),
    moduleQuestions: QUESTIONS.map(({ answer: _answer, explanation: _explanation, ...question }) => question),
    passingScore: PASSING_SCORE,
    questionCount: QUESTION_COUNT,
    questionsPerModule: 25,
  };
}

export function grade(moduleId: string, answers: Array<{ id: string; answer: number }>) {
  const expected = QUESTIONS.filter((question) => question.moduleId === moduleId);
  if (expected.length !== 25 || answers.length !== expected.length) throw new Error("INVALID_ANSWERS");
  const answerMap = new Map(answers.map((item) => [item.id, item.answer]));
  if (answerMap.size !== expected.length || expected.some((question) => !answerMap.has(question.id))) throw new Error("INVALID_ANSWERS");
  const details = expected.map((question) => ({
    id: question.id,
    correct: answerMap.get(question.id) === question.answer,
    explanation: question.explanation,
    source: referenceFor(question.sourceRef),
  }));
  const correct = details.filter((item) => item.correct).length;
  return { score: Math.round((correct / expected.length) * 100), correct, total: expected.length, details };
}

export { COURSE_MODULES, QUESTION_COUNT, QUESTIONS };
