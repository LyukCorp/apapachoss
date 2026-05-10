import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────
const supabase = createClient(
  "https://uyldukkreqvmokjoortz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bGR1a2tyZXF2bW9ram9vcnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODYxNTYsImV4cCI6MjA5Mzk2MjE1Nn0.P_-okfDL4uQxX6BD35M7TSdo0M6dWqTWH5RHjVxfN30"
);

// ─── Constants ────────────────────────────────────────────────
const START_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 45);
  d.setHours(0, 0, 0, 0);
  return d;
})();

const BASE_HUGS = 6;
const BASE_PCT = 45;
const DAILY_INCREASE = 0.20;
const BONUS_PCT = 0.10;

// ─── Helpers ──────────────────────────────────────────────────
function getDayIndex() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor((d - START_DATE) / 86400000);
}

function calcDay(dayIdx, extraFactors = []) {
  let pct = BASE_PCT;
  let hugs = BASE_HUGS;
  for (let i = 1; i <= dayIdx; i++) {
    pct = pct * (1 + DAILY_INCREASE);
    hugs = Math.round(hugs * (1 + DAILY_INCREASE));
  }
  extraFactors.forEach(f => {
    if (f.active) {
      pct = pct * (1 + f.value / 100);
      hugs = Math.round(hugs * (1 + f.value / 100));
    }
  });
  return { pct: Math.round(pct * 10) / 10, hugs };
}

function fmtDate(dayIdx) {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + dayIdx);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

const REASONS = [
  "Primer impulso: el corazón necesita conexión.",
  "El cuerpo libera oxitocina con el contacto físico.",
  "La ansiedad baja con un abrazo genuino.",
  "El calor humano reduce el cortisol.",
  "Los lazos se fortalecen con la repetición.",
  "El tacto activa el nervio vago, calmando el sistema nervioso.",
  "La confianza crece con cada abrazo compartido.",
  "El sistema inmune mejora con contacto afectivo frecuente.",
  "La soledad disminuye con presencia física consciente.",
  "El ritmo cardíaco se sincroniza entre dos personas que se abrazan.",
  "El cerebro asocia el abrazo con seguridad emocional.",
  "La mente necesita pausar y sentir, no solo pensar.",
  "Cada abrazo acumula memoria afectiva positiva.",
  "El amor se practica, no solo se siente.",
  "La vulnerabilidad compartida fortalece el vínculo.",
  "El cuerpo recuerda lo que el abrazo le enseña.",
  "La dopamina sube con el contacto elegido.",
  "La presencia plena vale más que mil palabras.",
  "El abrazo cruza barreras que el lenguaje no puede.",
  "El hábito de abrazar remodela el cerebro afectivo.",
  "El afecto consistente construye seguridad emocional duradera.",
  "La frecuencia importa: el cuerpo aprende con la repetición.",
  "Un abrazo largo (más de 20s) cambia el estado emocional.",
  "La reciprocidad del abrazo enseña a dar y recibir.",
  "El contacto físico es un lenguaje primario del ser humano.",
  "El abrazo diario se convierte en un ancla emocional.",
  "La intensidad del vínculo crece con la constancia.",
  "El cuerpo necesita ser visto y tocado para sentirse real.",
  "Los abrazos frecuentes previenen la desconexión emocional.",
  "El amor no declarado encuentra forma en el abrazo.",
  "La rutina afectiva transforma la relación.",
  "Cada abrazo es una declaración silenciosa de presencia.",
  "El sistema nervioso aprende a confiar con el tiempo.",
  "Lo sutil acumula: cada abrazo cuenta más de lo que parece.",
  "El porcentaje sube porque el amor no tiene techo.",
  "El hábito ya es parte de ti: el cuerpo lo espera.",
  "La constancia es la forma más honesta de amor.",
  "El umbral cambia: lo que antes era suficiente ya no lo es.",
  "El vínculo exige más porque ha crecido.",
  "La base se amplió: ahora el edificio puede ser más alto.",
  "El amor bien cuidado siempre pide más espacio.",
  "Los 45 días transformaron el punto de partida.",
  "Lo que empezó como 6 abrazos ahora define tu día.",
  "El porcentaje refleja cuánto has crecido en esto.",
  "Hoy, el abrazo es un compromiso, no solo un gesto.",
];

// ─── Supabase data hook ───────────────────────────────────────
function useHugData() {
  const [logs, setLogsState] = useState({});
  const [bonusDays, setBonusState] = useState({});
  const [factors, setFactorsState] = useState([]);
  const [loading, setLoading] = useState(true);
  const todayIdx = getDayIndex();

  const fetchAll = useCallback(async () => {
    const [{ data: logsData }, { data: bonusData }, { data: factorsData }] = await Promise.all([
      supabase.from("hug_logs").select("*"),
      supabase.from("hug_bonus").select("*"),
      supabase.from("hug_factors").select("*").order("id"),
    ]);
    const logsMap = {};
    (logsData || []).forEach(r => { logsMap[r.day_index] = r.given; });
    const bonusMap = {};
    (bonusData || []).forEach(r => { bonusMap[r.day_index] = true; });
    setLogsState(logsMap);
    setBonusState(bonusMap);
    setFactorsState(factorsData || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = supabase
      .channel("hug-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hug_logs" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "hug_bonus" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "hug_factors" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  async function setGiven(dayIdx, given) {
    await supabase.from("hug_logs").upsert({ day_index: dayIdx, given });
  }
  async function setBonus(dayIdx) {
    await supabase.from("hug_bonus").upsert({ day_index: dayIdx, active: true });
  }
  async function addFactor(name, value) {
    await supabase.from("hug_factors").insert({ name, value: parseFloat(value), active: true });
  }
  async function toggleFactor(id, current) {
    await supabase.from("hug_factors").update({ active: !current }).eq("id", id);
  }
  async function removeFactor(id) {
    await supabase.from("hug_factors").delete().eq("id", id);
  }

  function getEffective(dayIdx) {
    const base = calcDay(dayIdx, factors);
    let pct = base.pct;
    let hugs = base.hugs;
    if (bonusDays[dayIdx]) {
      pct = Math.round(pct * (1 + BONUS_PCT) * 10) / 10;
      hugs = Math.round(hugs * (1 + BONUS_PCT));
    }
    return { pct, hugs };
  }

  const history = Array.from({ length: todayIdx + 1 }, (_, i) => {
    const { pct, hugs } = getEffective(i);
    return { idx: i, pct, hugs, given: logs[i] || 0, date: fmtDate(i) };
  }).reverse();

  return { loading, logs, bonusDays, factors, todayIdx, getEffective, history, setGiven, setBonus, addFactor, toggleFactor, removeFactor };
}

// ─── Styles ───────────────────────────────────────────────────
const S = {
  page: { fontFamily: "'Georgia','Times New Roman',serif", minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f 0%,#12091a 50%,#0f1520 100%)", color: "#e8dfc8" },
  header: { borderBottom: "1px solid rgba(255,200,100,0.15)", padding: "24px 32px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)" },
  card: { background: "rgba(255,200,80,0.04)", border: "1px solid rgba(255,200,80,0.12)", borderRadius: 12, padding: "20px 22px" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,80,0.2)", borderRadius: 8, padding: "10px 14px", color: "#e8dfc8", fontSize: 14, boxSizing: "border-box", outline: "none" },
  label: { fontSize: 10, letterSpacing: 3, color: "#806040", textTransform: "uppercase", display: "block", marginBottom: 6 },
};

// ─── History Panel ────────────────────────────────────────────
function HistoryPanel({ history, todayIdx, compact }) {
  if (compact) return (
    <aside style={{ width: 210, padding: "28px 18px", borderLeft: "1px solid rgba(255,200,100,0.1)", flexShrink: 0 }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: "#706050", textTransform: "uppercase", marginBottom: 16 }}>Últimos 7 días</div>
      {history.slice(0, 7).map(h => (
        <div key={h.idx} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,200,80,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: h.idx === todayIdx ? "#ffcc66" : "#a08060" }}>{h.idx === todayIdx ? "Hoy" : h.date}</span>
            <span style={{ fontSize: 13, color: "#ffcc66", fontWeight: "bold" }}>{h.pct}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#605040" }}>{h.hugs} 🫂</span>
            <span style={{ fontSize: 11, color: h.given >= h.hugs ? "#66ffaa" : "#604030" }}>{h.given >= h.hugs ? "✓" : `${h.given}/${h.hugs}`}</span>
          </div>
        </div>
      ))}
      <div style={{ ...S.card, marginTop: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#706050", textTransform: "uppercase", marginBottom: 12 }}>Total</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#806040" }}>Abrazos dados</div>
          <div style={{ fontSize: 20, color: "#e8dfc8", fontWeight: "bold" }}>{history.reduce((a, h) => a + h.given, 0)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#806040" }}>Días totales</div>
          <div style={{ fontSize: 20, color: "#e8dfc8", fontWeight: "bold" }}>{history.length}</div>
        </div>
      </div>
    </aside>
  );

  return (
    <div style={{ overflowY: "auto", maxHeight: "60vh" }}>
      {history.map(h => {
        const pct = h.given >= h.hugs ? 100 : Math.round((h.given / h.hugs) * 100);
        const isToday = h.idx === todayIdx;
        return (
          <div key={h.idx} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid rgba(255,200,80,0.07)", opacity: isToday ? 1 : 0.75 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#606060" }}>D{h.idx + 1}</div>
              <div style={{ fontSize: 12, color: "#a08060" }}>{h.date}</div>
            </div>
            <div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 14, color: "#e8dfc8" }}>{h.hugs} abrazos</span>
                {isToday && <span style={{ fontSize: 10, background: "rgba(255,200,80,0.15)", color: "#ffcc66", padding: "1px 7px", borderRadius: 10 }}>HOY</span>}
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#66ffaa" : "#cc8800", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11, color: "#605040", marginTop: 3 }}>{h.given}/{h.hugs} dados</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: "bold", color: "#ffcc66" }}>{h.pct}%</div>
              <div style={{ fontSize: 10, color: "#606060" }}>intensidad</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}>🫂</div>
        <div style={{ fontSize: 13, color: "#806040", letterSpacing: 3 }}>CARGANDO...</div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────
function AdminView() {
  const { loading, logs, bonusDays, factors, todayIdx, getEffective, history, setGiven, setBonus, addFactor, toggleFactor, removeFactor } = useHugData();
  const [newFactor, setNewFactor] = useState({ name: "", value: "" });
  const [showAddFactor, setShowAddFactor] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingScreen />;

  const today = getEffective(todayIdx);
  const todayGiven = logs[todayIdx] || 0;
  const remaining = Math.max(0, today.hugs - todayGiven);
  const progress = today.hugs > 0 ? Math.min(100, Math.round((todayGiven / today.hugs) * 100)) : 0;

  const wrap = (fn) => async (...args) => { setSaving(true); await fn(...args); setSaving(false); };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#a08060", textTransform: "uppercase", marginBottom: 3 }}>
            Admin · día {todayIdx + 1} · {fmtDate(todayIdx)}
            {saving && <span style={{ marginLeft: 10, color: "#ffcc66", opacity: 0.6 }}>guardando…</span>}
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: "normal", color: "#f0e0b0" }}>🫂 Registro de Abrazos</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 44, fontWeight: "bold", color: "#ffcc66", lineHeight: 1 }}>{today.pct}%</div>
          <div style={{ fontSize: 11, color: "#a08060", marginTop: 2 }}>intensidad afectiva</div>
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 86px)" }}>
        <main style={{ flex: 1, padding: "24px 28px", borderRight: "1px solid rgba(255,200,100,0.1)" }}>
          <div style={{ display: "flex", marginBottom: 24, borderBottom: "1px solid rgba(255,200,100,0.15)" }}>
            {[["today","Hoy"],["factors","Factores"],["history","Historial"]].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ background: "none", border: "none", cursor: "pointer", padding: "9px 18px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: activeTab === key ? "#ffcc66" : "#806040", borderBottom: activeTab === key ? "2px solid #ffcc66" : "2px solid transparent", marginBottom: -1 }}>{label}</button>
            ))}
          </div>

          {activeTab === "today" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                <div style={{ ...S.card, textAlign: "center" }}>
                  <div style={{ fontSize: 50, fontWeight: "bold", color: "#ffcc66", lineHeight: 1 }}>{today.hugs}</div>
                  <div style={{ fontSize: 11, color: "#a08060", marginTop: 5, letterSpacing: 2, textTransform: "uppercase" }}>necesarios</div>
                </div>
                <div style={{ ...S.card, textAlign: "center", border: "1px solid rgba(100,200,150,0.15)" }}>
                  <div style={{ fontSize: 50, fontWeight: "bold", color: todayGiven >= today.hugs ? "#66ffaa" : "#e8dfc8", lineHeight: 1 }}>{todayGiven}</div>
                  <div style={{ fontSize: 11, color: "#a08060", marginTop: 5, letterSpacing: 2, textTransform: "uppercase" }}>dados hoy</div>
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#a08060" }}>Progreso</span>
                  <span style={{ fontSize: 12, color: "#ffcc66" }}>{progress}%</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: progress >= 100 ? "linear-gradient(90deg,#66ffaa,#44dd88)" : "linear-gradient(90deg,#cc8800,#ffcc66)", borderRadius: 4, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ marginTop: 7, fontSize: 13, color: remaining > 0 ? "#e8dfc8" : "#66ffaa" }}>
                  {remaining > 0 ? `Faltan ${remaining} abrazo${remaining !== 1 ? "s" : ""}` : "✓ ¡Completados!"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                <button onClick={wrap(() => setGiven(todayIdx, Math.min(todayGiven + 1, today.hugs)))} disabled={saving || todayGiven >= today.hugs} style={{ flex: 2, padding: "13px 0", borderRadius: 10, border: "none", cursor: "pointer", background: todayGiven >= today.hugs ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#cc8800,#ffcc66)", color: todayGiven >= today.hugs ? "#605040" : "#1a0e00", fontSize: 15, fontWeight: "bold", opacity: saving ? 0.6 : 1 }}>🫂 Dar abrazo</button>
                <button onClick={wrap(() => setGiven(todayIdx, Math.max(todayGiven - 1, 0)))} disabled={saving || todayGiven <= 0} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "1px solid rgba(255,100,80,0.25)", cursor: "pointer", background: "rgba(255,100,80,0.05)", color: todayGiven <= 0 ? "#403020" : "#ff8866", fontSize: 13, opacity: saving ? 0.6 : 1 }}>↩ Descontar</button>
                <button onClick={wrap(() => setBonus(todayIdx))} disabled={saving || !!bonusDays[todayIdx]} style={{ flex: 1, padding: "13px 10px", borderRadius: 10, border: "1px solid rgba(150,200,255,0.25)", cursor: "pointer", background: bonusDays[todayIdx] ? "rgba(100,150,255,0.1)" : "rgba(100,150,255,0.06)", color: bonusDays[todayIdx] ? "#6688aa" : "#99bbdd", fontSize: 12, opacity: saving ? 0.6 : 1 }}>+10%{bonusDays[todayIdx] ? " ✓" : ""}</button>
              </div>

              <div style={S.card}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "#806040", textTransform: "uppercase", marginBottom: 10 }}>Por qué hoy · día {todayIdx + 1}</div>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#d0c0a0", fontStyle: "italic" }}>"{REASONS[todayIdx % REASONS.length]}"</p>
              </div>
            </div>
          )}

          {activeTab === "factors" && (
            <div>
              <p style={{ fontSize: 13, color: "#806040", marginTop: 0 }}>Multiplicadores adicionales sobre el cálculo base diario.</p>
              {factors.length === 0 && <div style={{ color: "#504030", fontSize: 14, marginBottom: 20, fontStyle: "italic" }}>Sin factores extra.</div>}
              {factors.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,200,80,0.12)", borderRadius: 10, padding: "13px 15px" }}>
                  <input type="checkbox" checked={f.active} onChange={() => toggleFactor(f.id, f.active)} style={{ accentColor: "#ffcc66", width: 16, height: 16, cursor: "pointer" }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{f.name}</span>
                  <span style={{ background: "rgba(255,200,80,0.1)", border: "1px solid rgba(255,200,80,0.2)", borderRadius: 6, padding: "2px 10px", fontSize: 13, color: "#ffcc66" }}>+{f.value}%</span>
                  <button onClick={() => removeFactor(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#604030", fontSize: 16 }}>✕</button>
                </div>
              ))}
              {showAddFactor ? (
                <div style={{ ...S.card, marginTop: 8, border: "1px solid rgba(255,200,80,0.2)" }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Nombre del factor</label>
                    <input value={newFactor.name} onChange={e => setNewFactor(p => ({ ...p, name: e.target.value }))} placeholder="ej. Día especial" style={S.input} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={S.label}>Porcentaje adicional (%)</label>
                    <input type="number" value={newFactor.value} onChange={e => setNewFactor(p => ({ ...p, value: e.target.value }))} placeholder="ej. 15" style={S.input} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={async () => { if (!newFactor.name || !newFactor.value) return; setSaving(true); await addFactor(newFactor.name, newFactor.value); setNewFactor({ name: "", value: "" }); setShowAddFactor(false); setSaving(false); }} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#cc8800,#ffcc66)", color: "#1a0e00", fontWeight: "bold", fontSize: 14 }}>Agregar</button>
                    <button onClick={() => setShowAddFactor(false)} style={{ padding: "11px 18px", borderRadius: 8, border: "1px solid rgba(255,200,80,0.2)", background: "none", cursor: "pointer", color: "#806040", fontSize: 14 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddFactor(true)} style={{ width: "100%", padding: "13px 0", borderRadius: 10, marginTop: 4, border: "1px dashed rgba(255,200,80,0.25)", background: "none", cursor: "pointer", color: "#806040", fontSize: 14 }}>+ Nuevo factor</button>
              )}
            </div>
          )}

          {activeTab === "history" && <HistoryPanel history={history} todayIdx={todayIdx} />}
        </main>
        <HistoryPanel history={history} todayIdx={todayIdx} compact />
      </div>
    </div>
  );
}

// ─── PANCITO ──────────────────────────────────────────────────
function PancitoView() {
  const { loading, logs, bonusDays, todayIdx, getEffective, history } = useHugData();
  if (loading) return <LoadingScreen />;

  const today = getEffective(todayIdx);
  const todayGiven = logs[todayIdx] || 0;
  const remaining = Math.max(0, today.hugs - todayGiven);
  const progress = today.hugs > 0 ? Math.min(100, Math.round((todayGiven / today.hugs) * 100)) : 0;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#c090a0", textTransform: "uppercase", marginBottom: 3 }}>día {todayIdx + 1} · {fmtDate(todayIdx)}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: "normal", color: "#f0e0b0" }}>🫂 Abrazos de hoy</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 44, fontWeight: "bold", color: "#ffcc66", lineHeight: 1 }}>{today.pct}%</div>
          <div style={{ fontSize: 11, color: "#a08060", marginTop: 2 }}>intensidad afectiva</div>
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 86px)" }}>
        <main style={{ flex: 1, padding: "32px 36px", borderRight: "1px solid rgba(255,200,100,0.1)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
            <div style={{ ...S.card, textAlign: "center" }}>
              <div style={{ fontSize: 64, fontWeight: "bold", color: "#ffcc66", lineHeight: 1 }}>{today.hugs}</div>
              <div style={{ fontSize: 12, color: "#a08060", marginTop: 6, letterSpacing: 2, textTransform: "uppercase" }}>abrazos hoy</div>
            </div>
            <div style={{ ...S.card, textAlign: "center", border: "1px solid rgba(100,200,150,0.15)" }}>
              <div style={{ fontSize: 64, fontWeight: "bold", color: todayGiven >= today.hugs ? "#66ffaa" : "#e8dfc8", lineHeight: 1 }}>{todayGiven}</div>
              <div style={{ fontSize: 12, color: "#a08060", marginTop: 6, letterSpacing: 2, textTransform: "uppercase" }}>dados</div>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#a08060" }}>Progreso del día</span>
              <span style={{ fontSize: 13, color: "#ffcc66" }}>{progress}%</span>
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: progress >= 100 ? "linear-gradient(90deg,#66ffaa,#44dd88)" : "linear-gradient(90deg,#cc8800,#ffcc66)", borderRadius: 5, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 15, textAlign: "center", color: remaining > 0 ? "#e8dfc8" : "#66ffaa" }}>
              {remaining > 0 ? `✦ Faltan ${remaining} abrazo${remaining !== 1 ? "s" : ""} ✦` : "✦ ¡Todos los abrazos completados! ✦"}
            </div>
          </div>

          <div style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#806040", textTransform: "uppercase", marginBottom: 12 }}>Por qué hoy</div>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: "#d0c0a0", fontStyle: "italic" }}>"{REASONS[todayIdx % REASONS.length]}"</p>
          </div>

          {bonusDays[todayIdx] && (
            <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#99bbdd", background: "rgba(100,150,255,0.06)", border: "1px solid rgba(100,150,255,0.15)", borderRadius: 10, padding: "12px 0" }}>
              ✦ Día con +10% de bonus activo
            </div>
          )}
        </main>
        <HistoryPanel history={history} todayIdx={todayIdx} compact />
      </div>
    </div>
  );
}

// ─── 404 ──────────────────────────────────────────────────────
function NotFound() {
  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🫂</div>
        <div style={{ fontSize: 18, color: "#806040" }}>Página no encontrada</div>
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────
export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const h = () => setHash(window.location.hash);
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const route = hash.replace("#", "").replace(/^\//, "").toLowerCase();
  if (route === "admin") return <AdminView />;
  if (route === "pancito") return <PancitoView />;
  return <NotFound />;
}