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
    const sessionHash = "session-for-evidence";
    expect(await store.createSessionFromLegacy(token, sessionHash)).toBe(true);
    expect(await store.createSessionFromLegacy(token, "replay-session")).toBe(false);
    let now = 1_000_000;
    for (const moduleId of ["framing", "advertising", "representation", "verification", "platforms", "deepfake"]) {
      for (let index = 0; index <= 50; index += 1) { await store.heartbeatBySession(sessionHash, now, moduleId); now += 30_000; }
      await store.recordModuleScoreBySession(sessionHash, moduleId, 100, 80);
      await store.saveEvidence(sessionHash, moduleId, JSON.stringify({
        subject:`${moduleId} 模組中的校園訊息與原始來源`,
        observation:"我標出可驗證主張、發布者、日期及原始脈絡，並另找一項獨立資料交叉比較。",
        judgement:"目前兩項資料能支持部分說法，但尚不足以推論所有學生或所有情境都相同。",
        limitation:"樣本與發布目的仍有限制，我會標示待確認處後再決定是否分享。",
      }));
    }
    for (let index = 0; index <= 60; index += 1) { await store.heartbeatBySession(sessionHash, now, "capstone"); now += 30_000; }
    await store.saveLessonPlanBySession(sessionHash, {
      title: "新聞標題拆解",
      audience: "八年級",
      objective: "學生能辨認新聞標題中的價值詞，並使用原文證據說明它如何影響讀者對事件的第一印象。",
      activity: "5 分鐘閱讀同一事件的三個標題並各自寫下第一印象；10 分鐘兩人一組圈出價值詞，比較被放大與省略的觀點，將結果貼在共同表格；10 分鐘回到原始資料查核人物、時間、數據與前後文，學生補上至少兩項可追溯證據；5 分鐘完成一張框架分析表，交換檢查後寫下目前判斷、證據強度與尚待確認的限制。",
      assessment: "學生完成框架分析表，正確標示至少兩個價值詞、兩項原文證據與一個缺席觀點，並能口頭說明目前結論的限制。",
      sourceChecked: true, studentOutput: true, privacyChecked: true,
    });
    const first = await store.issueCertificateBySession(sessionHash, "ML3-2026-ABCDEF123456", 80);
    const second = await store.issueCertificateBySession(sessionHash, "ML3-2026-SHOULDNOTUSE", 80);
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

  it("校園共用 IP 一小時內可建立 100 筆，且無效請求不由資料層自動計次", async () => {
    const now = Date.now();
    for (let index = 0; index < 100; index += 1) {
      expect(await store.canEnroll("school-nat", now)).toBe(true);
      await store.recordEnrollAttempt("school-nat", now + index);
    }
    expect(await store.canEnroll("school-nat", now + 1000)).toBe(false);
    expect(await store.canEnroll("school-nat", now + 61 * 60 * 1000)).toBe(true);
  });

  it("每日清理會刪除超過三年未活動的學員", async () => {
    const token = await createLearner("old-token", "old@example.edu.tw");
    expect(await store.getLearner(token)).not.toBeNull();
    expect(await store.purgeExpired(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000 + 1000)).toBe(1);
    expect(await store.getLearner(token)).toBeNull();
  });
});
