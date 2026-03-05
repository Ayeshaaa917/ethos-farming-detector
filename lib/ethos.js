const API_BASE = "https://api.ethos.network";
const CLIENT = "ethos-farming-detector@1.0.0";

export async function ethosPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "X-Ethos-Client": CLIENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ethos API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}
