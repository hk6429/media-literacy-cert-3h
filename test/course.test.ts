import { describe, expect, it } from "vitest";
import { COURSE_MODULES, PASSING_SCORE, QUESTIONS, grade, publicCourse } from "../src/course";
import { referenceFor, REGISTERED_SOURCE_REFS } from "../src/source-registry";

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
      expect(question.sourceRef.length).toBeGreaterThan(3);
      const source=referenceFor(question.sourceRef);
      expect(source).toMatchObject({ code: question.sourceRef, url: expect.stringMatching(/^https:\/\//), accessed: "2026-08-27" });
      expect(source.section.length).toBeGreaterThan(3);
    }
    const usedSourceRefs=[...new Set(QUESTIONS.map(question=>question.sourceRef))].sort();
    expect(usedSourceRefs).toEqual([...REGISTERED_SOURCE_REFS]);
    expect(()=>referenceFor("TFC-NOT-REGISTERED")).toThrow("未登錄來源代碼");
    const answerDistribution = [0, 1, 2, 3].map((answer) => QUESTIONS.filter((question) => question.answer === answer).length);
    expect(Math.min(...answerDistribution)).toBeGreaterThan(25);
    const uniqueLongestCorrect = QUESTIONS.filter((question) => question.options.every((option, index) => index === question.answer || question.options[question.answer]!.length > option.length));
    const uniqueShortestCorrect = QUESTIONS.filter((question) => question.options.every((option, index) => index === question.answer || question.options[question.answer]!.length < option.length));
    expect(uniqueLongestCorrect.length).toBeLessThanOrEqual(30);
    expect(uniqueShortestCorrect.length).toBeLessThanOrEqual(30);
    expect(QUESTIONS.some((question) => question.options.some((option) => /作為這次判斷的主要依據|納入最後結論的判斷|依這項線索完成比較|解釋目前看到的差異/.test(option)))).toBe(false);
    const moduleAnswerSequences = new Set<string>();
    for (const module of COURSE_MODULES) {
      const answers = QUESTIONS.filter((question) => question.moduleId === module.id).map((question) => question.answer).join("");
      moduleAnswerSequences.add(answers);
      let longestShortPeriodRun = 0;
      for (let start = 0; start < answers.length; start += 1) {
        for (let period = 2; period <= 4; period += 1) {
          let end = start + period;
          while (end < answers.length && answers[end] === answers[start + ((end - start) % period)]) end += 1;
          longestShortPeriodRun = Math.max(longestShortPeriodRun, end - start);
        }
      }
      expect(longestShortPeriodRun).toBeLessThanOrEqual(8);
    }
    expect(moduleAnswerSequences.size).toBe(COURSE_MODULES.length);
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
