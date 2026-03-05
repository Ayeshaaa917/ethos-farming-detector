import { ethosPost } from "../../lib/ethos";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });
  try {
    const [g, r] = await Promise.all([
      ethosPost("/api/v1/vouches", { authorProfileIds: [profileId], limit: 100, archived: false }),
      ethosPost("/api/v1/vouches", { subjectProfileIds: [profileId], limit: 100, archived: false }),
    ]);
    return res.status(200).json({ given: g?.data?.values ?? g?.values ?? [], received: r?.data?.values ?? r?.values ?? [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
```
3. Commit it

---

## Step 6 — Create `pages/index.js`

1. Name: `pages/index.js`
2. Go back to my previous message and paste the big `pages/index.js` code block
3. Commit it

---

## Step 7 — Redeploy on Vercel

Once all files are added, go to Vercel → your project → **Deployments** → click **"..."** → **"Redeploy"** ✅

After each file you create, your repo should look like this at the end:
```
lib/ethos.js         ✅ already there
pages/_app.js        ← adding now
pages/index.js       ← adding now
pages/api/resolve.js    ← adding now
pages/api/reviews.js    ← adding now
pages/api/reviews-by.js ← adding now
pages/api/vouches.js    ← adding now
package.json         ✅ already there
next.config.js       ✅ already there
vercel.json          ✅ already there
