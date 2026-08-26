import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { CertificationStore } from "../src/store";

let store: DurableObjectStub<CertificationStore>;

beforeEach(() => {
  store = env.CERTIFICATION_STORE.getByName(crypto.randomUUID()) as DurableObjectStub<CertificationStore>;
});

async function createLearner(tokenHash = "token-hash-1", email = "teacher@example.edu.tw") {
  const result = await store.enroll({
    id: crypto.randomUUID(),
    tokenHash,
    name: "王小明",
    school: "竹光國中",
    email,
    consentAt: Date.now(),
  });
  if (!result.ok) throw new Error(result.error);
  return tokenHash;
}

describe("認證資料層", () => {
  it("建立教師紀錄並阻止 Email 重複", async () => {
    await createLearner();
    const duplicate = await store.enroll({
      id: crypto.randomUUID(), tokenHash: "token-hash-2", name: "王小明", school: "竹光國中",
      email: "teacher@example.edu.tw", consentAt: Date.now(),
    });
    expect(duplicate).toEqual({ ok: false, error: "EMAIL_EXISTS" });
    const learner = await store.getLearner("token-hash-1");
    expect(learner?.name).toBe("王小明");
  });

  it("只計入合理間隔的有效學習秒數", async () => {
    const token = await createLearner();
    const start = Date.now();
    expect((await store.heartbeat(token, start, "framing")).activeSeconds).toBe(0);
    expect((await store.heartbeat(token, start + 30_000, "framing")).activeSeconds).toBe(30);
    expect((await store.heartbeat(token, start + 300_000, "framing")).activeSeconds).toBe(30);
  });

  it("完成四項條件後核發唯一證書並可公開遮罩驗證", async () => {
    const token = await createLearner();
    await store.heartbeat(token, 1_000_000, "framing");
    await store.heartbeat(token, 1_030_000, "framing");
    for (const moduleId of ["framing", "advertising", "representation", "verification", "platforms", "deepfake"]) {
      await store.recordModuleScore(token, moduleId, 100, 80);
    }
    await store.saveLessonPlan(token, {
      title: "新聞標題拆解",
      audience: "八年級",
      objective: "能辨認標題如何影響讀者判斷",
      activity: "比較三個不同角度的標題，找出被放大與省略的觀點。",
      assessment: "完成一張框架分析表並說明證據。",
    });
    const first = await store.issueCertificate(token, "ML3-2026-ABCDEF123456", 30, 80);
    const second = await store.issueCertificate(token, "ML3-2026-SHOULDNOTUSE", 30, 80);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("證書應已核發");
    expect(second.code).toBe(first.code);
    const verification = await store.verifyCertificate(first.code);
    expect(verification).toMatchObject({ valid: true, maskedName: "王＊明", school: "竹光國中" });
  });

  it("缺少完成條件時拒絕核發證書", async () => {
    const token = await createLearner();
    expect(await store.issueCertificate(token, "ML3-2026-NOTREADY123", 10_800, 80)).toEqual({ ok: false, error: "NOT_ELIGIBLE" });
  });

  it("管理登入連續五次失敗後鎖定十五分鐘", async () => {
    const now = Date.now();
    for (let index = 0; index < 5; index += 1) await store.recordAdminLogin("ip-hash", false, now + index);
    expect(await store.canAttemptAdminLogin("ip-hash", now + 1000)).toBe(false);
    expect(await store.canAttemptAdminLogin("ip-hash", now + 16 * 60 * 1000)).toBe(true);
  });
});
