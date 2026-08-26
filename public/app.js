(() => {
  const TOKEN_KEY = "mlc3_teacher_token_v1";
  const app = document.querySelector("#app");
  const state = { course: null, learner: null, meta: null, activeModule: null, lastInteractionAt: Date.now() };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);

  async function api(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({ error: "伺服器回應格式錯誤" }));
    if (!response.ok) throw new Error(data.error || "操作失敗");
    return data;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    return hours > 0 ? `${hours} 小時 ${minutes} 分` : `${minutes} 分鐘`;
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat("zh-TW", { dateStyle: "long", timeStyle: "short" }).format(new Date(timestamp));
  }

  function tokenBackup() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const blob = new Blob([JSON.stringify({ type: "media-literacy-cert-3h", token }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "媒體素養認證3小時_學習進度憑證.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function renderEnroll(message = "") {
    state.activeModule = null;
    app.className = "panel";
    app.innerHTML = `
      <div class="enroll-layout">
        <div>
          <p class="eyebrow">開始研習</p>
          <h2>一次填寫，之後直接接續進度</h2>
          <p>資料用於保存學習紀錄與核發證書。建議註冊後立即下載學習進度憑證，換電腦時即可匯入。</p>
          ${message ? `<p class="alert error">${escapeHtml(message)}</p>` : ""}
        </div>
        <form id="enroll-form" class="stack-form">
          <label for="name">教師姓名</label>
          <input id="name" name="name" autocomplete="name" maxlength="60" required>
          <label for="school">服務學校</label>
          <input id="school" name="school" autocomplete="organization" maxlength="100" required>
          <label for="email">聯絡 Email</label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength="254" required>
          <label class="check-line"><input name="consent" type="checkbox" required> 我已閱讀資料說明，同意為保存進度與核發證書蒐集上述資料。</label>
          <button class="button primary" type="submit">建立學習紀錄</button>
          <label class="button secondary file-button">匯入既有學習憑證<input id="import-token" type="file" accept="application/json"></label>
        </form>
      </div>`;
    document.querySelector("#enroll-form").addEventListener("submit", enroll);
    document.querySelector("#import-token").addEventListener("change", importToken);
  }

  async function enroll(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await api("/api/enroll", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"), school: form.get("school"), email: form.get("email"), consent: form.get("consent") === "on",
        }),
      });
      localStorage.setItem(TOKEN_KEY, result.token);
      await loadLearner();
      renderDashboard("學習紀錄已建立。請先下載一份學習進度憑證備用。");
    } catch (error) {
      renderEnroll(error.message);
    }
  }

  async function importToken(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.type !== "media-literacy-cert-3h" || typeof data.token !== "string") throw new Error("檔案不是本課程的學習憑證");
      localStorage.setItem(TOKEN_KEY, data.token);
      await loadLearner();
      renderDashboard("已接續原有學習進度。");
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      renderEnroll(error.message);
    }
  }

  function completionChecklist() {
    const learner = state.learner;
    const required = state.meta.requiredActiveSeconds;
    const modulesDone = state.course.modules.filter((module) => learner.modules[module.id]?.bestScore >= state.course.passingScore).length;
    return {
      time: learner.activeSeconds >= required,
      modules: modulesDone === state.course.modules.length,
      plan: !!learner.lessonPlan,
      modulesDone,
    };
  }

  function renderDashboard(message = "") {
    state.activeModule = null;
    const learner = state.learner;
    const checklist = completionChecklist();
    const required = state.meta.requiredActiveSeconds;
    const timePercent = Math.min(100, Math.round((learner.activeSeconds / required) * 100));
    app.className = "panel course-dashboard";
    app.innerHTML = `
      <div class="dashboard-head">
        <div><p class="eyebrow">${escapeHtml(learner.school)}</p><h2>${escapeHtml(learner.name)}老師，歡迎回來</h2></div>
        <button id="backup-token" class="button secondary" type="button">下載學習進度憑證</button>
      </div>
      ${message ? `<p class="alert success">${escapeHtml(message)}</p>` : ""}
      <div class="time-card">
        <div><span>有效學習時間</span><strong id="active-time">${formatTime(learner.activeSeconds)}</strong></div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${timePercent}"><span style="width:${timePercent}%"></span></div>
        <p>完成條件：180 分鐘。目前 ${timePercent}%。只有頁面可見且持續操作時才累積。</p>
      </div>
      <div class="module-grid">
        ${state.course.modules.map((module, index) => {
          const progress = learner.modules[module.id];
          const passed = progress?.bestScore >= state.course.passingScore;
          return `<article class="module-card ${passed ? "done" : ""}">
            <img src="${escapeHtml(module.image)}" alt="${escapeHtml(module.imageAlt)}" loading="lazy">
            <div class="module-card-body"><p class="module-number">卷 ${index + 1}</p>
            <h3>${escapeHtml(module.title)}</h3>
            <p>${escapeHtml(module.summary)}</p>
            <p class="module-meta">${module.minutes} 分鐘・25 題評量</p>
            <p class="status-line">${passed ? `已通過・最佳 ${progress.bestScore} 分` : progress ? `最佳 ${progress.bestScore} 分・尚未通過` : "尚未開始"}</p>
            <button class="button ${passed ? "secondary" : "primary"} open-module" data-module="${module.id}" type="button">${passed ? "複習模組" : "開始模組"}</button>
            </div></article>`;
        }).join("")}
      </div>
      <div class="completion-grid">
        <button class="task-card" id="open-plan" type="button"><span>${checklist.plan ? "已完成" : "待完成"}</span><strong>一頁微教案</strong><small>把研習內容帶回教室</small></button>
        <button class="task-card certificate-task" id="open-certificate" type="button"><span>${learner.certificateCode ? "已核發" : "最後一步"}</span><strong>課程完成證書</strong><small>${learner.certificateCode || "完成全部條件後開放"}</small></button>
      </div>
      <ul class="checklist" aria-label="證書完成條件">
        <li class="${checklist.time ? "complete" : ""}">有效學習 180 分鐘</li>
        <li class="${checklist.modules ? "complete" : ""}">六個模組、150 題均完成且各卷達 80 分（${checklist.modulesDone}/6）</li>
        <li class="${checklist.plan ? "complete" : ""}">完成一頁微教案</li>
      </ul>`;
    document.querySelector("#backup-token").addEventListener("click", tokenBackup);
    document.querySelectorAll(".open-module").forEach((button) => button.addEventListener("click", () => renderModule(button.dataset.module)));
    document.querySelector("#open-plan").addEventListener("click", renderLessonPlan);
    document.querySelector("#open-certificate").addEventListener("click", handleCertificate);
  }

  function questionForm(questions, id, submitText) {
    return `<form id="${id}" class="quiz-form">
      <div class="quiz-progress"><span>評量進度</span><strong id="quiz-page-label">第 1 組／共 5 組</strong></div>
      ${Array.from({ length: 5 }, (_, page) => `<section class="question-page" data-page="${page}" ${page === 0 ? "" : "hidden"}>
      ${questions.slice(page * 5, page * 5 + 5).map((question, localIndex) => `<fieldset>
        <legend>${page * 5 + localIndex + 1}. ${escapeHtml(question.prompt)}</legend>
        ${question.options.map((option, optionIndex) => `<label><input type="radio" name="${question.id}" value="${optionIndex}"> <span>${escapeHtml(option)}</span></label>`).join("")}
      </fieldset>`).join("")}</section>`).join("")}
      <div class="quiz-nav"><button class="button secondary quiz-prev" type="button" hidden>上一組</button><button class="button primary quiz-next" type="button">下一組</button><button class="button primary quiz-submit" type="submit" hidden>${submitText}</button></div>
      <div class="quiz-page-message" aria-live="polite"></div>
    </form>`;
  }

  function bindQuizPagination(form, questions) {
    let page = 0;
    const pages = [...form.querySelectorAll(".question-page")];
    const prev = form.querySelector(".quiz-prev");
    const next = form.querySelector(".quiz-next");
    const submit = form.querySelector(".quiz-submit");
    const label = form.querySelector("#quiz-page-label");
    const message = form.querySelector(".quiz-page-message");
    const show = () => {
      pages.forEach((item, index) => { item.hidden = index !== page; });
      prev.hidden = page === 0;
      next.hidden = page === pages.length - 1;
      submit.hidden = page !== pages.length - 1;
      label.textContent = `第 ${page + 1} 組／共 ${pages.length} 組`;
      message.innerHTML = "";
    };
    const pageComplete = () => questions.slice(page * 5, page * 5 + 5).every((question) => form.querySelector(`input[name="${question.id}"]:checked`));
    next.addEventListener("click", () => {
      if (!pageComplete()) { message.innerHTML = `<p class="alert error">請先完成這一組 5 題。</p>`; return; }
      page += 1; show(); form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    prev.addEventListener("click", () => { page -= 1; show(); form.scrollIntoView({ behavior: "smooth", block: "start" }); });
    show();
  }

  function renderModule(moduleId) {
    const module = state.course.modules.find((item) => item.id === moduleId);
    if (!module) return;
    state.activeModule = moduleId;
    state.lastInteractionAt = Date.now();
    const questions = state.course.moduleQuestions.filter((question) => question.moduleId === moduleId);
    app.className = "panel lesson-view";
    app.innerHTML = `
      <button class="back-button" type="button">← 回課程總覽</button>
      <figure class="lesson-hero"><img src="${escapeHtml(module.image)}" alt="${escapeHtml(module.imageAlt)}"><figcaption><p class="eyebrow">第 ${state.course.modules.indexOf(module) + 1} 卷・${module.minutes} 分鐘</p><h2>${escapeHtml(module.title)}</h2><p>${escapeHtml(module.guide)}</p></figcaption></figure>
      <div class="objectives"><h3>完成後，我能夠</h3><ul>${module.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <nav class="lesson-toc" aria-label="本卷教材目錄"><strong>本卷教材</strong>${module.sections.map((section, index) => `<a href="#lesson-section-${index + 1}">${index + 1}. ${escapeHtml(section.title.replace(/^.+?、/, ""))}</a>`).join("")}</nav>
      ${module.sections.map((section, index) => `<article id="lesson-section-${index + 1}" class="lesson-section"><p class="section-number">${String(index + 1).padStart(2, "0")}</p><h3>${escapeHtml(section.title)}</h3>${section.content.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${section.caseStudy ? `<div class="case-study"><strong>案例卷宗</strong><p>${escapeHtml(section.caseStudy)}</p></div>` : ""}${section.activity ? `<div class="activity"><strong>動手做</strong><p>${escapeHtml(section.activity)}</p></div>` : ""}</article>`).join("")}
      <div class="source-box"><strong>本卷素材依據</strong>${module.sources.map((source) => `<article><h4>${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label)}</a>` : escapeHtml(source.label)}</h4><p>${escapeHtml(source.note)}</p></article>`).join("")}</div>
      <section class="quiz-section"><p class="eyebrow">本卷評量</p><h3>25 題全部作答，80 分以上通過</h3><p>題目分成五組，每組五題。答錯後會看到解析，可重新閱讀並再試。</p>${questionForm(questions, "module-quiz", "送出本卷 25 題")}<div id="quiz-result" aria-live="polite"></div></section>`;
    document.querySelector(".back-button").addEventListener("click", () => renderDashboard());
    const quizForm = document.querySelector("#module-quiz");
    bindQuizPagination(quizForm, questions);
    quizForm.addEventListener("submit", (event) => submitQuiz(event, moduleId, questions));
    window.scrollTo({ top: app.offsetTop - 20, behavior: "smooth" });
  }

  function answersFromForm(form, questions) {
    const data = new FormData(form);
    return questions.map((question) => ({ id: question.id, answer: Number(data.get(question.id)) }));
  }

  async function submitQuiz(event, moduleId, questions) {
    event.preventDefault();
    const answers = answersFromForm(event.currentTarget, questions);
    if (answers.some((item) => !Number.isInteger(item.answer))) {
      event.currentTarget.querySelector(".quiz-page-message").innerHTML = `<p class="alert error">請完成全部 25 題後再送出。</p>`;
      return;
    }
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await api(`/api/modules/${moduleId}/submit`, { method: "POST", body: JSON.stringify({ answers }) });
      const container = document.querySelector("#quiz-result");
      container.innerHTML = `<div class="alert ${result.passed ? "success" : "error"}"><strong>${result.score} 分・${result.passed ? "通過" : "尚未通過"}</strong>${result.details ? `<ul>${result.details.map((item) => `<li>${item.correct ? "答對" : "再想想"}：${escapeHtml(item.explanation)}</li>`).join("")}</ul>` : ""}</div>`;
      await loadLearner();
      if (result.passed) setTimeout(() => renderDashboard("這一關已完成，學習證據已存入後臺。"), 1200);
      else button.disabled = false;
    } catch (error) {
      document.querySelector("#quiz-result").innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
      button.disabled = false;
    }
  }

  function renderLessonPlan() {
    state.activeModule = "framing";
    const plan = state.learner.lessonPlan || {};
    app.className = "panel lesson-view";
    app.innerHTML = `<button class="back-button" type="button">← 回課程總覽</button><p class="eyebrow">教學轉化</p><h2>一頁媒體素養微教案</h2><p class="lead">不用寫長篇教案，請把一個概念轉成下一週真的能進教室的活動。</p>
      <form id="lesson-plan" class="stack-form wide-form">
        <label for="plan-title">活動名稱</label><input id="plan-title" name="title" maxlength="100" value="${escapeHtml(plan.title || "")}" required>
        <label for="plan-audience">適用年級／對象</label><input id="plan-audience" name="audience" maxlength="80" value="${escapeHtml(plan.audience || "")}" required>
        <label for="plan-objective">學習目標</label><textarea id="plan-objective" name="objective" rows="3" maxlength="500" required>${escapeHtml(plan.objective || "")}</textarea>
        <label for="plan-activity">課堂活動流程</label><textarea id="plan-activity" name="activity" rows="7" maxlength="1500" required>${escapeHtml(plan.activity || "")}</textarea>
        <label for="plan-assessment">如何看見學生真的學會</label><textarea id="plan-assessment" name="assessment" rows="4" maxlength="800" required>${escapeHtml(plan.assessment || "")}</textarea>
        <button class="button primary" type="submit">儲存微教案</button><div id="plan-result" aria-live="polite"></div>
      </form>`;
    document.querySelector(".back-button").addEventListener("click", () => renderDashboard());
    document.querySelector("#lesson-plan").addEventListener("submit", saveLessonPlan);
    window.scrollTo({ top: app.offsetTop - 20, behavior: "smooth" });
  }

  async function saveLessonPlan(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(["title", "audience", "objective", "activity", "assessment"].map((key) => [key, form.get(key)]));
    try {
      await api("/api/lesson-plan", { method: "POST", body: JSON.stringify(body) });
      await loadLearner();
      renderDashboard("微教案已儲存，管理後臺可看見完成證據。 ");
    } catch (error) {
      document.querySelector("#plan-result").innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function handleCertificate() {
    try {
      if (!state.learner.certificateCode) await api("/api/certificate/issue", { method: "POST", body: "{}" });
      const result = await api("/api/certificate");
      await loadLearner();
      renderCertificate(result.certificate);
    } catch (error) {
      renderDashboard(error.message);
    }
  }

  function renderCertificate(certificate) {
    state.activeModule = null;
    const verifyUrl = `${location.origin}/verify.html?code=${encodeURIComponent(certificate.code)}`;
    app.className = "panel certificate-shell";
    app.innerHTML = `<div class="certificate-actions"><button class="back-button" type="button">← 回課程總覽</button><button id="print-certificate" class="button primary" type="button">列印／另存 PDF</button></div>
      <article id="certificate" class="certificate">
        <p class="certificate-kicker">Certificate of Completion</p>
        <h2>課程完成證書</h2>
        <p>茲證明</p><strong class="certificate-name">${escapeHtml(certificate.name)}</strong><p>${escapeHtml(certificate.school)}</p>
        <p class="certificate-copy">完成「${escapeHtml(certificate.title)}」線上教師增能課程，研習內容涵蓋媒體建構、資訊查證、AI 深偽辨識與教學轉化，共計三小時。</p>
        <div class="certificate-meta"><span>完成日期<br><strong>${formatDate(certificate.completedAt).split(" ")[0]}</strong></span><span>核發單位<br><strong>${escapeHtml(certificate.issuer)}</strong></span></div>
        <p class="certificate-code">證書編號：${escapeHtml(certificate.code)}<br>驗證網址：${escapeHtml(verifyUrl)}</p>
      </article>`;
    document.querySelector(".back-button").addEventListener("click", () => renderDashboard());
    document.querySelector("#print-certificate").addEventListener("click", () => window.print());
  }

  async function loadLearner() {
    const result = await api("/api/me");
    state.learner = result.learner;
  }

  async function heartbeat() {
    if (!state.activeModule || document.visibilityState !== "visible" || Date.now() - state.lastInteractionAt > 120000) return;
    try {
      const result = await api("/api/heartbeat", { method: "POST", body: JSON.stringify({ moduleId: state.activeModule }) });
      if (state.learner) state.learner.activeSeconds = result.activeSeconds;
      const display = document.querySelector("#active-time");
      if (display) display.textContent = formatTime(result.activeSeconds);
    } catch (_) {
      // 下一次互動時再同步；不打斷閱讀。
    }
  }

  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((eventName) => window.addEventListener(eventName, () => { state.lastInteractionAt = Date.now(); }, { passive: true }));
  setInterval(heartbeat, 30000);

  async function init() {
    try {
      const result = await api("/api/course");
      state.course = result.course;
      state.meta = result;
      if (!localStorage.getItem(TOKEN_KEY)) return renderEnroll();
      try {
        await loadLearner();
        renderDashboard();
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        renderEnroll(error.message);
      }
    } catch (error) {
      app.className = "panel";
      app.innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
    }
  }

  init();
})();
