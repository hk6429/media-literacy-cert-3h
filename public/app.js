(() => {
  const LEGACY_TOKEN_KEY = "mlc3_teacher_token_v1";
  const RECOVERY_KEY = "mlc3_recovery_once";
  const app = document.querySelector("#app");
  const state = { course: null, learner: null, meta: null, activeModule: null, lastInteractionAt: Date.now() };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
    const data = await response.json().catch(() => ({ error: "伺服器回應格式錯誤" }));
    if (!response.ok) throw new Error([data.error, ...(Array.isArray(data.details) ? data.details : [])].filter(Boolean).join("：") || "操作失敗");
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

  function recoveryBackup() {
    const recoveryCode = sessionStorage.getItem(RECOVERY_KEY);
    if (!recoveryCode) return alert("復原碼只在註冊或復原成功後顯示一次。若已遺失，請聯絡課程管理者處理。");
    const blob = new Blob([JSON.stringify({ type: "media-literacy-course-recovery", recoveryCode }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "媒體素養課程_一次性復原碼.json";
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
          <p>資料用於保存學習紀錄與核發本站課程完成證明。註冊後請立即下載一次性復原碼；網站不會把永久登入憑證存入瀏覽器儲存空間。</p>
          ${message ? `<p class="alert error">${escapeHtml(message)}</p>` : ""}
        </div>
        <form id="enroll-form" class="stack-form">
          <label for="name">教師姓名</label>
          <input id="name" name="name" autocomplete="name" maxlength="60" required>
          <label for="school">服務學校</label>
          <input id="school" name="school" autocomplete="organization" maxlength="100" required>
          <label for="email">聯絡 Email</label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength="254" required>
          <label class="honeypot" aria-hidden="true">網站<input name="website" tabindex="-1" autocomplete="off"></label>
          <label class="check-line"><input name="consent" type="checkbox" required> 我已閱讀個人資料蒐集告知事項，同意為保存進度與核發本站完成證明蒐集上述資料。</label>
          <button class="button primary" type="submit">建立學習紀錄</button>
          <label class="button secondary file-button">匯入一次性復原碼<input id="import-token" type="file" accept="application/json"></label>
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
          name: form.get("name"), school: form.get("school"), email: form.get("email"), website: form.get("website"), consent: form.get("consent") === "on",
        }),
      });
      sessionStorage.setItem(RECOVERY_KEY, result.recoveryCode);
      await loadLearner();
      renderDashboard("學習紀錄已建立。請立即下載一次性復原碼並妥善保存。");
    } catch (error) {
      renderEnroll(error.message);
    }
  }

  async function importToken(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.type !== "media-literacy-course-recovery" || typeof data.recoveryCode !== "string") throw new Error("檔案不是本課程的一次性復原碼");
      const result = await api("/api/session/recover", { method: "POST", body: JSON.stringify({ recoveryCode: data.recoveryCode }) });
      sessionStorage.setItem(RECOVERY_KEY, result.recoveryCode);
      await loadLearner();
      renderDashboard("已接續原有學習進度。");
    } catch (error) {
      renderEnroll(error.message);
    }
  }

  function completionChecklist() {
    const learner = state.learner;
    const required = state.meta.requiredActiveSeconds;
    const modulesDone = state.course.modules.filter((module) => learner.modules[module.id]?.bestScore >= state.course.passingScore).length;
    return {
      time: state.course.modules.every((module) => (learner.modules[module.id]?.activeSeconds || 0) >= state.meta.moduleRequiredSeconds)
        && learner.capstoneActiveSeconds >= state.meta.capstoneRequiredSeconds,
      modules: modulesDone === state.course.modules.length,
      plan: learner.lessonPlanQualified === true,
      evidence: state.course.modules.every((module) => !!learner.modules[module.id]?.evidence),
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
        <div><button id="backup-token" class="button secondary" type="button">下載一次性復原碼</button> <button id="logout-account" class="button ghost" type="button">安全登出</button> <button id="delete-account" class="button ghost" type="button">刪除我的資料</button></div>
      </div>
      ${message ? `<p class="alert success">${escapeHtml(message)}</p>` : ""}
      <div class="time-card">
        <div><span>有效學習時間</span><strong id="active-time">${formatTime(learner.activeSeconds)}</strong></div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${timePercent}"><span style="width:${timePercent}%"></span></div>
        <p>完成條件：每卷 25 分鐘，加上微教案 30 分鐘，共 180 分鐘。只有頁面可見且持續操作時才累積。</p>
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
            <p class="module-meta">有效閱讀 ${formatTime(progress?.activeSeconds || 0)}／25 分鐘・25 題評量・1 份實作證據</p>
            <p class="status-line">${passed ? `已通過・最佳 ${progress.bestScore} 分` : progress ? `最佳 ${progress.bestScore} 分・尚未通過` : "尚未開始"}</p>
            <button class="button ${passed ? "secondary" : "primary"} open-module" data-module="${module.id}" type="button">${passed ? "複習模組" : "開始模組"}</button>
            </div></article>`;
        }).join("")}
      </div>
      <div class="completion-grid">
        <button class="task-card" id="open-plan" type="button"><span>${checklist.plan ? "已完成" : "待完成"}</span><strong>一頁微教案</strong><small>把研習內容帶回教室</small></button>
        <button class="task-card certificate-task" id="open-certificate" type="button"><span>${learner.certificateCode ? "已核發" : "最後一步"}</span><strong>本站課程完成證明</strong><small>${learner.certificateCode || "完成全部條件後開放"}</small></button>
      </div>
      <ul class="checklist" aria-label="完成證明核發條件">
        <li class="${checklist.time ? "complete" : ""}">有效學習 180 分鐘</li>
        <li class="${checklist.modules ? "complete" : ""}">六個模組、150 題均完成且各卷達 80 分（${checklist.modulesDone}/6）</li>
        <li class="${checklist.evidence ? "complete" : ""}">六卷各繳交一份實作證據</li>
        <li class="${checklist.plan ? "complete" : ""}">完成一頁微教案與 30 分鐘教學轉化</li>
      </ul>`;
    document.querySelector("#backup-token").addEventListener("click", recoveryBackup);
    document.querySelector("#logout-account").addEventListener("click", logoutAccount);
    document.querySelector("#delete-account").addEventListener("click", deleteAccount);
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
    const savedEvidence = state.learner.modules[moduleId]?.evidence;
    const evidence = savedEvidence && typeof savedEvidence === "object" ? savedEvidence : {};
    app.innerHTML = `
      <button class="back-button" type="button">← 回課程總覽</button>
      <figure class="lesson-hero"><img src="${escapeHtml(module.image)}" alt="${escapeHtml(module.imageAlt)}"><figcaption><p class="eyebrow">第 ${state.course.modules.indexOf(module) + 1} 卷・${module.minutes} 分鐘</p><h2>${escapeHtml(module.title)}</h2><p>${escapeHtml(module.guide)}</p></figcaption></figure>
      <div class="objectives"><h3>完成後，我能夠</h3><ul>${module.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div class="run-of-show"><h3>本卷 25 分鐘學習路徑</h3><ol>${module.runOfShow.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol><p>計時只在頁面可見且兩分鐘內持續互動時累積；可分次完成。</p></div>
      <nav class="lesson-toc" aria-label="本卷教材目錄"><strong>本卷教材</strong>${module.sections.map((section, index) => `<a href="#lesson-section-${index + 1}">${index + 1}. ${escapeHtml(section.title.replace(/^.+?、/, ""))}</a>`).join("")}</nav>
      ${module.sections.map((section, index) => `<article id="lesson-section-${index + 1}" class="lesson-section"><p class="section-number">${String(index + 1).padStart(2, "0")}</p><h3>${escapeHtml(section.title)}</h3>${section.content.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${section.caseStudy ? `<div class="case-study"><strong>案例卷宗</strong><p>${escapeHtml(section.caseStudy)}</p></div>` : ""}${section.activity ? `<div class="activity"><strong>動手做</strong><p>${escapeHtml(section.activity)}</p></div>` : ""}</article>`).join("")}
      <div class="source-box"><strong>本卷素材依據</strong>${module.sources.map((source) => `<article><h4>${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label)}</a>` : escapeHtml(source.label)}</h4><p>${escapeHtml(source.note)}</p></article>`).join("")}</div>
      <section class="evidence-section"><p class="eyebrow">本卷實作證據</p><h3>把「動手做」真的做一次</h3><p>${escapeHtml(module.evidencePrompt)}</p><form id="module-evidence" class="stack-form"><label for="evidence-subject">分析對象、事件或網址</label><textarea id="evidence-subject" name="subject" rows="2" minlength="10" maxlength="300" required>${escapeHtml(evidence.subject || "")}</textarea><label for="evidence-observation">我觀察到的具體證據</label><textarea id="evidence-observation" name="observation" rows="4" minlength="30" maxlength="800" required>${escapeHtml(evidence.observation || "")}</textarea><label for="evidence-judgement">我的判斷與理由</label><textarea id="evidence-judgement" name="judgement" rows="4" minlength="30" maxlength="800" required>${escapeHtml(evidence.judgement || "")}</textarea><label for="evidence-limitation">限制、缺少資料或下一步</label><textarea id="evidence-limitation" name="limitation" rows="3" minlength="20" maxlength="600" required>${escapeHtml(evidence.limitation || "")}</textarea><button class="button secondary" type="submit">儲存本卷實作證據</button><div id="evidence-result" aria-live="polite"></div></form></section>
      <section class="quiz-section"><p class="eyebrow">本卷評量</p><h3>25 題全部作答，80 分以上通過</h3><p>題目分成五組，每組五題。答錯後會看到解析，可重新閱讀並再試。</p>${questionForm(questions, "module-quiz", "送出本卷 25 題")}<div id="quiz-result" aria-live="polite"></div></section>`;
    document.querySelector(".back-button").addEventListener("click", () => renderDashboard());
    const quizForm = document.querySelector("#module-quiz");
    bindQuizPagination(quizForm, questions);
    quizForm.addEventListener("submit", (event) => submitQuiz(event, moduleId, questions));
    document.querySelector("#module-evidence").addEventListener("submit", (event) => saveEvidence(event, moduleId));
    window.scrollTo({ top: app.offsetTop - 20, behavior: "smooth" });
  }

  async function saveEvidence(event, moduleId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(["subject", "observation", "judgement", "limitation"].map((key) => [key, form.get(key)]));
    try {
      await api(`/api/modules/${moduleId}/evidence`, { method: "POST", body: JSON.stringify(body) });
      await loadLearner();
      document.querySelector("#evidence-result").innerHTML = `<p class="alert success">本卷實作證據已儲存。</p>`;
    } catch (error) {
      document.querySelector("#evidence-result").innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
    }
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
      container.innerHTML = `<div class="alert ${result.passed ? "success" : "error"}"><strong>${result.score} 分・${result.passed ? "通過" : "尚未通過"}</strong>${result.details ? `<ul>${result.details.map((item) => `<li>${item.correct ? "答對" : "再想想"}：${escapeHtml(item.explanation)} <a href="${escapeHtml(item.source.url)}" target="_blank" rel="noopener">來源 ${escapeHtml(item.source.code)}</a></li>`).join("")}</ul>` : ""}</div>`;
      await loadLearner();
      if (result.passed) setTimeout(() => renderDashboard("這一關已完成，學習證據已存入後臺。"), 1200);
      else button.disabled = false;
    } catch (error) {
      document.querySelector("#quiz-result").innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
      button.disabled = false;
    }
  }

  function renderLessonPlan() {
    state.activeModule = "capstone";
    const plan = state.learner.lessonPlan || {};
    app.className = "panel lesson-view";
    app.innerHTML = `<button class="back-button" type="button">← 回課程總覽</button><p class="eyebrow">教學轉化・有效活動 ${formatTime(state.learner.capstoneActiveSeconds)}／30 分鐘</p><h2>一頁媒體素養微教案</h2><p class="lead">請完成具體、可觀察、能在教室執行的微教案；系統會檢查時間配置、學生產出與評量證據。</p>
      <form id="lesson-plan" class="stack-form wide-form">
        <label for="plan-title">活動名稱</label><input id="plan-title" name="title" maxlength="100" value="${escapeHtml(plan.title || "")}" required>
        <label for="plan-audience">適用年級／對象</label><input id="plan-audience" name="audience" maxlength="80" value="${escapeHtml(plan.audience || "")}" required>
        <label for="plan-objective">學習目標（至少 30 字，包含學生可觀察的表現）</label><textarea id="plan-objective" name="objective" rows="3" minlength="30" maxlength="500" required>${escapeHtml(plan.objective || "")}</textarea>
        <label for="plan-activity">課堂活動流程（至少 120 字，標出各步驟分鐘數）</label><textarea id="plan-activity" name="activity" rows="7" minlength="120" maxlength="1800" required>${escapeHtml(plan.activity || "")}</textarea>
        <label for="plan-assessment">如何看見學生真的學會（至少 40 字）</label><textarea id="plan-assessment" name="assessment" rows="4" minlength="40" maxlength="800" required>${escapeHtml(plan.assessment || "")}</textarea>
        <fieldset class="quality-check"><legend>送出前自我檢核</legend><label><input name="sourceChecked" type="checkbox" ${plan.sourceChecked ? "checked" : ""} required> 素材已確認來源與使用權</label><label><input name="studentOutput" type="checkbox" ${plan.studentOutput ? "checked" : ""} required> 活動有明確的學生產出</label><label><input name="privacyChecked" type="checkbox" ${plan.privacyChecked ? "checked" : ""} required> 已避免揭露學生個資與傷害性素材</label></fieldset>
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
    body.sourceChecked = form.get("sourceChecked") === "on";
    body.studentOutput = form.get("studentOutput") === "on";
    body.privacyChecked = form.get("privacyChecked") === "on";
    try {
      await api("/api/lesson-plan", { method: "POST", body: JSON.stringify(body) });
      await loadLearner();
      renderDashboard("微教案已儲存，管理後臺可看見完成證據。 ");
    } catch (error) {
      document.querySelector("#plan-result").innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function deleteAccount() {
    if (!confirm("確定永久刪除姓名、學校、Email、進度、作答紀錄、微教案與證明資料？此動作無法復原。")) return;
    try {
      await api("/api/me", { method: "DELETE", body: "{}" });
      sessionStorage.removeItem(RECOVERY_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      renderEnroll("資料已刪除。");
    } catch (error) { renderDashboard(error.message); }
  }

  async function logoutAccount() {
    try {
      await api("/api/session/logout", { method: "POST", body: "{}" });
      sessionStorage.removeItem(RECOVERY_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      renderEnroll("已安全登出；下次請使用一次性復原碼接續進度。");
    } catch (error) {
      renderDashboard(`登出尚未成功：${error.message}。請保持本頁開啟並重試，勿直接離開共用電腦。`);
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
        <h2>本站課程完成證明</h2>
        <p>茲證明</p><strong class="certificate-name">${escapeHtml(certificate.name)}</strong><p>${escapeHtml(certificate.school)}</p>
        <p class="certificate-copy">完成「${escapeHtml(certificate.title)}」線上自學課程，內容涵蓋媒體建構、資訊查證、AI 深偽辨識與教學轉化，本站記錄之有效學習活動共計三小時。本證明不是教育部、國教署或研習承辦單位核發之正式研習時數證明。</p>
        <div class="certificate-meta"><span>完成日期<br><strong>${formatDate(certificate.completedAt).split(" ")[0]}</strong></span><span>核發單位<br><strong>${escapeHtml(certificate.issuer)}</strong></span></div>
        <p class="certificate-code">完成證明編號：${escapeHtml(certificate.code)}<br>驗證網址：${escapeHtml(verifyUrl)}</p>
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
      try {
        await loadLearner();
        renderDashboard();
      } catch (error) {
        const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
        if (legacyToken) {
          try {
            const migrated = await api("/api/session/migrate", { method: "POST", headers: { Authorization: `Bearer ${legacyToken}` }, body: "{}" });
            sessionStorage.setItem(RECOVERY_KEY, migrated.recoveryCode);
            localStorage.removeItem(LEGACY_TOKEN_KEY);
            await loadLearner();
            return renderDashboard("舊版學習憑證已安全升級為可撤銷工作階段。");
          } catch (_) { localStorage.removeItem(LEGACY_TOKEN_KEY); }
        }
        renderEnroll();
      }
    } catch (error) {
      app.className = "panel";
      app.innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
    }
  }

  init();
})();
