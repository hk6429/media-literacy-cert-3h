(() => {
  const root = document.querySelector("#admin-app");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({ error: "伺服器回應格式錯誤" }));
    if (!response.ok) {
      const error = new Error(data.error || "操作失敗");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function renderLogin(message = "") {
    root.className = "panel narrow";
    root.innerHTML = `<form id="admin-login" class="stack-form"><h2>管理員雙因素登入</h2>${message ? `<p class="alert error">${escapeHtml(message)}</p>` : ""}<label for="username">管理員帳號</label><input id="username" name="username" autocomplete="username" required><label for="password">管理密碼</label><input id="password" name="password" type="password" autocomplete="current-password" required><label for="otp">驗證器六位數代碼</label><input id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><button class="button primary" type="submit">進入後臺</button></form>`;
    document.querySelector("#admin-login").addEventListener("submit", login);
  }

  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password"), otp: form.get("otp") }) });
      await renderDashboard();
    } catch (error) {
      renderLogin(error.message);
    }
  }

  function dateTime(value) {
    return new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }

  async function renderDashboard(query = "") {
    try {
      const [statsResult, recordsResult] = await Promise.all([
        api("/api/admin/stats"),
        api(`/api/admin/completions?q=${encodeURIComponent(query)}&limit=100&offset=0`),
      ]);
      const stats = statsResult.stats;
      root.className = "panel admin-panel";
      root.innerHTML = `<div class="admin-tools"><form id="record-search" class="search-form"><label for="q">搜尋完成教師</label><div><input id="q" name="q" value="${escapeHtml(query)}" placeholder="姓名、學校、Email、完成證明編號"><button class="button primary" type="submit">搜尋</button></div></form><div><a class="button secondary" href="/api/admin/export.csv">匯出 CSV</a><button id="logout" class="button ghost" type="button">登出</button></div></div>
        <div class="stats-grid"><article><span>已建立紀錄</span><strong>${stats.enrolled}</strong></article><article><span>已完成</span><strong>${stats.completed}</strong></article><article><span>平均六卷評量</span><strong>${stats.averageFinalScore}</strong></article><article><span>累積學習</span><strong>${stats.totalActiveHours} 小時</strong></article></div>
        <div class="table-wrap"><table><caption>完成教師 ${recordsResult.total} 人</caption><thead><tr><th>姓名／學校</th><th>Email</th><th>學習分鐘</th><th>六卷平均</th><th>完成時間</th><th>完成證明</th><th>微教案</th></tr></thead><tbody>${recordsResult.rows.length ? recordsResult.rows.map((row) => {
          let plan = null; try { plan = JSON.parse(row.lesson_plan_json); } catch (_) {}
          return `<tr><td><strong>${escapeHtml(row.name)}</strong><br>${escapeHtml(row.school)}</td><td>${escapeHtml(row.email)}</td><td>${Math.floor(row.active_seconds / 60)}</td><td>${row.final_score}</td><td>${dateTime(row.completed_at)}</td><td><a href="/verify.html?code=${encodeURIComponent(row.certificate_code)}">${escapeHtml(row.certificate_code)}</a></td><td>${plan ? `<details><summary>${escapeHtml(plan.title)}</summary><p><strong>對象：</strong>${escapeHtml(plan.audience)}</p><p><strong>目標：</strong>${escapeHtml(plan.objective)}</p><p><strong>活動：</strong>${escapeHtml(plan.activity)}</p><p><strong>評量：</strong>${escapeHtml(plan.assessment)}</p></details>` : "—"}</td></tr>`;
        }).join("") : `<tr><td colspan="7">目前沒有符合條件的完成紀錄。</td></tr>`}</tbody></table></div>`;
      document.querySelector("#record-search").addEventListener("submit", (event) => { event.preventDefault(); renderDashboard(new FormData(event.currentTarget).get("q").trim()); });
      document.querySelector("#logout").addEventListener("click", logout);
    } catch (error) {
      if (error.status === 401) renderLogin();
      else renderLogin(error.message);
    }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST", body: "{}" }).catch(() => {});
    renderLogin();
  }

  renderDashboard();
})();
