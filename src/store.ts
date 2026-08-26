import { DurableObject } from "cloudflare:workers";

export type EnrollInput = {
  id: string;
  tokenHash: string;
  name: string;
  school: string;
  email: string;
  consentAt: number;
};

export type LessonPlan = {
  title: string;
  audience: string;
  objective: string;
  activity: string;
  assessment: string;
};

type LearnerRow = {
  id: string;
  name: string;
  school: string;
  email: string;
  active_seconds: number;
  last_heartbeat_at: number | null;
  lesson_plan_json: string | null;
  completed_at: number | null;
  certificate_code: string | null;
  certificate_issued_at: number | null;
  created_at: number;
  updated_at: number;
};

type ModuleRow = {
  module_id: string;
  best_score: number;
  attempts: number;
  completed_at: number | null;
};

type FinalRow = {
  best_score: number;
  attempts: number;
  last_submitted_at: number;
};

type CompletionRow = {
  id: string;
  name: string;
  school: string;
  email: string;
  active_seconds: number;
  final_score: number;
  completed_at: number;
  certificate_code: string;
  lesson_plan_json: string;
};

const MODULE_IDS = ["construction", "verification", "deepfake"];

export class CertificationStore extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.migrate();
    });
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);
    const version = this.ctx.storage.sql
      .exec<{ version: number }>("SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations")
      .one().version;

    if (version < 1) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE learners (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          school TEXT NOT NULL,
          email TEXT NOT NULL COLLATE NOCASE UNIQUE,
          consent_at INTEGER NOT NULL,
          active_seconds INTEGER NOT NULL DEFAULT 0,
          last_heartbeat_at INTEGER,
          lesson_plan_json TEXT,
          completed_at INTEGER,
          certificate_code TEXT UNIQUE,
          certificate_issued_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE module_progress (
          learner_id TEXT NOT NULL,
          module_id TEXT NOT NULL,
          best_score INTEGER NOT NULL DEFAULT 0,
          attempts INTEGER NOT NULL DEFAULT 0,
          completed_at INTEGER,
          last_submitted_at INTEGER NOT NULL,
          PRIMARY KEY (learner_id, module_id),
          FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
        );

        CREATE TABLE final_attempts (
          learner_id TEXT PRIMARY KEY,
          best_score INTEGER NOT NULL DEFAULT 0,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_submitted_at INTEGER NOT NULL,
          FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
        );

        CREATE TABLE admin_login_limits (
          login_key TEXT PRIMARY KEY,
          window_started_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX idx_learners_completed_at ON learners(completed_at DESC);
        CREATE INDEX idx_learners_certificate_code ON learners(certificate_code);
        CREATE INDEX idx_learners_school ON learners(school);
        INSERT INTO _sql_schema_migrations (id, applied_at) VALUES (1, unixepoch());
        PRAGMA optimize;
      `);
    }
  }

  async enroll(input: EnrollInput): Promise<{ ok: true } | { ok: false; error: "EMAIL_EXISTS" }> {
    const now = Date.now();
    const existing = this.ctx.storage.sql
      .exec<{ count: number }>("SELECT COUNT(*) AS count FROM learners WHERE email = ? COLLATE NOCASE", input.email)
      .one().count;
    if (existing > 0) return { ok: false, error: "EMAIL_EXISTS" };
    this.ctx.storage.sql.exec(
      `INSERT INTO learners
       (id, token_hash, name, school, email, consent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      input.id,
      input.tokenHash,
      input.name,
      input.school,
      input.email,
      input.consentAt,
      now,
      now,
    );
    return { ok: true };
  }

  async getLearner(tokenHash: string): Promise<ReturnType<CertificationStore["snapshot"]> | null> {
    const learner = this.findLearner(tokenHash);
    return learner ? this.snapshot(learner) : null;
  }

  async heartbeat(tokenHash: string, now: number, moduleId: string): Promise<{ activeSeconds: number }> {
    if (!MODULE_IDS.includes(moduleId)) throw new Error("INVALID_MODULE");
    const learner = this.findLearner(tokenHash);
    if (!learner) throw new Error("UNAUTHORIZED");

    let gained = 0;
    if (learner.last_heartbeat_at !== null) {
      const elapsed = Math.floor((now - learner.last_heartbeat_at) / 1000);
      if (elapsed >= 20 && elapsed <= 90) gained = elapsed;
    }
    const activeSeconds = learner.active_seconds + gained;
    this.ctx.storage.sql.exec(
      "UPDATE learners SET active_seconds = ?, last_heartbeat_at = ?, updated_at = ? WHERE id = ?",
      activeSeconds,
      now,
      now,
      learner.id,
    );
    return { activeSeconds };
  }

  async recordModuleScore(tokenHash: string, moduleId: string, score: number, passingScore: number): Promise<void> {
    if (!MODULE_IDS.includes(moduleId)) throw new Error("INVALID_MODULE");
    const learner = this.findLearner(tokenHash);
    if (!learner) throw new Error("UNAUTHORIZED");
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT INTO module_progress
       (learner_id, module_id, best_score, attempts, completed_at, last_submitted_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(learner_id, module_id) DO UPDATE SET
         best_score = MAX(module_progress.best_score, excluded.best_score),
         attempts = module_progress.attempts + 1,
         completed_at = CASE
           WHEN module_progress.completed_at IS NOT NULL THEN module_progress.completed_at
           WHEN excluded.best_score >= ? THEN excluded.last_submitted_at
           ELSE NULL
         END,
         last_submitted_at = excluded.last_submitted_at`,
      learner.id,
      moduleId,
      score,
      score >= passingScore ? now : null,
      now,
      passingScore,
    );
    this.ctx.storage.sql.exec("UPDATE learners SET updated_at = ? WHERE id = ?", now, learner.id);
  }

  async recordFinalScore(tokenHash: string, score: number): Promise<void> {
    const learner = this.findLearner(tokenHash);
    if (!learner) throw new Error("UNAUTHORIZED");
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT INTO final_attempts (learner_id, best_score, attempts, last_submitted_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(learner_id) DO UPDATE SET
         best_score = MAX(final_attempts.best_score, excluded.best_score),
         attempts = final_attempts.attempts + 1,
         last_submitted_at = excluded.last_submitted_at`,
      learner.id,
      score,
      now,
    );
    this.ctx.storage.sql.exec("UPDATE learners SET updated_at = ? WHERE id = ?", now, learner.id);
  }

  async saveLessonPlan(tokenHash: string, plan: LessonPlan): Promise<void> {
    const learner = this.findLearner(tokenHash);
    if (!learner) throw new Error("UNAUTHORIZED");
    const now = Date.now();
    this.ctx.storage.sql.exec(
      "UPDATE learners SET lesson_plan_json = ?, updated_at = ? WHERE id = ?",
      JSON.stringify(plan),
      now,
      learner.id,
    );
  }

  async issueCertificate(
    tokenHash: string,
    code: string,
    requiredActiveSeconds: number,
    passingScore: number,
  ): Promise<{ ok: true; code: string; completedAt: number } | { ok: false; error: "NOT_ELIGIBLE" }> {
    const learner = this.findLearner(tokenHash);
    if (!learner) throw new Error("UNAUTHORIZED");
    if (learner.certificate_code && learner.completed_at) {
      return { ok: true, code: learner.certificate_code, completedAt: learner.completed_at };
    }
    const modules = this.moduleRows(learner.id);
    const final = this.finalRow(learner.id);
    const allModulesPassed = MODULE_IDS.every((id) => modules.some((item) => item.module_id === id && item.best_score >= passingScore));
    const hasLessonPlan = this.parseLessonPlan(learner.lesson_plan_json) !== null;
    if (!allModulesPassed || !final || final.best_score < passingScore || !hasLessonPlan || learner.active_seconds < requiredActiveSeconds) {
      return { ok: false, error: "NOT_ELIGIBLE" };
    }
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `UPDATE learners
       SET completed_at = ?, certificate_code = ?, certificate_issued_at = ?, updated_at = ?
       WHERE id = ?`,
      now,
      code,
      now,
      now,
      learner.id,
    );
    return { ok: true, code, completedAt: now };
  }

  async verifyCertificate(code: string): Promise<{
    valid: boolean;
    maskedName?: string;
    school?: string;
    completedAt?: number;
  }> {
    const row = this.ctx.storage.sql
      .exec<{ name: string; school: string; completed_at: number }>(
        "SELECT name, school, completed_at FROM learners WHERE certificate_code = ? AND completed_at IS NOT NULL",
        code,
      )
      .toArray()[0];
    if (!row) return { valid: false };
    return { valid: true, maskedName: this.maskName(row.name), school: row.school, completedAt: row.completed_at };
  }

  async adminStats(): Promise<{
    enrolled: number;
    completed: number;
    averageFinalScore: number;
    totalActiveHours: number;
  }> {
    const row = this.ctx.storage.sql.exec<{
      enrolled: number;
      completed: number;
      average_score: number | null;
      active_seconds: number;
    }>(`
      SELECT
        COUNT(*) AS enrolled,
        SUM(CASE WHEN l.completed_at IS NOT NULL THEN 1 ELSE 0 END) AS completed,
        AVG(CASE WHEN l.completed_at IS NOT NULL THEN f.best_score END) AS average_score,
        SUM(l.active_seconds) AS active_seconds
      FROM learners l
      LEFT JOIN final_attempts f ON f.learner_id = l.id
    `).one();
    return {
      enrolled: row.enrolled,
      completed: row.completed ?? 0,
      averageFinalScore: Math.round(row.average_score ?? 0),
      totalActiveHours: Math.round((row.active_seconds / 3600) * 10) / 10,
    };
  }

  async listCompletions(search: string, limit: number, offset: number): Promise<{ rows: CompletionRow[]; total: number }> {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const where = search
      ? "completed_at IS NOT NULL AND (name LIKE ? ESCAPE '\\' OR school LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR certificate_code LIKE ? ESCAPE '\\')"
      : "completed_at IS NOT NULL";
    const params = search ? [pattern, pattern, pattern, pattern] : [];
    const total = this.ctx.storage.sql
      .exec<{ count: number }>(`SELECT COUNT(*) AS count FROM learners WHERE ${where}`, ...params)
      .one().count;
    const rows = this.ctx.storage.sql.exec<CompletionRow>(
      `SELECT
         l.id, l.name, l.school, l.email, l.active_seconds,
         f.best_score AS final_score, l.completed_at, l.certificate_code, l.lesson_plan_json
       FROM learners l
       JOIN final_attempts f ON f.learner_id = l.id
       WHERE ${where.replaceAll("completed_at", "l.completed_at")}
       ORDER BY l.completed_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      safeLimit,
      safeOffset,
    ).toArray();
    return { rows, total };
  }

  async canAttemptAdminLogin(loginKey: string, now: number): Promise<boolean> {
    const row = this.ctx.storage.sql
      .exec<{ window_started_at: number; attempts: number }>(
        "SELECT window_started_at, attempts FROM admin_login_limits WHERE login_key = ?",
        loginKey,
      )
      .toArray()[0];
    if (!row || now - row.window_started_at >= 15 * 60 * 1000) return true;
    return row.attempts < 5;
  }

  async recordAdminLogin(loginKey: string, success: boolean, now: number): Promise<void> {
    if (success) {
      this.ctx.storage.sql.exec("DELETE FROM admin_login_limits WHERE login_key = ?", loginKey);
      return;
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO admin_login_limits (login_key, window_started_at, attempts)
       VALUES (?, ?, 1)
       ON CONFLICT(login_key) DO UPDATE SET
         window_started_at = CASE
           WHEN ? - admin_login_limits.window_started_at >= 900000 THEN ?
           ELSE admin_login_limits.window_started_at
         END,
         attempts = CASE
           WHEN ? - admin_login_limits.window_started_at >= 900000 THEN 1
           ELSE admin_login_limits.attempts + 1
         END`,
      loginKey,
      now,
      now,
      now,
      now,
    );
  }

  private findLearner(tokenHash: string): LearnerRow | null {
    return this.ctx.storage.sql
      .exec<LearnerRow>("SELECT * FROM learners WHERE token_hash = ?", tokenHash)
      .toArray()[0] ?? null;
  }

  private moduleRows(learnerId: string): ModuleRow[] {
    return this.ctx.storage.sql
      .exec<ModuleRow>(
        "SELECT module_id, best_score, attempts, completed_at FROM module_progress WHERE learner_id = ? ORDER BY module_id",
        learnerId,
      )
      .toArray();
  }

  private finalRow(learnerId: string): FinalRow | null {
    return this.ctx.storage.sql
      .exec<FinalRow>(
        "SELECT best_score, attempts, last_submitted_at FROM final_attempts WHERE learner_id = ?",
        learnerId,
      )
      .toArray()[0] ?? null;
  }

  private snapshot(learner: LearnerRow) {
    const modules = this.moduleRows(learner.id);
    const final = this.finalRow(learner.id);
    return {
      id: learner.id,
      name: learner.name,
      school: learner.school,
      email: learner.email,
      activeSeconds: learner.active_seconds,
      lessonPlan: this.parseLessonPlan(learner.lesson_plan_json),
      completedAt: learner.completed_at,
      certificateCode: learner.certificate_code,
      certificateIssuedAt: learner.certificate_issued_at,
      createdAt: learner.created_at,
      updatedAt: learner.updated_at,
      modules: Object.fromEntries(modules.map((item) => [item.module_id, {
        bestScore: item.best_score,
        attempts: item.attempts,
        completedAt: item.completed_at,
      }])),
      final: final ? {
        bestScore: final.best_score,
        attempts: final.attempts,
        lastSubmittedAt: final.last_submitted_at,
      } : null,
    };
  }

  private parseLessonPlan(value: string | null): LessonPlan | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as LessonPlan;
    } catch {
      return null;
    }
  }

  private maskName(name: string): string {
    const characters = [...name];
    if (characters.length <= 1) return "＊";
    if (characters.length === 2) return `${characters[0]}＊`;
    return `${characters[0]}${"＊".repeat(characters.length - 2)}${characters.at(-1)}`;
  }
}
