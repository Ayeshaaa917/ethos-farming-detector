export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });
  try {
    const API = "https://api.ethos.network";
    const H = { "X-Ethos-Client": "ethos-farming-detector@1.0.0" };
    const data = await fetch(`${API}/api/v2/reviews?authorProfileId=${profileId}&limit=50`, { headers: H }).then(x => x.json());
    const reviews = data?.data?.values ?? data?.values ?? data?.data ?? [];
    return res.status(200).json({ reviews });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
