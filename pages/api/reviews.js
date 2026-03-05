export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });
  try {
    const API = "https://api.ethos.network";
    const H = { "X-Ethos-Client": "ethos-farming-detector@1.0.0" };

    const [gRaw, rRaw] = await Promise.all([
      fetch(`${API}/api/v2/reviews?authorProfileId=${profileId}&limit=100`, { headers: H }).then(x => x.json()),
      fetch(`${API}/api/v2/reviews?subjectProfileId=${profileId}&limit=100`, { headers: H }).then(x => x.json()),
    ]);

    // Log raw response so we can see the structure
    console.log("REVIEWS GIVEN RAW:", JSON.stringify(gRaw).slice(0, 300));
    console.log("REVIEWS RECEIVED RAW:", JSON.stringify(rRaw).slice(0, 300));

    const extract = (d) => {
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.values)) return d.values;
      if (Array.isArray(d?.data)) return d.data;
      if (Array.isArray(d?.data?.values)) return d.data.values;
      if (Array.isArray(d?.reviews)) return d.reviews;
      if (d?.data && typeof d.data === "object") {
        const inner = Object.values(d.data).find(v => Array.isArray(v));
        if (inner) return inner;
      }
      return [];
    };

    return res.status(200).json({ given: extract(gRaw), received: extract(rRaw), _debug: { gKeys: Object.keys(gRaw || {}), rKeys: Object.keys(rRaw || {}) } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
