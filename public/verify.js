(() => {
  const form = document.querySelector("#verify-form");
  const result = document.querySelector("#verify-result");
  const input = document.querySelector("#certificate-code");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

  async function verify(code) {
    result.innerHTML = `<p class="alert">正在查驗⋯⋯</p>`;
    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "驗證失敗");
      const certificate = data.certificate;
      result.innerHTML = certificate.valid
        ? `<article class="verify-result valid"><p class="eyebrow">有效證書</p><h2>${escapeHtml(certificate.maskedName)}</h2><p>${escapeHtml(certificate.school)}</p><p>完成日期：${new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date(certificate.completedAt))}</p><p>證書編號：${escapeHtml(code.trim().toUpperCase())}</p></article>`
        : `<p class="alert error">查無有效證書。請核對編號是否完整。</p>`;
    } catch (error) {
      result.innerHTML = `<p class="alert error">${escapeHtml(error.message)}</p>`;
    }
  }

  form.addEventListener("submit", (event) => { event.preventDefault(); verify(input.value); });
  const code = new URLSearchParams(location.search).get("code");
  if (code) { input.value = code; verify(code); }
})();
