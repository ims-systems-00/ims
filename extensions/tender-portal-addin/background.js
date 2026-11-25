/**
 * Service worker: draft against /tender/draft and relay fill commands.
 */

async function getSettings() {
  const stored = await chrome.storage.sync.get({
    apiBase: "",
    accessToken: "",
    orgId: "",
  });
  return {
    apiBase: String(stored.apiBase || "").replace(/\/$/, ""),
    accessToken: String(stored.accessToken || "").trim(),
    orgId: String(stored.orgId || "").trim(),
  };
}

async function draftAnswer(question, wordLimit) {
  const settings = await getSettings();
  if (!settings.apiBase) {
    throw new Error("Set the API base URL in the extension options.");
  }
  if (!settings.accessToken) {
    throw new Error("Paste an access token in the extension options.");
  }
  if (!settings.orgId) {
    throw new Error("Set the organisation ID (x-org-id) in the options.");
  }

  const res = await fetch(`${settings.apiBase}/tender/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.accessToken}`,
      "x-org-id": settings.orgId,
    },
    body: JSON.stringify({
      question,
      wordLimit: wordLimit || undefined,
    }),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      `Draft failed (${res.status})`;
    throw new Error(msg);
  }

  return payload?.data ?? payload;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TENDER_DRAFT") {
    draftAnswer(message.question, message.wordLimit)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    return true;
  }
  return false;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "draft-focused") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TENDER_DRAFT_FOCUSED" });
  } catch {
    /* content script may not be ready */
  }
});
