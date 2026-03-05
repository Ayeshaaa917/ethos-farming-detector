import { ethosPost } from "../../lib/ethos";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });
  try {
    const [givenRes, receivedRes] = await Promise.all([
      ethosPost("/api/v1/vouches", { authorProfileIds: [profileId], limit: 100, archived: false }),
      ethosPost("/api/v1/vouches", { subjectProfileIds: [profileId], limit: 100, archived: false }),
    ]);
    const given = givenRes?.data?.values ?? givenRes?.values ?? [];
    const received = receivedRes?.data?.values ?? receivedRes?.values ?? [];
    return res.status(200).json({ given, received });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
