import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const PURPLE       = "#6c5ce7";
const PURPLE_LIGHT = "#f0eeff";
const BORDER       = "#e8e8ec";
const MUTED        = "#888";
const RED          = "#e53935";
const GREEN        = "#16a34a";

const MONTHS    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
//const YEARS     = Array.from({ length: 6 }, (_, i) => 2020 + i);
const BTC_STEPS = [50000, 68762, 100000, 150000, 200000, 300000, 500000];

const CURRENCIES: Record<string, { sym: string; rate: number | null }> = {
  USD: { sym: "$",  rate: 1    },
  EUR: { sym: "€",  rate: 0.91 },
  BTC: { sym: "₿",  rate: null },
};

// ─── Static demo data — replace with real API response in production ──────────
const DEMO_DATA = {
  startMonth:  1,
  startYear:   2024,
  machineCost: 45000,
  energyCost:  8910,
  btcEarned:   0.15387057,
  watcherUrls: ["https://www.f2pool.com/mining-user/demo-user?access_key=abc123"],
  btcLive:     68762,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  startMonth:  number;
  startYear:   number;
  machineCost: number;
  energyCost:  number;
  btcEarned:   number;
  watcherUrls: string[];
  btcLive:     number;
}

// interface F2PoolInfo {
//   username: string;
//   paid:     number;
//   unpaid:   number;
//   total:    number;
// }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const daysBetween = (m: number, y: number) =>
  Math.max(1, Math.round((Date.now() - new Date(y, m - 1, 1).getTime()) / 86_400_000));

const monthsBetween = (m: number, y: number) => {
  const n = new Date();
  return Math.max(1, (n.getFullYear() - y) * 12 + (n.getMonth() + 1 - m));
};

const monthLabel = (m: number, y: number, add: number) => {
  const d = new Date(y, m - 1 + add);
  return MONTHS[d.getMonth()] + " '" + String(d.getFullYear()).slice(2);
};

// ─── F2Pool fetch helpers (used by SetupScreen — preserved for later use) ─────
// function parseF2PoolUrl(url: string): { username: string; accessKey: string } | null {
//   try {
//     const u = new URL(url);
//     if (!u.hostname.includes("f2pool.com")) return null;
//     const parts     = u.pathname.replace(/\/$/, "").split("/");
//     const username  = parts[parts.length - 1];
//     const accessKey = u.searchParams.get("access_key") || u.searchParams.get("accesskey") || "";
//     if (!username || username.length < 2) return null;
//     return { username, accessKey };
//   } catch { return null; }
// }

// async function fetchF2PoolBtc(url: string): Promise<F2PoolInfo> {
//   const parsed = parseF2PoolUrl(url);
//   if (!parsed) throw new Error("Not a valid F2Pool URL");
//   const { username, accessKey } = parsed;
//   const apiUrl = `https://api.f2pool.com/bitcoin/${username}${accessKey ? "?access_key=" + accessKey : ""}`;
//   const res    = await fetch(apiUrl);
//   if (!res.ok) throw new Error(`API error ${res.status}`);
//   const data   = await res.json();
//   const paid   = parseFloat(data.paid_mining_earnings ?? data.total_paid ?? 0);
//   const unpaid = parseFloat(data.unpaid_balance       ?? data.balance    ?? 0);
//   return { username, paid, unpaid, total: paid + unpaid };
// }

// ═══════════════════════════════════════════════════════════════════════════════
// LOADER SCREEN
// 0 – 2 s  →  "Fetching user info…"
// 2 – 5 s  →  "Fetching Bitcoin earned from watcher link…"
// 5 s      →  fade out → onComplete()
// ═══════════════════════════════════════════════════════════════════════════════
type LoadStep = "userInfo" | "watcher" | "done";

function LoaderScreen({ onComplete }: { onComplete: () => void }) {
  const [step,     setStep]     = useState<LoadStep>("userInfo");
  const [progress, setProgress] = useState(0);
  const [fadeOut,  setFadeOut]  = useState(false);

  useEffect(() => {
    const TOTAL = 5000;
    const STEP1 = 2000;
    const start = Date.now();

    // Smooth progress ticker (every 30 ms)
    const ticker = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / TOTAL) * 100, 100));
    }, 30);

    // Switch to watcher message at 2 s
    const t1 = setTimeout(() => setStep("watcher"), STEP1);

    // Finish at 5 s → fade → onComplete
    const t2 = setTimeout(() => {
      clearInterval(ticker);
      setProgress(100);
      setStep("done");
      setFadeOut(true);
      setTimeout(onComplete, 550);
    }, TOTAL);

    return () => { clearInterval(ticker); clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  const messages: Record<LoadStep, { heading: string; sub: string }> = {
    userInfo: {
      heading: "Fetching user info…",
      sub:     "Loading your account · machines · investment data",
    },
    watcher: {
      heading: "Fetching Bitcoin earned from watcher link…",
      sub:     "Connecting to F2Pool · reading mined BTC & live hashrate",
    },
    done: {
      heading: "All done!",
      sub:     "Launching your dashboard",
    },
  };

  const msg = messages[step];

  return (
    <div style={{
      minHeight: "100vh", background: "#ebebed",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: fadeOut ? 0 : 1, transition: "opacity .55s ease",
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px", textAlign: "center" }}>

        {/* ── Logo ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 52 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, background: PURPLE,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 24,
            boxShadow: `0 6px 24px ${PURPLE}44`,
          }}>B</div>
          <span style={{ fontSize: 23, fontWeight: 700 }}>
            <span style={{ color: PURPLE }}>Mining</span>Dashboard
          </span>
        </div>

        {/* ── SVG ring ── */}
        <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 32px" }}>
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="44" cy="44" r="38" fill="none" stroke="#e0e0e8" strokeWidth="5" />
            <circle
              cx="44" cy="44" r="38"
              fill="none" stroke={PURPLE} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 38}`}
              strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.05s linear" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 800, color: PURPLE,
          }}>
            {Math.round(progress)}%
          </div>
        </div>

        {/* ── Message ── */}
        <div style={{
          fontSize: 17, fontWeight: 700, color: "#1a1a2e",
          marginBottom: 10, minHeight: 26, letterSpacing: "-0.01em",
          transition: "opacity .25s",
        }}>
          {msg.heading}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 38, lineHeight: 1.6, minHeight: 40 }}>
          {msg.sub}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ background: "#e0e0e8", borderRadius: 99, height: 5, overflow: "hidden", marginBottom: 16 }}>
          <div style={{
            height: "100%", borderRadius: 99, background: PURPLE,
            width: `${progress}%`, transition: "width 0.05s linear",
          }} />
        </div>

        {/* ── Step indicator dots ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {(["userInfo", "watcher"] as LoadStep[]).map((s, i) => {
            const isActive  = step === s;
            const isPast    = (step === "watcher" && i === 0) || step === "done";
            return (
              <div key={s} style={{
                height: 8,
                width: isActive ? 22 : 8,
                borderRadius: 99,
                background: isActive || isPast ? PURPLE : "#d8d8e0",
                transition: "all .3s ease",
              }} />
            );
          })}
        </div>

        {/* ── Step labels ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 10, letterSpacing: "0.06em", color: MUTED }}>
       <span style={{ color: step === "userInfo" ? PURPLE : "#16a34a", fontWeight: 600, transition: "color .3s" }}>
  {step === "userInfo" ? "USER INFO" : "✓ USER INFO"}
</span>
          <span style={{ color: step === "watcher" ? PURPLE : step === "done" ? "#16a34a" : MUTED, fontWeight: step === "watcher" || step === "done" ? 600 : 400, transition: "color .3s" }}>
            {step === "done" ? "✓ WATCHER LINK" : "WATCHER LINK"}
          </span>
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP SCREEN — commented out, all logic preserved. To re-enable:
//   1. Uncomment this entire block
//   2. In App(), change initial state to "setup"
//   3. Render <SetupScreen onLoad={...} /> when screen === "setup"
// ═══════════════════════════════════════════════════════════════════════════════

/*
const DEMO_FORM = {
  startMonth:  "1",
  startYear:   "2024",
  machineCost: "45000",
  energyCost:  "8910",
  extraBtc:    "0.15387057",
};

function SetupScreen({ onLoad }: { onLoad: (d: DashboardData) => void }) {
  const [form, setForm] = useState({
    startMonth:   DEMO_FORM.startMonth,
    startYear:    DEMO_FORM.startYear,
    machineCost:  DEMO_FORM.machineCost,
    energyCost:   DEMO_FORM.energyCost,
    extraBtc:     DEMO_FORM.extraBtc,
    watcherInput: "",
    watcherLinks: [] as string[],
  });

  const [fetchState, setFetchState] = useState<Record<string, "loading" | "ok" | "error">>({});
  const [fetchInfo,  setFetchInfo]  = useState<Record<string, F2PoolInfo>>({});
  const [fetchErr,   setFetchErr]   = useState<Record<string, string>>({});

  const upd = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const addWatcher = async () => {
    const raw = form.watcherInput.trim();
    if (!raw) return;
    setForm(p => ({ ...p, watcherLinks: [...p.watcherLinks, raw], watcherInput: "" }));
    if (parseF2PoolUrl(raw)) {
      setFetchState(s => ({ ...s, [raw]: "loading" }));
      try {
        const info = await fetchF2PoolBtc(raw);
        setFetchState(s => ({ ...s, [raw]: "ok" }));
        setFetchInfo(s  => ({ ...s, [raw]: info }));
        setForm(p => ({ ...p, extraBtc: info.total.toFixed(8) }));
      } catch (e: any) {
        setFetchState(s => ({ ...s, [raw]: "error" }));
        setFetchErr(s   => ({ ...s, [raw]: e.message }));
      }
    }
  };

  const removeWatcher = (i: number) =>
    setForm(p => ({ ...p, watcherLinks: p.watcherLinks.filter((_, j) => j !== i) }));

  const totalBtcFromWatchers = Object.values(fetchInfo).reduce((s, v) => s + v.total, 0);

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: `1px solid ${BORDER}`,
    borderRadius: 9, fontSize: 14, outline: "none", background: "#fafafa",
    transition: "border .15s", color: "#1a1a2e", fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#ebebed", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "36px 40px", width: "100%", maxWidth: 500, boxShadow: "0 4px 32px rgba(0,0,0,.10)" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>B</div>
          <span style={{ fontSize: 17, fontWeight: 700 }}><span style={{ color: PURPLE }}>Mining</span>Dashboard</span>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Set up your dashboard</h2>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 26, lineHeight: 1.5 }}>
          Fields are prefilled with demo values. Add your F2Pool watcher link and BTC earned will be fetched automatically.
        </p>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Mining start date</span>
            <span style={{ fontSize: 11, color: MUTED }}>month of your first miner</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.startMonth} onChange={e => upd("startMonth", e.target.value)} style={inp}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={form.startYear} onChange={e => upd("startYear", e.target.value)} style={inp}>
              <option value="">Year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {[
          { key: "machineCost", label: "Total investment",     hint: "purchase price of all miners (USD)", placeholder: "e.g. 5000" },
          { key: "energyCost",  label: "Energy costs to date", hint: "total in dollars",                   placeholder: "e.g. 350"  },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{f.hint}</span>
            </div>
            <input
              type="number" placeholder={f.placeholder}
              value={(form as any)[f.key]} onChange={e => upd(f.key, e.target.value)}
              style={inp}
              onFocus={e => (e.target.style.borderColor = PURPLE)}
              onBlur={e  => (e.target.style.borderColor = BORDER)}
            />
          </div>
        ))}

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>BTC earned</span>
            <span style={{ fontSize: 11, color: MUTED }}>
              {totalBtcFromWatchers > 0
                ? `auto-fetched from ${Object.keys(fetchInfo).length} watcher(s)`
                : "fetched from watcher link or enter manually"}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="number" step="0.0001" placeholder="e.g. 0.15387057"
              value={form.extraBtc} onChange={e => upd("extraBtc", e.target.value)}
              style={{ ...inp, paddingRight: totalBtcFromWatchers > 0 ? "110px" : "14px" }}
              onFocus={e => (e.target.style.borderColor = PURPLE)}
              onBlur={e  => (e.target.style.borderColor = BORDER)}
            />
            {totalBtcFromWatchers > 0 && (
              <span style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 11, fontWeight: 600, color: GREEN, background: "#f0fdf4",
                padding: "2px 8px", borderRadius: 20, pointerEvents: "none",
              }}>✓ from F2Pool</span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>F2Pool watcher link</span>
            <span style={{ fontSize: 11, color: MUTED }}>BTC earned auto-fetched</span>
          </div>

          {form.watcherLinks.length === 0 && (
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>No links added yet.</p>
          )}

          {form.watcherLinks.map((l, i) => {
            const st   = fetchState[l];
            const info = fetchInfo[l];
            const err  = fetchErr[l];
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, padding: "8px 12px", background: "#f5f5f7", borderRadius: 8, fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>
                  <button onClick={() => removeWatcher(i)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#fef2f2", color: RED, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                </div>
                {st === "loading" && <div style={{ fontSize: 11, color: PURPLE, marginTop: 4, paddingLeft: 4 }}>⏳ Fetching BTC from F2Pool…</div>}
                {st === "ok" && info && (
                  <div style={{ fontSize: 11, color: GREEN, marginTop: 4, paddingLeft: 4 }}>
                    ✓ {info.username}: {info.paid.toFixed(8)} paid + {info.unpaid.toFixed(8)} pending = {info.total.toFixed(8)} BTC
                  </div>
                )}
                {st === "error" && (
                  <div style={{ fontSize: 11, color: RED, marginTop: 4, paddingLeft: 4 }}>
                    ⚠ Could not fetch: {err}. Edit the BTC field manually if needed.
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              placeholder="https://www.f2pool.com/mining-user/username?access_key=…"
              value={form.watcherInput} onChange={e => upd("watcherInput", e.target.value)}
              onKeyDown={e => e.key === "Enter" && addWatcher()}
              style={{ ...inp, flex: 1, fontSize: 12, width: "auto" }}
              onFocus={e => (e.target.style.borderColor = PURPLE)}
              onBlur={e  => (e.target.style.borderColor = BORDER)}
            />
            <button onClick={addWatcher} style={{
              padding: "10px 16px", borderRadius: 9, background: "#fff",
              border: `1.5px solid ${PURPLE}`, color: PURPLE, fontWeight: 700,
              fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
            }}>+ Add</button>
          </div>
        </div>

        <button
          onClick={() => onLoad({
            startMonth:  parseInt(form.startMonth)    || 1,
            startYear:   parseInt(form.startYear)     || 2024,
            machineCost: parseFloat(form.machineCost) || 45000,
            energyCost:  parseFloat(form.energyCost)  || 8910,
            btcEarned:   parseFloat(form.extraBtc)    || 0.15387057,
            watcherUrls: form.watcherLinks.length ? form.watcherLinks : ["https://www.f2pool.com/mining-user/demo"],
            btcLive:     68762,
          })}
          style={{
            width: "100%", padding: "13px", borderRadius: 10, background: PURPLE,
            color: "#fff", fontSize: 15, fontWeight: 700, border: "none",
            cursor: "pointer", fontFamily: "inherit", transition: "background .15s",
          }}
        >
          Load Dashboard
        </button>
      </div>
    </div>
  );
}
*/

// ─── Shared UI components ─────────────────────────────────────────────────────
const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", ...style }}>
    {children}
  </div>
);

const Pill = ({ active, onClick, children, danger }: {
  active: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean;
}) => (
  <button onClick={onClick} style={{
    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    fontFamily: "inherit", border: "none", cursor: "pointer", transition: "all .15s",
    background: active ? (danger ? RED : PURPLE) : (danger ? "#fef2f2" : PURPLE_LIGHT),
    color: active ? "#fff" : (danger ? RED : PURPLE),
  }}>{children}</button>
);

const NavBtn = ({ children, onClick, danger }: {
  children: React.ReactNode; onClick?: () => void; danger?: boolean;
}) => (
  <button onClick={onClick} style={{
    padding: "5px 13px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    fontFamily: "inherit", cursor: "pointer", transition: "all .15s",
    background: danger ? "transparent" : "#f5f5f7",
    color: danger ? RED : "#444",
    border: danger ? `1px solid #fecaca` : "none",
    display: "flex", alignItems: "center", gap: 5,
  }}>{children}</button>
);

const ChartTooltip = ({ active, payload, label, sym }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}>
      <div style={{ color: MUTED, marginBottom: 5, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {p.value >= 0 ? "+" : "-"}{sym}{Math.abs(Math.round(p.value)).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ data, onReset }: { data: DashboardData; onReset: () => void }) {
  const [cur, setCur]                     = useState("USD");
  const [scenarioPrice, setScenarioPrice] = useState(data.btcLive);
  const [showPerf,   setShowPerf]         = useState(true);
  const [showMiners, setShowMiners]       = useState(true);
  const [energyInput, setEnergyInput]     = useState("");
  const [extraEnergy, setExtraEnergy]     = useState(0);
  const [entered, setEntered]             = useState(false);

  useEffect(() => { setTimeout(() => setEntered(true), 50); }, []);

  const C = CURRENCIES[cur]; const S = C.sym; const R = C.rate ?? 1;

  const fmt    = (usd: number) => cur === "BTC" ? (usd / data.btcLive).toFixed(6) + " ₿" : S + Math.round(usd * R).toLocaleString();
  const fmtBTC = (btc: number) => btc.toFixed(8) + " BTC";

  const totalEnergy   = data.energyCost + extraEnergy;
  const totalInvested = data.machineCost + totalEnergy;
  const earnedUSD     = data.btcEarned * data.btcLive;
  const pl            = earnedUSD - totalInvested;
  const pctBack       = totalInvested > 0 ? (earnedUSD / totalInvested) * 100 : 0;
  const days          = daysBetween(data.startMonth, data.startYear);
  const months        = monthsBetween(data.startMonth, data.startYear);
  const btcPerDay     = data.btcEarned / days;
  const energyPerDay  = totalEnergy / days;

  const dailyAtCurrent  = btcPerDay * data.btcLive - energyPerDay;
  const dailyAtScenario = btcPerDay * scenarioPrice - energyPerDay;
  const scenarioPL      = data.btcEarned * scenarioPrice - totalInvested;

  const daysToBreakEven = dailyAtCurrent > 0 ? Math.ceil(-pl / dailyAtCurrent) : Infinity;
  const beDate  = new Date(); beDate.setDate(beDate.getDate() + daysToBreakEven);
  const beLabel = daysToBreakEven === Infinity ? "never" : MONTHS[beDate.getMonth()] + " " + beDate.getFullYear();

  const totalMonths = months + 12;
  const chartData = Array.from({ length: totalMonths }, (_, i) => {
    const el = Math.min(i * 30, days), b = btcPerDay * el, e = energyPerDay * el;
    return {
      m:        monthLabel(data.startMonth, data.startYear, i),
      pl:       (b * data.btcLive - data.machineCost - e) * R,
      scenario: (b * scenarioPrice - data.machineCost - e) * R,
    };
  });

  const kpis = [
    { l: "Total investment", v: fmt(totalInvested),       sub: "incl. electricity"                          },
    { l: "Total earned",     v: fmt(earnedUSD),            sub: fmtBTC(data.btcEarned), green: true          },
    { l: "Returned",         v: `${pctBack.toFixed(1)}%`, sub: "of your investment",   green: pctBack >= 100 },
    { l: "Break-even",       v: beLabel,                  sub: daysToBreakEven === Infinity ? "—" : `${daysToBreakEven}d to go` },
    { l: "Net profit/loss",  v: (pl >= 0 ? "+" : "") + fmt(pl), sub: "after all costs", green: pl >= 0, red: pl < 0 },
  ];

  // Collapsible section wrapper
  const Section = ({ title, icon, badge, expanded, onToggle, children }: any) => (
    <Card style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "14px 20px", display: "flex", justifyContent: "space-between",
        alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {badge && <span style={{ fontSize: 12, color: MUTED }}>{badge}</span>}
          <span style={{ color: MUTED, transition: "transform .25s", display: "inline-block", transform: expanded ? "rotate(0)" : "rotate(180deg)" }}>▲</span>
        </div>
      </button>
      <div style={{ maxHeight: expanded ? "800px" : "0", overflow: "hidden", transition: "max-height .35s ease" }}>
        <div style={{ borderTop: `1px solid ${BORDER}` }}>{children}</div>
      </div>
    </Card>
  );

  return (
    <div style={{
      minHeight: "100vh", background: "#ebebed",
      opacity: entered ? 1 : 0, transform: entered ? "translateY(0)" : "translateY(16px)",
      transition: "opacity .4s ease, transform .4s ease",
    }}>

      {/* ── Navbar ── */}
      <div style={{
        background: "#fff", borderBottom: `1px solid ${BORDER}`,
        padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 8px rgba(0,0,0,.05)", flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>B</div>
          <span style={{ fontSize: 15, fontWeight: 700 }}><span style={{ color: PURPLE }}>Mining</span>Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#f5f5f7", borderRadius: 8, padding: 3, gap: 2 }}>
            {Object.keys(CURRENCIES).map(k => (
              <button key={k} onClick={() => setCur(k)} style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                fontFamily: "inherit", border: "none", cursor: "pointer", transition: "all .15s",
                background: cur === k ? PURPLE : "transparent",
                color: cur === k ? "#fff" : MUTED,
              }}>{k}</button>
            ))}
          </div>
          <NavBtn danger onClick={onReset}>↺ Reset</NavBtn>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── KPI strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
          {kpis.map(k => (
            <Card key={k.l} style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 6, fontWeight: 500 }}>{k.l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: (k as any).red ? RED : k.green ? GREEN : "#1a1a2e" }}>
                {k.v}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* ── Live performance ── */}
        <Section
          title="Live performance" icon="📊"
          badge={`${(btcPerDay * 365).toFixed(4)} BTC/yr · ${S}${Math.round(dailyAtCurrent * R)}/day`}
          expanded={showPerf} onToggle={() => setShowPerf(v => !v)}>
          <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 40px" }}>
            {[
              ["Total hashrate",       "518.38 TH/s",                                          false],
              ["BTC price (live)",     `${S}${Math.round(data.btcLive * R).toLocaleString()}`,  true ],
              ["BTC per day (est)",    fmtBTC(btcPerDay),                                       false],
              ["Daily earnings (est)", `${S}${Math.round(dailyAtCurrent * R)}`,                 true ],
              ["Pool balance",         fmtBTC(0.00152575),                                      false],
              ["Total paid out",       fmtBTC(data.btcEarned),                                  false],
            ].map(([l, v, g]) => (
              <div key={l as string}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: g ? GREEN : "#1a1a2e" }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── My miners ── */}
        <Section title="My miners" icon="⛏" badge="5 online · 0 offline · 4 dead"
          expanded={showMiners} onToggle={() => setShowMiners(v => !v)}>

          {/* Electricity costs */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Electricity costs</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Total costs</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: RED }}>{fmt(totalEnergy)}</div>
                {extraEnergy > 0 && <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>incl. {fmt(extraEnergy)} added manually</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f9f9fb", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: MUTED }}>Add electricity bill (USD)</div>
                <input
                  type="number" value={energyInput} onChange={e => setEnergyInput(e.target.value)}
                  placeholder="0"
                  style={{ width: 80, padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 14, outline: "none", textAlign: "right", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = PURPLE)}
                  onBlur={e  => (e.target.style.borderColor = BORDER)}
                />
                <button
                  onClick={() => { setExtraEnergy(v => v + (parseFloat(energyInput) || 0)); setEnergyInput(""); }}
                  style={{ width: 32, height: 32, borderRadius: 7, background: PURPLE, border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>+</button>
                <button
                  onClick={() => { setExtraEnergy(v => Math.max(0, v - (parseFloat(energyInput) || 0))); setEnergyInput(""); }}
                  style={{ width: 32, height: 32, borderRadius: 7, background: "#fef2f2", border: "none", color: RED, fontSize: 18, cursor: "pointer" }}>-</button>
              </div>
            </div>
          </div>

          {/* Watcher links */}
          <div style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 10, letterSpacing: "0.06em" }}>WATCHER LINKS</div>
            {data.watcherUrls.map((u, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 12px", background: "#f9f9fb", borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: PURPLE, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{u}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", background: "#f0fdf4", color: GREEN, borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>Connected</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Scenario calculator ── */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Scenario calculator — what if BTC rises?</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>Current BTC price</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{S}{Math.round(data.btcLive * R).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>Scenario price</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: PURPLE }}>{S}{Math.round(scenarioPrice * R).toLocaleString()}</div>
              {scenarioPrice === data.btcLive && <div style={{ fontSize: 11, color: MUTED }}>= current price</div>}
            </div>
          </div>

          <input type="range" min="10000" max="1000000" step="1000" value={scenarioPrice}
            onChange={e => setScenarioPrice(+e.target.value)}
            style={{ width: "100%", marginBottom: 6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginBottom: 16 }}>
            {["$10K","$100K","$250K","$500K","$750K","$1M"].map(l => <span key={l}>{l}</span>)}
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20 }}>
            {BTC_STEPS.map(p => (
              <Pill key={p} active={Math.abs(scenarioPrice - p) < 500} onClick={() => setScenarioPrice(p)}>
                ${(p / 1000).toFixed(0)}K
              </Pill>
            ))}
            <Pill active={Math.abs(scenarioPrice - data.btcLive) < 500} onClick={() => setScenarioPrice(data.btcLive)}>
              Current price
            </Pill>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, background: "#f9f9fb", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
            {[
              ["Per day",    fmt(dailyAtScenario)],
              ["Per month",  fmt(dailyAtScenario * 30)],
              ["Per year",   fmt(dailyAtScenario * 365)],
              ["ROI avg/yr", `${(pctBack / Math.max(1, months / 12)).toFixed(1)}%/yr`],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, background: "#f9f9fb", borderRadius: 12, padding: "14px 18px" }}>
            {[
              ["Profit/loss", (scenarioPL >= 0 ? "+" : "") + fmt(scenarioPL), scenarioPL >= 0 ? GREEN : RED],
              ["Break-even",  beLabel,                                          "#1a1a2e"],
              ["ROI total",   `${pctBack.toFixed(1)}%`,                         pctBack >= 100 ? GREEN : MUTED],
            ].map(([l, v, c]) => (
              <div key={l as string}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── P&L Chart ── */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Cumulative P&L over time</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>
            Current price vs selected scenario · {data.btcEarned.toFixed(4)} ₿ mined
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { c: "#b0b0c8", l: `Current (${S}${Math.round(data.btcLive * R).toLocaleString()})` },
              { c: PURPLE,    l: `Scenario (${S}${Math.round(scenarioPrice * R).toLocaleString()})` },
            ].map(({ c, l }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: MUTED }}>
                <div style={{ width: 22, height: 2, background: c, borderRadius: 1 }} />{l}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `${S}${v >= 0 ? "" : "-"}${(Math.abs(v) / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip sym={S} />} />
              <ReferenceLine y={0} stroke={BORDER} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="pl"       stroke="#b0b0c8" strokeWidth={1.5} dot={false} name="Current"  />
              <Line type="monotone" dataKey="scenario" stroke={PURPLE}  strokeWidth={2.5} dot={false} name="Scenario" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// Flow: loading (5s) → dashboard
//
// To re-enable the setup form later, change to:
//   const [screen, setScreen] = useState<"setup" | "loading" | "dashboard">("setup");
//   and uncomment <SetupScreen /> block above
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<"loading" | "dashboard">("loading");

  return screen === "loading"
    ? <LoaderScreen onComplete={() => setScreen("dashboard")} />
    : <Dashboard data={DEMO_DATA} onReset={() => setScreen("loading")} />;
}