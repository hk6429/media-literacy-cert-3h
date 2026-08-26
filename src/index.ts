import { PASSING_SCORE, grade, publicCourse } from "./course";
import { CertificationStore, type EnrollInput, type LessonPlan } from "./store";

export { CertificationStore };

type JsonObject = Record<string, unknown>;
type AnswerInput = { id: string; answer: number };

const ADMIN_COOKIE = "mlc_admin_session";
const COURSE_STORE_NAME = "media-literacy-cert-3h";
const MAX_JSON_BYTES = 64 * 1024;

function certificationStore(env: Env): DurableObjectStub<CertificationStore> {
  return env.CERTIFICATION_STORE.getByName(COURSE_STORE_NAME) as DurableObjectStub<CertificationStore>;
}

function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function readJson(request: Request): Promise<JsonObject> {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(length) && length > MAX_JSON_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_JSON");
  return body as JsonObject;
}

function textField(body: JsonObject, key: string, min: number, max: number): string {
  const value = body[key];
  if (typeof value !== "string") throw new Error("VALIDATION");
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < min || normalized.length > max) throw new Error("VALIDATION");
  return normalized;
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function answerList(value: unknown): AnswerInput[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error("VALIDATION");
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("VALIDATION");
    const record = item as JsonObject;
    if (typeof record.id !== "string" || !Number.isInteger(record.answer)) throw new Error("VALIDATION");
    return { id: record.id, answer: record.answer as number };
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function randomCertificateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `ML3-${new Date().getFullYear()}-${bytesToHex(bytes).toUpperCase()}`;
}

function base64Url(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(input: string): string {
  return base64Url(new TextEncoder().encode(input));
}

function decodeBase64UrlText(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([sha256Hex(left), sha256Hex(right)]);
  return crypto.subtle.timingSafeEqual(
    new TextEncoder().encode(leftHash),
    new TextEncoder().encode(rightHash),
  );
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}

async function createAdminSession(secret: string): Promise<string> {
  const payload = base64UrlText(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${payload}.${await hmac(payload, secret)}`;
}

async function verifyAdminSession(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = await hmac(payload, secret);
  if (!(await secureEqual(signature, expected))) return false;
  try {
    const data: unknown = JSON.parse(decodeBase64UrlText(payload));
    return !!data && typeof data === "object" && typeof (data as JsonObject).exp === "number"
      && ((data as JsonObject).exp as number) > Date.now();
  } catch {
    return false;
  }
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice(7).trim();
  if (token.length < 32 || token.length > 128) throw new Error("UNAUTHORIZED");
  return token;
}

async function learnerHash(request: Request): Promise<string> {
  return sha256Hex(bearerToken(request));
}

function ensureSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("FORBIDDEN");
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const known: Record<string, [number, string]> = {
    INVALID_JSON: [400, "請求格式錯誤"],
    VALIDATION: [400, "欄位內容不完整或格式錯誤"],
    PAYLOAD_TOO_LARGE: [413, "資料超過允許大小"],
    EMAIL_EXISTS: [409, "這個 Email 已有學習紀錄，請使用原瀏覽器或洽管理員"],
    UNAUTHORIZED: [401, "驗證失敗，請重新進入課程"],
    FORBIDDEN: [403, "沒有權限執行此操作"],
    INVALID_MODULE: [400, "找不到指定模組"],
    NOT_ELIGIBLE: [409, "尚未達到證書核發條件"],
    "答案數量不完整": [400, "請完成所有題目"],
    "題目不可重複": [400, "題目資料錯誤"],
    "答案格式錯誤": [400, "答案格式錯誤"],
  };
  const [status, publicMessage] = known[message] ?? [500, "系統暫時無法處理，請稍後再試"];
  if (status === 500) console.error(JSON.stringify({ message: "request failed", error: message }));
  return json({ ok: false, error: publicMessage }, status);
}

async function requireAdmin(request: Request, env: Env): Promise<void> {
  if (!env.SESSION_SECRET) throw new Error("SERVER_NOT_CONFIGURED");
  const valid = await verifyAdminSession(cookieValue(request, ADMIN_COOKIE), env.SESSION_SECRET);
  if (!valid) throw new Error("UNAUTHORIZED");
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const store = certificationStore(env);

  if (request.method !== "GET") ensureSameOrigin(request);

  if (request.method === "GET" && path === "/api/course") {
    return json({
      ok: true,
      course: publicCourse(),
      title: env.COURSE_TITLE,
      requiredActiveSeconds: Number(env.REQUIRED_ACTIVE_SECONDS),
      issuer: env.CERTIFICATE_ISSUER,
    });
  }

  if (request.method === "POST" && path === "/api/enroll") {
    const body = await readJson(request);
    const name = textField(body, "name", 2, 60);
    const school = textField(body, "school", 2, 100);
    const email = textField(body, "email", 5, 254).toLowerCase();
    if (!validEmail(email) || body.consent !== true) throw new Error("VALIDATION");
    const token = randomToken();
    const input: EnrollInput = {
      id: crypto.randomUUID(),
      tokenHash: await sha256Hex(token),
      name,
      school,
      email,
      consentAt: Date.now(),
    };
    const enrolled = await store.enroll(input);
    if (!enrolled.ok) throw new Error(enrolled.error);
    return json({ ok: true, token }, 201);
  }

  if (request.method === "GET" && path === "/api/me") {
    const learner = await store.getLearner(await learnerHash(request));
    if (!learner) throw new Error("UNAUTHORIZED");
    return json({ ok: true, learner });
  }

  if (request.method === "POST" && path === "/api/heartbeat") {
    const body = await readJson(request);
    const moduleId = textField(body, "moduleId", 3, 40);
    const result = await store.heartbeat(await learnerHash(request), Date.now(), moduleId);
    return json({ ok: true, ...result });
  }

  const moduleMatch = path.match(/^\/api\/modules\/([a-z-]+)\/submit$/);
  if (request.method === "POST" && moduleMatch) {
    const moduleId = moduleMatch[1]!;
    const body = await readJson(request);
    const result = grade("module", moduleId, answerList(body.answers));
    await store.recordModuleScore(await learnerHash(request), moduleId, result.score, PASSING_SCORE);
    return json({ ok: true, ...result, passed: result.score >= PASSING_SCORE });
  }

  if (request.method === "POST" && path === "/api/final/submit") {
    const body = await readJson(request);
    const result = grade("final", null, answerList(body.answers));
    await store.recordFinalScore(await learnerHash(request), result.score);
    return json({ ok: true, score: result.score, correct: result.correct, total: result.total, passed: result.score >= PASSING_SCORE });
  }

  if (request.method === "POST" && path === "/api/lesson-plan") {
    const body = await readJson(request);
    const plan: LessonPlan = {
      title: textField(body, "title", 4, 100),
      audience: textField(body, "audience", 2, 80),
      objective: textField(body, "objective", 10, 500),
      activity: textField(body, "activity", 20, 1500),
      assessment: textField(body, "assessment", 10, 800),
    };
    await store.saveLessonPlan(await learnerHash(request), plan);
    return json({ ok: true });
  }

  if (request.method === "POST" && path === "/api/certificate/issue") {
    const result = await store.issueCertificate(
      await learnerHash(request),
      randomCertificateCode(),
      Number(env.REQUIRED_ACTIVE_SECONDS),
      PASSING_SCORE,
    );
    if (!result.ok) throw new Error(result.error);
    return json({ ...result, issuer: env.CERTIFICATE_ISSUER, title: env.COURSE_TITLE });
  }

  if (request.method === "GET" && path === "/api/certificate") {
    const learner = await store.getLearner(await learnerHash(request));
    if (!learner?.certificateCode || !learner.completedAt) throw new Error("NOT_ELIGIBLE");
    return json({
      ok: true,
      certificate: {
        name: learner.name,
        school: learner.school,
        code: learner.certificateCode,
        completedAt: learner.completedAt,
        title: env.COURSE_TITLE,
        issuer: env.CERTIFICATE_ISSUER,
        hours: 3,
      },
    });
  }

  const verifyMatch = path.match(/^\/api\/verify\/([A-Z0-9-]{12,40})$/i);
  if (request.method === "GET" && verifyMatch) {
    return json({ ok: true, certificate: await store.verifyCertificate(verifyMatch[1]!.toUpperCase()) });
  }

  if (request.method === "POST" && path === "/api/admin/login") {
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ ok: false, error: "管理端尚未完成設定" }, 503);
    const ip = request.headers.get("CF-Connecting-IP") ?? "local";
    const loginKey = await sha256Hex(`${ip}:${env.SESSION_SECRET}`);
    if (!(await store.canAttemptAdminLogin(loginKey, Date.now()))) {
      return json({ ok: false, error: "嘗試次數過多，請 15 分鐘後再試" }, 429);
    }
    const body = await readJson(request);
    const password = textField(body, "password", 8, 200);
    const success = await secureEqual(password, env.ADMIN_PASSWORD);
    await store.recordAdminLogin(loginKey, success, Date.now());
    if (!success) throw new Error("UNAUTHORIZED");
    const session = await createAdminSession(env.SESSION_SECRET);
    const secure = url.protocol === "https:" ? "; Secure" : "";
    return json({ ok: true }, 200, {
      "Set-Cookie": `${ADMIN_COOKIE}=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`,
    });
  }

  if (request.method === "POST" && path === "/api/admin/logout") {
    return json({ ok: true }, 200, {
      "Set-Cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
    });
  }

  if (path.startsWith("/api/admin/")) await requireAdmin(request, env);

  if (request.method === "GET" && path === "/api/admin/stats") {
    return json({ ok: true, stats: await store.adminStats() });
  }

  if (request.method === "GET" && path === "/api/admin/completions") {
    const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const result = await store.listCompletions(search, Number.isFinite(limit) ? limit : 50, Number.isFinite(offset) ? offset : 0);
    return json({ ok: true, ...result });
  }

  if (request.method === "GET" && path === "/api/admin/export.csv") {
    const allRows = [];
    let offset = 0;
    while (true) {
      const page = await store.listCompletions("", 200, offset);
      allRows.push(...page.rows);
      offset += page.rows.length;
      if (offset >= page.total || page.rows.length === 0) break;
    }
    const csvRows = [
      ["姓名", "學校", "Email", "有效學習分鐘", "總測驗", "完成時間", "證書編號"],
      ...allRows.map((row) => [
        row.name,
        row.school,
        row.email,
        String(Math.floor(row.active_seconds / 60)),
        String(row.final_score),
        new Date(row.completed_at).toISOString(),
        row.certificate_code,
      ]),
    ];
    const csv = `\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="media-literacy-completions-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return json({ ok: false, error: "找不到指定功能" }, 404);
}

function csvCell(value: string): string {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    try {
      const url = new URL(request.url);
      const response = url.pathname.startsWith("/api/")
        ? await handleApi(request, env)
        : await env.ASSETS.fetch(request);
      console.log(JSON.stringify({
        message: "request completed",
        requestId,
        method: request.method,
        path: url.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
      }));
      return withSecurityHeaders(response);
    } catch (error) {
      const response = errorResponse(error);
      console.error(JSON.stringify({
        message: "request failed",
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      }));
      return withSecurityHeaders(response);
    }
  },
} satisfies ExportedHandler<Env>;
