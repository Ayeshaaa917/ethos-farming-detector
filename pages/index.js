import { useState, useCallback, useRef, useEffect } from "react";
import Head from "next/head";

async function apiPost(path, body) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

function findMutualEdges(edges) {
  const set = new Set(edges.map((e) => `${e.from}→${e.to}`));
  return new Set(edges.filter((e) => set.has(`${e.to}→${e.from}`)).map((e) => `${e.from}→${e.to}`));
}

function NetworkGraph({ nodes, edges, center }) {
  if (nodes.length < 2) return null;
  const W = 300, H = 220, CX = W / 2, CY = H / 2;
  const others = nodes.filter((n) => n.id !== center);
  const R = Math.min(88, 20 + others.length * 10);
  const pos = { [center]: { x: CX, y: CY } };
  others.forEach((n, i) => {
    const a = (2 * Math.PI * i) / others.length - Math.PI / 2;
    pos[n.id] = { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  });
  const mutSet = findMutualEdges(edges);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <marker id="arr-one" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#4ade8055" /></marker>
        <marker id="arr-mut" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" /></marker>
        <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {edges.map((e, i) => {
        const f = pos[e.from], t = pos[e.to];
        if (!f || !t) return null;
        const isMut = mutSet.has(`${e.from}→${e.to}`);
        const dx = t.x - f.x, dy = t.y - f.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len, r = 13;
        return <line key={i} x1={f.x + ux * r} y1={f.y + uy * r} x2={t.x - ux * (r + 5)} y2={t.y - uy * (r + 5)} stroke={isMut ? "#f59e0b" : "#4ade8040"} strokeWidth={isMut ? 2 : 1} strokeDasharray={isMut ? "none" : "4 2"} markerEnd={isMut ? "url(#arr-mut)" : "url(#arr-one)"} />;
      })}
      {nodes.map((n) => {
        const p = pos[n.id]; if (!p) return null;
        const isC = n.id === center;
        return (
          <g key={n.id} transform={`translate(${p.x},${p.y})`}>
            <circle r={isC ? 16 : 12} fill={isC ? "#0a1a0a" : "#080f1e"} stroke={isC ? "#4ade80" : "#1e3a5f"} strokeWidth={isC ? 2 : 1} filter={isC ? "url(#glow)" : "none"} />
            <text textAnchor="middle" dy="0.35em" fontSize={isC ? 7 : 6} fill={isC ? "#4ade80" : "#3a5a7a"} fontFamily="monospace">{(n.label || n.id).slice(0, 9)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function RiskBadge({ level }) {
  const map = { CRITICAL: { color: "#ef4444", bg: "#1a0000", label: "⚠ CRITICAL" }, HIGH: { color: "#f97316", bg: "#1a0800", label: "▲ HIGH RISK" }, MEDIUM: { color: "#f59e0b", bg: "#1a1000", label: "◆ MEDIUM" }, LOW: { color: "#4ade80", bg: "#001a08", label: "~ LOW" }, CLEAN: { color: "#22d3ee", bg: "#00101a", label: "✓ CLEAN" } };
  const c = map[level] || map.CLEAN;
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}`, borderRadius: 4, padding: "3px 12px", fontFamily: "monospace", fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{c.label}</span>;
}

function LogLine({ msg, type }) {
  const color = type === "error" ? "#ef4444" : type === "warn" ? "#f59e0b" : type === "success" ? "#4ade80" : "#1e4060";
  return <div style={{ color, lineHeight: 1.8 }}>{msg}</div>;
}

function Section({ title, count, countColor, accent, children }) {
  return (
    <div style={{ background: "#070d1a", border: `1px solid ${accent || "#0d1e30"}`, borderRadius: 8, padding: "14px 18px", marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
        {title}{count > 0 && <span style={{ color: countColor, marginLeft: 8 }}>● {count} found</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ tag, tagColor, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: "1px solid #0d1e30" }}>
      <span style={{ background: tagColor + "18", color: tagColor, border: `1px solid ${tagColor}30`, borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{tag}</span>
      <div>{children}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ color: "#1a3050", fontSize: 13 }}>✓ {children}</div>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const logRef = useRef(null);
  const push = useCallback((msg, type = "info") => setLog((l) => [...l, { msg, type }]), []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const analyze = useCallback(async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true); setError(null); setResult(null); setLog([]);
    try {
      push(`🔍 Looking up: ${q}`);
      const { user } = await apiPost("/api/resolve", { query: q });
      const profileId = user.profileId ?? user.id;
      const displayName = user.displayName || user.username || `#${profileId}`;
      push(`✅ Found: ${displayName} (profileId: ${profileId}, score: ${user.score ?? "N/A"})`, "success");
      push("📊 Fetching reviews & vouches...");
      const [revData, vchData] = await Promise.all([apiPost("/api/reviews", { profileId }), apiPost("/api/vouches", { profileId })]);
      const { given: rGiven, received: rReceived } = revData;
      const { given: vGiven, received: vReceived } = vchData;
      push(`   → Reviews: ${rGiven.length} given, ${rReceived.length} received`);
      push(`   → Vouches: ${vGiven.length} given, ${vReceived.length} received`);
      push("🔬 Detecting review-for-review pairs...");
      const receiverSet = new Set(rReceived.map((r) => String(r.authorProfileId)).filter(Boolean));
      const mutualReviews = rGiven.filter((r) => r.subject?.profileId && receiverSet.has(String(r.subject.profileId))).map((r) => {
        const theirId = String(r.subject.profileId);
        const theirRev = rReceived.find((x) => String(x.authorProfileId) === theirId);
        return { with: theirId, withName: r.subject?.displayName || r.subject?.name || `#${theirId}`, myScore: r.score, theirScore: theirRev?.score };
      });
      push(`   → ${mutualReviews.length} mutual pair(s)`, mutualReviews.length ? "warn" : "info");
      push("🔺 Scanning for triangle rings...");
      const bIds = [...new Set(rGiven.map((r) => r.subject?.profileId).filter(Boolean).map(String).filter((id) => id !== String(profileId)))].slice(0, 12);
      const triangles = []; const seenTri = new Set();
      if (bIds.length > 0) {
        push(`   → Checking ${bIds.length} connected profiles...`);
        const bResults = await Promise.all(bIds.map((bid) => apiPost("/api/reviews-by", { profileId: parseInt(bid) }).then((d) => ({ bid, reviews: d.reviews })).catch(() => ({ bid, reviews: [] }))));
        for (const { bid, reviews } of bResults) {
          for (const cid of reviews.map((r) => String(r.subject?.profileId)).filter(Boolean)) {
            if (cid === String(profileId) || cid === bid) continue;
            if (receiverSet.has(cid)) {
              const key = [String(profileId), bid, cid].sort().join(",");
              if (!seenTri.has(key)) { seenTri.add(key); triangles.push({ a: String(profileId), b: bid, c: cid }); }
            }
          }
        }
      }
      push(`   → ${triangles.length} triangle(s)`, triangles.length ? "warn" : "info");
      push("💎 Checking vouch rings...");
      const vGivenSet = new Set(vGiven.map((v) => String(v.subjectProfileId)).filter(Boolean));
      const mutualVouchers = [...new Set(vReceived.map((v) => String(v.authorProfileId)).filter((id) => id && vGivenSet.has(id)))];
      push(`   → ${mutualVouchers.length} mutual vouch(es)`, mutualVouchers.length ? "warn" : "info");
      let risk = 0;
      if (triangles.length >= 3) risk += 50; else if (triangles.length >= 1) risk += 30;
      if (mutualReviews.length >= 5) risk += 30; else if (mutualReviews.length >= 2) risk += 15;
      if (mutualVouchers.length >= 3) risk += 20; else if (mutualVouchers.length >= 1) risk += 10;
      const riskLevel = risk >= 70 ? "CRITICAL" : risk >= 40 ? "HIGH" : risk >= 20 ? "MEDIUM" : risk >= 5 ? "LOW" : "CLEAN";
      push(`✅ Done — ${riskLevel} (${risk}/100)`, "success");
      const str = String(profileId);
      const graphNodes = [{ id: str, label: displayName }]; const graphEdges = [];
      for (const m of mutualReviews.slice(0, 8)) { if (!graphNodes.find((n) => n.id === m.with)) graphNodes.push({ id: m.with, label: m.withName }); graphEdges.push({ from: str, to: m.with }, { from: m.with, to: str }); }
      for (const t of triangles.slice(0, 4)) { for (const id of [t.b, t.c]) if (!graphNodes.find((n) => n.id === id)) graphNodes.push({ id, label: `#${id}` }); graphEdges.push({ from: t.a, to: t.b }, { from: t.b, to: t.c }, { from: t.c, to: t.a }); }
      setResult({ user, profileId: str, displayName, mutualReviews, triangles, mutualVouchers, riskScore: risk, riskLevel, stats: { rGiven: rGiven.length, rReceived: rReceived.length, vGiven: vGiven.length, vReceived: vReceived.length }, graph: { nodes: graphNodes, edges: graphEdges } });
    } catch (e) { setError(e.message); push(`❌ ${e.message}`, "error"); }
    finally { setLoading(false); }
  }, [query, loading, push]);

  const sc = (s) => s > 0 ? "#4ade80" : s < 0 ? "#ef4444" : "#64748b";
  const sl = (s) => s > 0 ? "👍 positive" : s < 0 ? "👎 negative" : "😐 neutral";
  const rd = { CLEAN: "No farming patterns — activity looks organic.", LOW: "Minor indicators. Could be coincidental.", MEDIUM: "Some suspicious patterns detected.", HIGH: "Multiple farming signals. Likely manipulation.", CRITICAL: "Strong farming evidence. High probability of ring activity." };

  return (
    <>
      <Head>
        <title>Ethos Farming Detector</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#030712;color:#e2e8f0;font-family:'IBM Plex Mono',monospace;min-height:100vh}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.pulse{animation:pulse 1.2s ease-in-out infinite}`}</style>
      <header style={{ background: "#050d1a", borderBottom: "1px solid #0d1e30", padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#4ade80,#22d3ee)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#030712" }}>◈</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", letterSpacing: 1 }}>ETHOS FARMING DETECTOR</div>
          <div style={{ fontSize: 10, color: "#1e3a5f", letterSpacing: 3, textTransform: "uppercase" }}>Review-ring · Triangle · Vouch-collusion analysis</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 10, color: "#0d2035" }}>api.ethos.network<br /><span style={{ color: "#4ade8044" }}>server-side ✓</span></div>
      </header>
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 18px" }}>
        <div style={{ display: "flex", gap: 8, background: "#070d1a", border: "1px solid #0d1e30", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          <input style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#4ade80", fontFamily: "inherit", fontSize: 14, padding: "6px 8px" }} placeholder="Enter profileId, 0x address, or @twitter username..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()} />
          <button onClick={analyze} disabled={loading} style={{ background: loading ? "#111c2a" : "#4ade80", color: loading ? "#1e3a5f" : "#030712", border: "none", borderRadius: 6, padding: "8px 22px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1 }}>
            {loading ? <span className="pulse">SCANNING…</span> : "ANALYZE →"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#1e3a5f", marginBottom: 24 }}>Examples: <span style={{ color: "#2a5a40" }}>1234</span> · <span style={{ color: "#2a5a40" }}>VitalikButerin</span> · <span style={{ color: "#2a5a40" }}>@OyewoleOyelade1</span></div>
        {error && <div style={{ background: "#0a0404", border: "1px solid #ef444433", borderRadius: 8, padding: "14px 18px", marginBottom: 14, color: "#ef4444", fontSize: 13 }}>❌ {error}</div>}
        {log.length > 0 && (
          <div style={{ background: "#070d1a", border: "1px solid #0d1e30", borderRadius: 8, padding: "14px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>Scan Log</div>
            <div ref={logRef} style={{ background: "#030712", border: "1px solid #0d1e30", borderRadius: 6, padding: "10px 12px", maxHeight: 180, overflowY: "auto", fontSize: 11 }}>
              {log.map((l, i) => <LogLine key={i} {...l} />)}
              {loading && <span className="pulse" style={{ color: "#4ade80" }}>▌</span>}
            </div>
          </div>
        )}
        {result && (
          <>
            <div style={{ background: "#070d1a", border: "1px solid #1a3050", borderRadius: 8, padding: "16px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{result.displayName}</div>
                <div style={{ fontSize: 11, color: "#2a4a6a", marginTop: 3 }}>profileId: {result.profileId} · Score: {result.user.score ?? "N/A"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#1a3050", letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>Farming Risk</div>
                <RiskBadge level={result.riskLevel} />
                <div style={{ fontSize: 11, color: "#1a3050", marginTop: 4 }}>{result.riskScore}/100</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
              {[["Reviews Given", result.stats.rGiven, "#4ade80"], ["Reviews Received", result.stats.rReceived, "#4ade80"], ["Vouches Given", result.stats.vGiven, "#22d3ee"], ["Vouches Received", result.stats.vReceived, "#22d3ee"]].map(([l, v, c]) => (
                <div key={l} style={{ background: "#060b18", border: "1px solid #0d1e30", borderRadius: 6, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#1a3050", letterSpacing: 2, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 26, color: c, fontWeight: 700, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: result.graph.nodes.length > 1 ? "1fr 300px" : "1fr", gap: 14, alignItems: "start" }}>
              <div>
                <Section title="Review-for-Review Pairs" count={result.mutualReviews.length} countColor="#f59e0b" accent={result.mutualReviews.length ? "#f59e0b22" : undefined}>
                  {result.mutualReviews.length === 0 ? <Empty>None detected.</Empty> : result.mutualReviews.map((m, i) => (
                    <Row key={i} tag="MUTUAL" tagColor="#f59e0b">
                      <div style={{ fontSize: 13, color: "#c0d0e0" }}>↔ {m.withName} <span style={{ color: "#1e3a5f" }}>#{m.with}</span></div>
                      <div style={{ fontSize: 11, color: "#1e3a5f", marginTop: 2 }}>You: <span style={{ color: sc(m.myScore) }}>{sl(m.myScore)}</span> · Them: <span style={{ color: sc(m.theirScore) }}>{sl(m.theirScore)}</span></div>
                    </Row>
                  ))}
                </Section>
                <Section title="Triangle Patterns A→B→C→A" count={result.triangles.length} countColor="#ef4444" accent={result.triangles.length ? "#ef444422" : undefined}>
                  {result.triangles.length === 0 ? <Empty>None detected.</Empty> : result.triangles.map((t, i) => (
                    <Row key={i} tag="△ RING" tagColor="#ef4444">
                      <div style={{ fontSize: 13, color: "#c0d0e0" }}>#{t.a} <span style={{ color: "#ef4444" }}>→</span> #{t.b} <span style={{ color: "#ef4444" }}>→</span> #{t.c} <span style={{ color: "#ef4444" }}>→</span> #{t.a}</div>
                    </Row>
                  ))}
                </Section>
                <Section title="Mutual Vouch Rings" count={result.mutualVouchers.length} countColor="#a78bfa" accent={result.mutualVouchers.length ? "#a78bfa22" : undefined}>
                  {result.mutualVouchers.length === 0 ? <Empty>None detected.</Empty> : result.mutualVouchers.slice(0, 12).map((id, i) => (
                    <Row key={i} tag="VOUCH" tagColor="#a78bfa"><div style={{ fontSize: 13, color: "#c0d0e0" }}>↔ profileId <span style={{ color: "#a78bfa" }}>#{id}</span></div></Row>
                  ))}
                </Section>
              </div>
              {result.graph.nodes.length > 1 && (
                <div style={{ background: "#070d1a", border: "1px solid #0d1e30", borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Relationship Graph</div>
                  <NetworkGraph nodes={result.graph.nodes} edges={result.graph.edges} center={result.profileId} />
                  <div style={{ fontSize: 10, color: "#0d2035", marginTop: 8, lineHeight: 2 }}><span style={{ color: "#f59e0b" }}>━</span> mutual · <span style={{ color: "#4ade8040" }}>╌</span> one-way</div>
                </div>
              )}
            </div>
            <div style={{ background: "#070d1a", border: `1px solid ${{ CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#4ade80", CLEAN: "#22d3ee" }[result.riskLevel]}44`, borderRadius: 8, padding: "16px 18px", marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Verdict</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <RiskBadge level={result.riskLevel} />
                <div style={{ fontSize: 13, color: "#4a6a88" }}>{rd[result.riskLevel]}</div>
              </div>
              <div style={{ fontSize: 10, color: "#0d2035", marginTop: 14, borderTop: "1px solid #0d1e30", paddingTop: 10 }}>Scoring: triangles ×50 | mutual reviews ×30 | mutual vouches ×20 · Probabilistic, not legal proof.</div>
            </div>
          </>
        )}
        {!result && !loading && log.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16, color: "#0d2035" }}>◈</div>
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: "uppercase", color: "#0d2035" }}>Enter any Ethos profile to begin</div>
            <div style={{ fontSize: 11, marginTop: 8, color: "#07121e" }}>Detects review-for-review · triangle rings · vouch collusion</div>
          </div>
        )}
      </main>
    </>
  );
}
