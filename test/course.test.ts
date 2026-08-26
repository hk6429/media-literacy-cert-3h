import { describe, expect, it } from "vitest";
import { COURSE_MODULES, PASSING_SCORE, grade, publicCourse } from "../src/course";

describe("課程題庫", () => {
  it("公開課程不洩漏答案與解析", () => {
    const course = publicCourse();
    expect(course.modules).toHaveLength(3);
    expect(course.passingScore).toBe(PASSING_SCORE);
    for (const question of [...course.moduleQuestions, ...course.finalQuestions]) {
      expect(question).not.toHaveProperty("answer");
      expect(question).not.toHaveProperty("explanation");
    }
  });

  it("三個模組各有四題形成性評量", () => {
    const course = publicCourse();
    for (const module of COURSE_MODULES) {
      expect(course.moduleQuestions.filter((question) => question.moduleId === module.id)).toHaveLength(4);
    }
  });

  it("能正確計算模組滿分", () => {
    const answers = [
      { id: "m1-1", answer: 1 },
      { id: "m1-2", answer: 1 },
      { id: "m1-3", answer: 2 },
      { id: "m1-4", answer: 1 },
    ];
    expect(grade("module", "construction", answers).score).toBe(100);
  });

  it("拒絕缺題或重複題目", () => {
    expect(() => grade("module", "construction", [{ id: "m1-1", answer: 1 }])).toThrow("答案數量不完整");
    expect(() => grade("module", "construction", [
      { id: "m1-1", answer: 1 },
      { id: "m1-1", answer: 1 },
      { id: "m1-3", answer: 2 },
      { id: "m1-4", answer: 1 },
    ])).toThrow("題目不可重複");
  });
});
