/**
 * Content script: capture question text from focused field / selection,
 * draft via background, optionally autofill.
 */

(function () {
  const PANEL_ID = "ims-tender-addin-panel";

  function nearestLabel(el) {
    if (!el) return "";
    if (el.getAttribute?.("aria-label")) return el.getAttribute("aria-label");
    if (el.getAttribute?.("placeholder")) return el.getAttribute("placeholder");
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab?.textContent) return lab.textContent.trim();
    }
    const wrap = el.closest("label, [role='group'], .form-group, .question, .field");
    if (wrap) {
      const lab = wrap.querySelector("label, legend, .question-text, .label, h1, h2, h3, h4");
      if (lab?.textContent) return lab.textContent.trim();
    }
    let prev = el.previousElementSibling;
    for (let i = 0; i < 4 && prev; i++) {
      const t = (prev.textContent || "").trim();
      if (t.length > 12) return t;
      prev = prev.previousElementSibling;
    }
    return "";
  }

  function captureQuestion() {
    const sel = window.getSelection()?.toString()?.trim();
    if (sel && sel.length >= 8) {
      return { question: sel, target: null, source: "selection" };
    }
    const el = document.activeElement;
    if (
      el &&
      (el.tagName === "TEXTAREA" ||
        el.tagName === "INPUT" ||
        el.isContentEditable)
    ) {
      const label = nearestLabel(el);
      const value = el.isContentEditable
        ? (el.textContent || "").trim()
        : String(el.value || "").trim();
      const question = label || value;
      return {
        question,
        target: el,
        source: label ? "label" : "value",
      };
    }
    return { question: "", target: null, source: "none" };
  }

  function parseWordLimit(text) {
    const m = String(text || "").match(
      /(?:max(?:imum)?|limit(?:ed)?(?: to)?|no more than)\s*(\d{1,4})\s*words?/i
    );
    return m ? Number(m[1]) : null;
  }

  function fillTarget(el, answer) {
    if (!el) return false;
    if (el.isContentEditable) {
      el.focus();
      el.textContent = answer;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return true;
    }
    if ("value" in el) {
      el.focus();
      el.value = answer;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.setAttribute("data-ims-tender", "1");
    Object.assign(panel.style, {
      position: "fixed",
      zIndex: "2147483646",
      right: "16px",
      bottom: "16px",
      width: "min(420px, calc(100vw - 32px))",
      maxHeight: "70vh",
      overflow: "auto",
      background: "#0f172a",
      color: "#f8fafc",
      borderRadius: "12px",
      boxShadow: "0 18px 50px rgba(15,23,42,0.45)",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: "13px",
      lineHeight: "1.45",
      padding: "14px 14px 12px",
    });
    document.documentElement.appendChild(panel);
    return panel;
  }

  function renderPanel(state) {
    const panel = ensurePanel();
    const { status, question, result, error, target } = state;
    const conf = result
      ? Math.round((result.confidence || 0) * 100)
      : null;
    const sources = (result?.sources || [])
      .slice(0, 4)
      .map(
        (s) =>
          `<li style="margin:0 0 4px;">${escapeHtml(s.kind)} · ${escapeHtml(
            s.label || s.id
          )}</li>`
      )
      .join("");

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px;">
        <strong style="font-size:14px;">iMS Tender Autopilot</strong>
        <button type="button" data-act="close" style="${btnGhost()}">Close</button>
      </div>
      <div style="opacity:.8;margin-bottom:8px;">${escapeHtml(
        status === "loading"
          ? "Drafting from your private library…"
          : status === "error"
            ? "Draft failed"
            : status === "done"
              ? result?.autofill
                ? "Ready to autofill (approved library match)"
                : "Draft ready — review before filling"
              : "Idle"
      )}</div>
      ${
        question
          ? `<div style="background:#1e293b;border-radius:8px;padding:8px 10px;margin-bottom:8px;"><div style="opacity:.65;font-size:11px;margin-bottom:4px;">Question</div>${escapeHtml(
              question.slice(0, 500)
            )}</div>`
          : ""
      }
      ${
        error
          ? `<div style="color:#fecaca;background:#7f1d1d;border-radius:8px;padding:8px 10px;margin-bottom:8px;">${escapeHtml(
              error
            )}</div>`
          : ""
      }
      ${
        result
          ? `<div style="background:#1e293b;border-radius:8px;padding:8px 10px;margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <span>Confidence ${conf}%</span>
                <span>${result.autofill ? "Autofill OK" : "Review"}</span>
              </div>
              <div style="white-space:pre-wrap;">${escapeHtml(
                result.answer || "(empty — needs input)"
              )}</div>
              ${
                sources
                  ? `<ul style="margin:8px 0 0;padding-left:18px;opacity:.85;">${sources}</ul>`
                  : ""
              }
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" data-act="fill" ${
                result.answer ? "" : "disabled"
              } style="${btnPrimary()}">Fill field</button>
              <button type="button" data-act="copy" ${
                result.answer ? "" : "disabled"
              } style="${btnGhost()}">Copy</button>
            </div>`
          : ""
      }
    `;

    panel.querySelector('[data-act="close"]')?.addEventListener("click", () => {
      panel.remove();
    });
    panel.querySelector('[data-act="copy"]')?.addEventListener("click", async () => {
      if (!result?.answer) return;
      try {
        await navigator.clipboard.writeText(result.answer);
      } catch {
        /* ignore */
      }
    });
    panel.querySelector('[data-act="fill"]')?.addEventListener("click", () => {
      if (!result?.answer) return;
      const ok = fillTarget(target || document.activeElement, result.answer);
      if (!ok) {
        renderPanel({
          ...state,
          error: "Could not fill the focused field. Copy the answer instead.",
        });
      }
    });
  }

  function btnPrimary() {
    return "border:0;background:#4f46e5;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:600;";
  }
  function btnGhost() {
    return "border:1px solid #334155;background:transparent;color:#e2e8f0;border-radius:8px;padding:6px 10px;cursor:pointer;";
  }
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function runDraft() {
    const captured = captureQuestion();
    if (!captured.question || captured.question.length < 8) {
      renderPanel({
        status: "error",
        question: "",
        result: null,
        error:
          "Select the question text or focus a response field with a nearby label, then try again.",
        target: null,
      });
      return;
    }

    const wordLimit = parseWordLimit(captured.question);
    renderPanel({
      status: "loading",
      question: captured.question,
      result: null,
      error: null,
      target: captured.target,
    });

    chrome.runtime.sendMessage(
      {
        type: "TENDER_DRAFT",
        question: captured.question,
        wordLimit,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          renderPanel({
            status: "error",
            question: captured.question,
            result: null,
            error: chrome.runtime.lastError.message,
            target: captured.target,
          });
          return;
        }
        if (!response?.ok) {
          renderPanel({
            status: "error",
            question: captured.question,
            result: null,
            error: response?.error || "Draft failed",
            target: captured.target,
          });
          return;
        }

        const result = response.data;
        renderPanel({
          status: "done",
          question: captured.question,
          result,
          error: null,
          target: captured.target,
        });

        // Spec: fill only when autofill is true (approved, in-date library answer)
        if (result?.autofill && result.answer && captured.target) {
          fillTarget(captured.target, result.answer);
        }
      }
    );
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "TENDER_DRAFT_FOCUSED") {
      void runDraft();
      sendResponse({ ok: true });
      return true;
    }
    if (message?.type === "TENDER_CAPTURE") {
      sendResponse({ ok: true, ...captureQuestion() });
      return true;
    }
    return false;
  });

  window.__imsTenderDraft = runDraft;
})();
