const form = document.getElementById("form");
const saved = document.getElementById("saved");

chrome.storage.sync.get(
  { apiBase: "", accessToken: "", orgId: "" },
  (data) => {
    document.getElementById("apiBase").value = data.apiBase || "";
    document.getElementById("accessToken").value = data.accessToken || "";
    document.getElementById("orgId").value = data.orgId || "";
  }
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiBase = document.getElementById("apiBase").value.trim().replace(/\/$/, "");
  const accessToken = document.getElementById("accessToken").value.trim();
  const orgId = document.getElementById("orgId").value.trim();
  await chrome.storage.sync.set({ apiBase, accessToken, orgId });
  saved.hidden = false;
  window.setTimeout(() => {
    saved.hidden = true;
  }, 1600);
});
