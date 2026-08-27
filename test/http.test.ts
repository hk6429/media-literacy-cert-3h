import { env, SELF } from "cloudflare:test";
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

  it("教師可建立紀錄，以 HttpOnly Cookie 讀取進度且只取得一次性復原碼", async () => {
    const email = `${crypto.randomUUID()}@example.edu.tw`;
    const enrollResponse = await SELF.fetch("http://example.com/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ name: "林老師", school: "測試國中", email, consent: true }),
    });
    expect(enrollResponse.status).toBe(201);
    const enrolled = await enrollResponse.json<{ recoveryCode: string }>();
    expect(enrolled.recoveryCode.length).toBeGreaterThan(20);
    expect(enrollResponse.headers.get("Set-Cookie")).toContain("HttpOnly");
    const sessionCookie = enrollResponse.headers.get("Set-Cookie")!.split(";")[0]!;

    const meResponse = await SELF.fetch("http://example.com/api/me", {
      headers: { Cookie: sessionCookie },
    });
    expect(meResponse.status).toBe(200);
    const me = await meResponse.json<{ learner: { name: string; school: string } }>();
    expect(me.learner).toMatchObject({ name: "林老師", school: "測試國中" });

    const recoveredResponse = await SELF.fetch("http://example.com/api/session/recover", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ recoveryCode: enrolled.recoveryCode }),
    });
    expect(recoveredResponse.status).toBe(200);
    const recovered = await recoveredResponse.json<{ recoveryCode: string }>();
    expect(recovered.recoveryCode).not.toBe(enrolled.recoveryCode);
    const recoveredCookie = recoveredResponse.headers.get("Set-Cookie")!.split(";")[0]!;
    const reusedResponse = await SELF.fetch("http://example.com/api/session/recover", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ recoveryCode: enrolled.recoveryCode }),
    });
    expect(reusedResponse.status).toBe(401);
    const logoutResponse = await SELF.fetch("http://example.com/api/session/logout", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: recoveredCookie }, body: "{}",
    });
    expect(logoutResponse.status).toBe(200);
    expect((await SELF.fetch("http://example.com/api/me", { headers: { Cookie: recoveredCookie } })).status).toBe(401);
  });

  it("教師必須送出一卷完整 25 題，成績才寫入進度", async () => {
    const enrollResponse = await SELF.fetch("http://example.com/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ name: "題庫老師", school: "測試國中", email: `${crypto.randomUUID()}@example.edu.tw`, consent: true }),
    });
    const sessionCookie = enrollResponse.headers.get("Set-Cookie")!.split(";")[0]!;
    const answers = QUESTIONS.filter((question) => question.moduleId === "framing")
      .map((question) => ({ id: question.id, answer: question.answer }));
    const submitResponse = await SELF.fetch("http://example.com/api/modules/framing/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://example.com",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ answers }),
    });
    expect(submitResponse.status).toBe(200);
    expect(await submitResponse.json()).toMatchObject({ passed: true, score: 100, correct: 25, total: 25 });

    const meResponse = await SELF.fetch("http://example.com/api/me", { headers: { Cookie: sessionCookie } });
    const me = await meResponse.json<{ learner: { modules: Record<string, { bestScore: number }> } }>();
    expect(me.learner.modules.framing?.bestScore).toBe(100);
  });

  it("實作證據與微教案須通過伺服器品質檢核後才儲存", async () => {
    const enrollResponse = await SELF.fetch("http://example.com/api/enroll", {
      method:"POST",headers:{"Content-Type":"application/json",Origin:"http://example.com"},
      body:JSON.stringify({name:"品管老師",school:"測試國中",email:`${crypto.randomUUID()}@example.edu.tw`,consent:true}),
    });
    const sessionCookie=enrollResponse.headers.get("Set-Cookie")!.split(";")[0]!;
    const post=(path:string,body:unknown)=>SELF.fetch(`http://example.com${path}`,{method:"POST",headers:{"Content-Type":"application/json",Origin:"http://example.com",Cookie:sessionCookie},body:JSON.stringify(body)});
    expect((await post("/api/modules/framing/evidence",{subject:"太短",observation:"重複",judgement:"重複",limitation:"重複"})).status).toBe(400);
    const evidence={subject:"校園手機禁令新聞與校方完整公告",observation:"我逐句標出報導中的事實、觀點與推論，並核對公告日期、適用對象及原始條文。",judgement:"報導正確提到限制措施，但省略例外情況，因此標題比原始公告更為絕對。",limitation:"目前尚未取得學生與家長觀點，下一步要補查實施後的實際經驗。"};
    expect((await post("/api/modules/framing/evidence",evidence)).status).toBe(200);
    const weakPlan={title:"新聞課",audience:"八年級",objective:"學生會查核新聞。",activity:"閱讀新聞。",assessment:"完成學習單。",sourceChecked:true,studentOutput:true,privacyChecked:true};
    const weakResponse=await post("/api/lesson-plan",weakPlan);
    expect(weakResponse.status).toBe(400);
    expect((await weakResponse.json<{details:string[]}>()).details.length).toBeGreaterThan(0);
    const plan={title:"新聞標題框架拆解",audience:"八年級",objective:"學生能比較三則新聞標題，標示價值詞與省略觀點，並使用原文證據說明目前判斷。",activity:"5 分鐘個別閱讀並記錄第一印象；10 分鐘兩人一組圈出價值詞，比較人物、數據與省略觀點；10 分鐘追到原始公告，核對日期、適用對象和完整條文；5 分鐘完成框架分析表，互換檢查來源連結、證據強度與待確認限制，最後修正自己的判斷。各組還要留下查核關鍵字與無法確認的問題，供全班共同檢視。",assessment:"學生完成框架分析表，至少標示兩個價值詞、兩項原文證據與一個缺席觀點，並口頭說明判斷限制。",sourceChecked:true,studentOutput:true,privacyChecked:true};
    expect((await post("/api/lesson-plan",plan)).status).toBe(200);
    const learner=await (await SELF.fetch("http://example.com/api/me",{headers:{Cookie:sessionCookie}})).json<{learner:{modules:Record<string,{evidence:unknown}>;lessonPlanQualified:boolean}}>();
    expect(learner.learner.modules.framing?.evidence).toEqual(evidence);
    expect(learner.learner.lessonPlanQualified).toBe(true);
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

  it("管理端拒絕只有帳號密碼、沒有有效 TOTP 的登入", async () => {
    const response = await SELF.fetch("http://example.com/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD, otp: "00000" }),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});
