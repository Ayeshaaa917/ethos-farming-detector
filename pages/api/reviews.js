import { ethosPost } from "../../lib/ethos";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });
  try {
    const [g, r] = await Promise.all([
      ethosPost("/api/v1/reviews", { authorProfileIds: [profileId], limit: 100, offset: 0 }),
      ethosPost("/api/v1/reviews", { subjectProfileIds: [profileId], limit: 100, offset: 0 }),
    ]);
    return res.status(200).json({ given: g?.data?.values ?? g?.values ?? [], received: r?.data?.values ?? r?.values ?? [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
