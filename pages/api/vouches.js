export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });
  try {
    const API = "https://api.ethos.network";
    const H = { "X-Ethos-Client": "ethos-farming-detector@1.0.0", "Content-Type": "application/json" };
    const [g, r] = await Promise.all([
      fetch(`${API}/api/v1/vouches`, { method: "POST", headers: H, body: JSON.stringify({ authorProfileIds: [profileId], limit: 100, archived: false }) }).then(x => x.json()),
      fetch(`${API}/api/v1/vouches`, { method: "POST", headers: H, body: JSON.stringify({ subjectProfileIds: [profileId], limit: 100, archived: false }) }).then(x => x.json()),
    ]);
    const given = g?.data?.values ?? g?.values ?? g?.data ?? [];
    const received = r?.data?.values ?? r?.values ?? r?.data ?? [];
    return res.status(200).json({ given, received });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
