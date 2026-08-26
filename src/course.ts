import { COURSE_MODULES } from "./course-content";
import { QUESTIONS, QUESTION_COUNT } from "./question-bank";

export const PASSING_SCORE = 80;

export function publicCourse() {
  return {
    modules: COURSE_MODULES,
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
  }));
  const correct = details.filter((item) => item.correct).length;
  return { score: Math.round((correct / expected.length) * 100), correct, total: expected.length, details };
}

export { COURSE_MODULES, QUESTION_COUNT, QUESTIONS };
