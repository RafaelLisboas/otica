async function apiGet(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error("Falha ao carregar dados.");
  }
  return response.json();
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Falha ao salvar dados.");
  }
  return data;
}
