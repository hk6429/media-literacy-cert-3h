import { describe, expect, it } from "vitest";
import { COURSE_MODULES, PASSING_SCORE, QUESTIONS, grade, publicCourse } from "../src/course";

describe("課程題庫", () => {
  it("公開課程不洩漏答案與解析", () => {
    const course = publicCourse();
    expect(course.modules).toHaveLength(6);
    expect(course.passingScore).toBe(PASSING_SCORE);
    for (const question of course.moduleQuestions) {
      expect(question).not.toHaveProperty("answer");
      expect(question).not.toHaveProperty("explanation");
    }
  });

  it("六個模組各有 25 題，共 150 題且題目不重複", () => {
    const course = publicCourse();
    expect(course.moduleQuestions).toHaveLength(150);
    expect(new Set(course.moduleQuestions.map((question) => question.id)).size).toBe(150);
    expect(new Set(course.moduleQuestions.map((question) => question.prompt)).size).toBe(150);
    for (const module of COURSE_MODULES) {
      expect(course.moduleQuestions.filter((question) => question.moduleId === module.id)).toHaveLength(25);
    }
    for (const question of QUESTIONS) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.explanation.length).toBeGreaterThan(15);
    }
    const answerDistribution = [0, 1, 2, 3].map((answer) => QUESTIONS.filter((question) => question.answer === answer).length);
    expect(Math.min(...answerDistribution)).toBeGreaterThan(25);
  });

  it("能正確計算模組滿分", () => {
    const answers = QUESTIONS.filter((question) => question.moduleId === "framing")
      .map((question) => ({ id: question.id, answer: question.answer }));
    expect(grade("framing", answers)).toMatchObject({ score: 100, correct: 25, total: 25 });
  });

  it("拒絕缺題或重複題目", () => {
    const answers = QUESTIONS.filter((question) => question.moduleId === "framing")
      .map((question) => ({ id: question.id, answer: question.answer }));
    expect(() => grade("framing", answers.slice(1))).toThrow("INVALID_ANSWERS");
    expect(() => grade("framing", [answers[0]!, ...answers.slice(0, 24)])).toThrow("INVALID_ANSWERS");
  });
});
