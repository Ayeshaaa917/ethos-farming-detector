import { ethosPost } from "../../lib/ethos";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query required" });
  const q = query.trim().replace(/^@/, "");
  try {
    let user = null;
    if (/^\d+$/.test(q)) {
      const data = await ethosPost("/api/v2/users/by/profile-id", { profileIds: [parseInt(q)] });
      user = Array.isArray(data) ? data[0] : data?.values?.[0];
    }
    if (!user && /^0x[a-fA-F0-9]{40}$/.test(q)) {
      const data = await ethosPost("/api/v2/users/by/address", { addresses: [q] });
      user = Array.isArray(data) ? data[0] : data?.values?.[0];
    }
    if (!user) {
      const data = await ethosPost("/api/v2/users/by/x", { accountIdsOrUsernames: [q] });
      if (data?.users?.length > 0) user = data.users[0].user ?? data.users[0];
    }
    if (!user) return res.status(404).json({ error: `User "${q}" not found on Ethos.` });
    return res.status(200).json({ user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
