const statusEl = document.getElementById("status");
const draftBtn = document.getElementById("draftBtn");
const optionsBtn = document.getElementById("optionsBtn");

function setStatus(text, isError) {
  statusEl.hidden = !text;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("error", Boolean(isError));
}

draftBtn.addEventListener("click", async () => {
  setStatus("Drafting…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");
    await chrome.tabs.sendMessage(tab.id, { type: "TENDER_DRAFT_FOCUSED" });
    setStatus("Draft panel opened on the page.");
  } catch (err) {
    setStatus(
      err instanceof Error
        ? err.message
        : "Reload the portal page, then try again.",
      true
    );
  }
});

optionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
