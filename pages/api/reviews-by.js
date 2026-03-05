import { ethosPost } from "../../lib/ethos";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });
  try {
    const data = await ethosPost("/api/v1/reviews", { authorProfileIds: [profileId], limit: 50, offset: 0 });
    return res.status(200).json({ reviews: data?.data?.values ?? data?.values ?? [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
