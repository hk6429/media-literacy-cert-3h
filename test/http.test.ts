import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../src/course";

describe("HTTP API", () => {
  it("提供不含答案的課程資料", async () => {
    const response = await SELF.fetch("http://example.com/api/course");
    expect(response.status).toBe(200);
    const data = await response.json<{ course: { modules: unknown[]; moduleQuestions: Array<Record<string, unknown>>; questionCount: number } }>();
    expect(data.course.modules).toHaveLength(6);
    expect(data.course.moduleQuestions).toHaveLength(150);
    expect(data.course.questionCount).toBe(150);
    expect(data.course.moduleQuestions[0]).not.toHaveProperty("answer");
  });

  it("教師可建立紀錄並使用 Bearer token 讀取進度", async () => {
    const email = `${crypto.randomUUID()}@example.edu.tw`;
    const enrollResponse = await SELF.fetch("http://example.com/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ name: "林老師", school: "測試國中", email, consent: true }),
    });
    expect(enrollResponse.status).toBe(201);
    const enrolled = await enrollResponse.json<{ token: string }>();
    expect(enrolled.token.length).toBeGreaterThan(32);

    const meResponse = await SELF.fetch("http://example.com/api/me", {
      headers: { Authorization: `Bearer ${enrolled.token}` },
    });
    expect(meResponse.status).toBe(200);
    const me = await meResponse.json<{ learner: { name: string; school: string } }>();
    expect(me.learner).toMatchObject({ name: "林老師", school: "測試國中" });
  });

  it("教師必須送出一卷完整 25 題，成績才寫入進度", async () => {
    const enrollResponse = await SELF.fetch("http://example.com/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ name: "題庫老師", school: "測試國中", email: `${crypto.randomUUID()}@example.edu.tw`, consent: true }),
    });
    const enrolled = await enrollResponse.json<{ token: string }>();
    const answers = QUESTIONS.filter((question) => question.moduleId === "framing")
      .map((question) => ({ id: question.id, answer: question.answer }));
    const submitResponse = await SELF.fetch("http://example.com/api/modules/framing/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://example.com",
        Authorization: `Bearer ${enrolled.token}`,
      },
      body: JSON.stringify({ answers }),
    });
    expect(submitResponse.status).toBe(200);
    expect(await submitResponse.json()).toMatchObject({ passed: true, score: 100, correct: 25, total: 25 });

    const meResponse = await SELF.fetch("http://example.com/api/me", { headers: { Authorization: `Bearer ${enrolled.token}` } });
    const me = await meResponse.json<{ learner: { modules: Record<string, { bestScore: number }> } }>();
    expect(me.learner.modules.framing?.bestScore).toBe(100);
  });

  it("拒絕跨來源寫入", async () => {
    const response = await SELF.fetch("http://example.com/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
      body: JSON.stringify({ name: "林老師", school: "測試國中", email: "x@example.edu.tw", consent: true }),
    });
    expect(response.status).toBe(403);
  });

  it("未帶教師憑證時不可讀取個人資料", async () => {
    const response = await SELF.fetch("http://example.com/api/me");
    expect(response.status).toBe(401);
  });
});
