const API_BASE = import.meta.env.VITE_API_URL || "";

export async function startScan(url) {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to start scan");
  }
  return res.json();
}

export async function getScanProgress(jobId) {
  const res = await fetch(`${API_BASE}/api/scan/${jobId}/progress`);
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

export async function getReport(id) {
  const res = await fetch(`${API_BASE}/api/reports/${id}`);
  if (!res.ok) throw new Error("Report not found");
  return res.json();
}

export async function listReports() {
  const res = await fetch(`${API_BASE}/api/reports`);
  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
}
