import { useState, useEffect, useCallback } from "react";

const MASTER_PIN = "1234";
const MANUAL_TYPES = ["Smoke testing", "Exploratory testing", "Bug creation", "Bug verification"];
const AUTO_TYPES = ["Script development"];
const MEETING_TYPES = ["Client meeting", "Daily standup", "Weekly standup", "Internal sync", "Review meeting", "Other"];
const ASSOCIATES = ["A", "B", "C"];
const TEAMS = ["Team Ruby"];

function uid() { return "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6); }

// ─── Storage helpers ───────────────────────────────────────────────
async function loadSubmissions() {
  try {
    const res = await window.storage.get("submissions", true);
    return res ? JSON.parse(res.value) : [];
  } catch { return []; }
}
async function saveSubmissions(data) {
  try { await window.storage.set("submissions", JSON.stringify(data), true); } catch {}
}

// ─── Small UI pieces ───────────────────────────────────────────────
const Section = ({ title, icon, children }) => (
  <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <i className={`ti ti-${icon}`} aria-hidden="true" /> {title}
    </div>
    {children}
  </div>
);

const Field = ({ label, children, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>{label}{required && <span style={{ color: "#d04040", marginLeft: 2 }}>*</span>}</label>
    {children}
  </div>
);

const inputStyle = { fontSize: 14, border: "1px solid #e0e0da", borderRadius: 8, padding: "7px 10px", background: "#fff", color: "#1a1a1a", outline: "none", width: "100%", height: 36, fontFamily: "inherit" };
const smInputStyle = { ...inputStyle, height: 32, fontSize: 13 };

const SummaryCard = ({ label, value, unit }) => (
  <div style={{ background: "#f5f5f0", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
    <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, color: "#1a1a1a" }}>{value}</div>
    <div style={{ fontSize: 11, color: "#aaa" }}>{unit}</div>
  </div>
);

const Btn = ({ onClick, children, variant = "outline", style = {} }) => {
  const base = { borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", border: "none", transition: "background 0.15s" };
  const variants = {
    primary: { background: "#2a6dd9", color: "#fff", border: "none" },
    outline: { background: "#fff", color: "#1a1a1a", border: "1px solid #d0d0ca" },
    danger: { background: "none", color: "#c04040", border: "1px solid #e5a0a0" },
    submit: { background: "#2a6dd9", color: "#fff", border: "none", padding: "11px 28px", fontSize: 14, fontWeight: 600 },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
};

// ─── Associate Form ────────────────────────────────────────────────
function AssociateForm({ onSubmitDone }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [team, setTeam] = useState("");
  const [workday, setWorkday] = useState(9);
  const [tests, setTests] = useState([{ id: uid(), name: "", type: MANUAL_TYPES[0], hours: "" }]);
  const [meetings, setMeetings] = useState([{ id: uid(), name: "", mtype: MEETING_TYPES[0], hours: "" }]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const tHrs = tests.reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);
  const mHrs = meetings.reduce((s, m) => s + (parseFloat(m.hours) || 0), 0);
  const other = Math.max(0, workday - tHrs - mHrs);
  const over = tHrs + mHrs > workday;

  const addTest = () => setTests(p => [...p, { id: uid(), name: "", type: MANUAL_TYPES[0], hours: "" }]);
  const removeTest = id => setTests(p => p.filter(t => t.id !== id));
  const updateTest = (id, k, v) => setTests(p => p.map(t => t.id === id ? { ...t, [k]: v } : t));

  const addMeeting = () => setMeetings(p => [...p, { id: uid(), name: "", mtype: MEETING_TYPES[0], hours: "" }]);
  const removeMeeting = id => setMeetings(p => p.filter(m => m.id !== id));
  const updateMeeting = (id, k, v) => setMeetings(p => p.map(m => m.id === id ? { ...m, [k]: v } : m));

  const submit = async () => {
    if (!name || !date || !team) { setErr("Please fill in all required fields — name, date, and team."); return; }
    setSaving(true);
    const payload = {
      id: uid(), submittedAt: new Date().toISOString(),
      name, date, team, workday: parseFloat(workday),
      testingHrs: tHrs.toFixed(1), meetingHrs: mHrs.toFixed(1), otherHrs: other.toFixed(1),
      tests: tests.map(t => ({ name: t.name, category: MANUAL_TYPES.includes(t.type) ? "Manual" : "Automation", type: t.type, hours: parseFloat(t.hours) || 0 })),
      meetings: meetings.map(m => ({ name: m.name, mtype: m.mtype, hours: parseFloat(m.hours) || 0 })),
    };
    const existing = await loadSubmissions();
    await saveSubmissions([...existing, payload]);
    setSaving(false);
    onSubmitDone(payload);
  };

  const typeOpts = (sel) => (
    <>
      <optgroup label="Manual testing">{MANUAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
      <optgroup label="Automation testing">{AUTO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
    </>
  );

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><i className="ti ti-chart-bar" aria-hidden="true" /> Daily productivity log</h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Fill in all details and click Submit. Your data will go directly to the master dashboard.</p>
      </div>

      <Section title="Associate details" icon="user">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Name" required>
            <select style={inputStyle} value={name} onChange={e => setName(e.target.value)}>
              <option value="">Select name…</option>
              {ASSOCIATES.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Date" required>
            <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Team / project" required>
            <select style={inputStyle} value={team} onChange={e => setTeam(e.target.value)}>
              <option value="">Select team…</option>
              {TEAMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Total work hours">
            <input style={inputStyle} type="number" min="1" max="24" step="0.5" value={workday} onChange={e => setWorkday(parseFloat(e.target.value) || 9)} />
          </Field>
        </div>
      </Section>

      <Section title="Testing activities" icon="bug">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 90px 36px", gap: 8, marginBottom: 4 }}>
          {["Testing item / description", "Type", "Hours", ""].map((h, i) => <div key={i} style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>{h}</div>)}
        </div>
        {tests.map(t => (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 150px 90px auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input style={inputStyle} placeholder="e.g. Login regression" value={t.name} onChange={e => updateTest(t.id, "name", e.target.value)} />
            <select style={inputStyle} value={t.type} onChange={e => updateTest(t.id, "type", e.target.value)}>{typeOpts(t.type)}</select>
            <input style={{ ...inputStyle, textAlign: "center" }} type="number" min="0" max="24" step="0.5" placeholder="hrs" value={t.hours} onChange={e => updateTest(t.id, "hours", e.target.value)} />
            <button onClick={() => removeTest(t.id)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 18, padding: "4px 8px", borderRadius: 6 }}><i className="ti ti-x" /></button>
          </div>
        ))}
        <button onClick={addTest} style={{ fontSize: 13, color: "#3a7bd5", background: "none", border: "1px dashed #93b8ea", borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}><i className="ti ti-plus" /> Add testing item</button>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0ea", marginTop: 8, paddingTop: 8, fontSize: 13 }}>
          <span style={{ color: "#666" }}>Total testing hours</span><strong>{tHrs.toFixed(1)} hrs</strong>
        </div>
      </Section>

      <Section title="Meetings attended" icon="users">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 90px 36px", gap: 8, marginBottom: 4 }}>
          {["Meeting name", "Meeting type", "Hours", ""].map((h, i) => <div key={i} style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>{h}</div>)}
        </div>
        {meetings.map(m => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 150px 90px auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input style={inputStyle} placeholder="e.g. Sprint review" value={m.name} onChange={e => updateMeeting(m.id, "name", e.target.value)} />
            <select style={inputStyle} value={m.mtype} onChange={e => updateMeeting(m.id, "mtype", e.target.value)}>
              {MEETING_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input style={{ ...inputStyle, textAlign: "center" }} type="number" min="0" max="24" step="0.5" placeholder="hrs" value={m.hours} onChange={e => updateMeeting(m.id, "hours", e.target.value)} />
            <button onClick={() => removeMeeting(m.id)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 18, padding: "4px 8px", borderRadius: 6 }}><i className="ti ti-x" /></button>
          </div>
        ))}
        <button onClick={addMeeting} style={{ fontSize: 13, color: "#3a7bd5", background: "none", border: "1px dashed #93b8ea", borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}><i className="ti ti-plus" /> Add meeting</button>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0ea", marginTop: 8, paddingTop: 8, fontSize: 13 }}>
          <span style={{ color: "#666" }}>Total meeting hours</span><strong>{mHrs.toFixed(1)} hrs</strong>
        </div>
      </Section>

      <Section title="Day summary" icon="calendar-stats">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <SummaryCard label="Testing" value={tHrs.toFixed(1)} unit="hours" />
          <SummaryCard label="Meetings" value={mHrs.toFixed(1)} unit="hours" />
          <SummaryCard label="Other / buffer" value={other.toFixed(1)} unit="hours" />
        </div>
        {over && <p style={{ color: "#b07a10", fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-alert-triangle" /> Hours logged exceed total work hours.</p>}
      </Section>

      {err && <p style={{ color: "#d04040", fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-alert-circle" /> {err}</p>}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Btn variant="submit" onClick={submit}>{saving ? <><i className="ti ti-loader" /> Submitting…</> : <><i className="ti ti-send" /> Submit</>}</Btn>
      </div>
    </div>
  );
}

// ─── Success screen ────────────────────────────────────────────────
function SuccessScreen({ sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", gap: "1rem" }}>
      <div style={{ width: 64, height: 64, background: "#e6f4ec", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#2a9d6e" }}><i className="ti ti-check" /></div>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Submitted successfully!</h2>
      <p style={{ fontSize: 14, color: "#666", maxWidth: 340 }}>Your productivity data for <strong>{sub.date}</strong> has been sent directly to the master dashboard. You're all done!</p>
      <div style={{ background: "#f0f7ff", border: "1px solid #cde0f8", borderRadius: 10, padding: "10px 20px", fontSize: 13, color: "#2a5da8" }}>
        <i className="ti ti-info-circle" /> The master will review and finalize your entry.
      </div>
    </div>
  );
}

// ─── Master Login ──────────────────────────────────────────────────
function MasterLogin({ onUnlock }) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [err, setErr] = useState(false);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin]; next[i] = val; setPin(next);
    if (val && i < 3) document.getElementById(`pin-${i + 1}`)?.focus();
    if (val && i === 3) {
      const full = [...next].join("");
      if (full === MASTER_PIN) { onUnlock(); }
      else { setErr(true); setPin(["", "", "", ""]); setTimeout(() => document.getElementById("pin-0")?.focus(), 50); }
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 14, padding: "2rem", width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 36, color: "#2a6dd9", marginBottom: 12 }}><i className="ti ti-lock" /></div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Master dashboard</h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: "1.5rem" }}>Enter your 4-digit PIN to access all submissions</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: "1rem" }}>
          {pin.map((d, i) => (
            <input key={i} id={`pin-${i}`} type="password" maxLength={1} inputMode="numeric" value={d}
              onChange={e => handleDigit(i, e.target.value)}
              style={{ width: 48, height: 52, textAlign: "center", fontSize: 22, fontWeight: 700, border: `1.5px solid ${err ? "#e5a0a0" : "#e0e0da"}`, borderRadius: 10, outline: "none", fontFamily: "inherit" }}
              autoFocus={i === 0}
            />
          ))}
        </div>
        <Btn variant="primary" onClick={() => { const full = pin.join(""); if (full === MASTER_PIN) onUnlock(); else setErr(true); }} style={{ width: "100%", justifyContent: "center" }}>Unlock</Btn>
        {err && <p style={{ color: "#d04040", fontSize: 13, marginTop: 8 }}>Incorrect PIN. Try again.</p>}
        <p style={{ fontSize: 11, color: "#bbb", marginTop: "1rem" }}>Default PIN: 1234</p>
      </div>
    </div>
  );
}

// ─── Master Dashboard ──────────────────────────────────────────────
function MasterDashboard() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadSubmissions();
    setSubs(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); const t = setInterval(refresh, 5000); return () => clearInterval(t); }, [refresh]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const save = async (updated) => {
    const next = subs.map(s => s.id === updated.id ? updated : s);
    await saveSubmissions(next); setSubs(next); showToast("Entry saved!");
  };

  const del = async (id) => {
    if (!confirm("Delete this submission?")) return;
    const next = subs.filter(s => s.id !== id);
    await saveSubmissions(next); setSubs(next); showToast("Entry deleted.");
  };

  const exportCSV = () => {
    if (!subs.length) { showToast("No submissions to export."); return; }
    const rows = [["Associate", "Date", "Team", "Work Hrs", "Testing Hrs", "Meeting Hrs", "Other Hrs", "Testing Item", "Category", "Test Type", "Test Hours", "Meeting Name", "Meeting Type", "Meeting Hours"]];
    subs.forEach(s => {
      const ts = s.tests || [], ms = s.meetings || [];
      const max = Math.max(ts.length, ms.length, 1);
      for (let i = 0; i < max; i++) {
        const t = ts[i] || {}, m = ms[i] || {};
        rows.push([i === 0 ? s.name : "", i === 0 ? s.date : "", i === 0 ? s.team : "", i === 0 ? s.workday : "", i === 0 ? s.testingHrs : "", i === 0 ? s.meetingHrs : "", i === 0 ? s.otherHrs : "", t.name || "", t.category || "", t.type || "", t.hours || "", m.name || "", m.mtype || "", m.hours || ""]);
      }
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `productivity_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); showToast("CSV exported!");
  };

  const avgTest = subs.length ? (subs.reduce((a, s) => a + parseFloat(s.testingHrs || 0), 0) / subs.length).toFixed(1) : "—";
  const avgMeet = subs.length ? (subs.reduce((a, s) => a + parseFloat(s.meetingHrs || 0), 0) / subs.length).toFixed(1) : "—";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><i className="ti ti-layout-dashboard" /> Productivity master dashboard</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" onClick={refresh}><i className="ti ti-refresh" /> Refresh</Btn>
          <Btn variant="outline" onClick={exportCSV}><i className="ti ti-download" /> Export CSV</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: "1rem" }}>
        {[["Submissions", subs.length, ""], ["Associates", new Set(subs.map(s => s.name)).size, ""], ["Avg testing hrs", avgTest, ""], ["Avg meeting hrs", avgMeet, ""]].map(([label, val, unit]) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #f0f0ea", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Submissions</h3>
          <span style={{ fontSize: 12, color: "#999", background: "#f0f0ea", padding: "2px 8px", borderRadius: 20 }}>{subs.length} {subs.length === 1 ? "entry" : "entries"}</span>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#aaa", fontSize: 14 }}><i className="ti ti-loader" /> Loading…</div>
        ) : subs.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#aaa", fontSize: 14 }}>
            <i className="ti ti-inbox" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
            No submissions yet. Associates will appear here automatically once they submit.
          </div>
        ) : subs.map((s, i) => (
          <SubItem key={s.id} sub={s} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onSave={save} onDelete={del} />
        ))}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#fff", border: "1px solid #e0e0da", borderRadius: 10, padding: "10px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 999 }}>
          <i className="ti ti-check" style={{ color: "#2a9d6e" }} /> {toast}
        </div>
      )}
    </div>
  );
}

// ─── Sub Item (editable row) ───────────────────────────────────────
function SubItem({ sub, expanded, onToggle, onSave, onDelete }) {
  const [s, setS] = useState({ ...sub, tests: sub.tests ? sub.tests.map(t => ({ ...t, _id: uid() })) : [], meetings: sub.meetings ? sub.meetings.map(m => ({ ...m, _id: uid() })) : [] });

  const recalc = (next) => {
    const tHrs = (next.tests || []).reduce((a, t) => a + (parseFloat(t.hours) || 0), 0);
    const mHrs = (next.meetings || []).reduce((a, m) => a + (parseFloat(m.hours) || 0), 0);
    return { ...next, testingHrs: tHrs.toFixed(1), meetingHrs: mHrs.toFixed(1), otherHrs: Math.max(0, (next.workday || 9) - tHrs - mHrs).toFixed(1) };
  };

  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const updTest = (id, k, v) => setS(p => recalc({ ...p, tests: p.tests.map(t => t._id === id ? { ...t, [k]: v } : t) }));
  const updMeet = (id, k, v) => setS(p => recalc({ ...p, meetings: p.meetings.map(m => m._id === id ? { ...m, [k]: v } : m) }));
  const addTest = () => setS(p => ({ ...p, tests: [...p.tests, { _id: uid(), name: "", type: MANUAL_TYPES[0], category: "Manual", hours: 0 }] }));
  const remTest = (id) => setS(p => recalc({ ...p, tests: p.tests.filter(t => t._id !== id) }));
  const addMeet = () => setS(p => ({ ...p, meetings: [...p.meetings, { _id: uid(), name: "", mtype: MEETING_TYPES[0], hours: 0 }] }));
  const remMeet = (id) => setS(p => recalc({ ...p, meetings: p.meetings.filter(m => m._id !== id) }));

  const handleSave = () => {
    const clean = { ...s, tests: s.tests.map(({ _id, ...rest }) => rest), meetings: s.meetings.map(({ _id, ...rest }) => rest) };
    onSave(clean);
  };

  const initials = s.name ? s.name.slice(0, 2).toUpperCase() : "?";

  return (
    <div style={{ borderBottom: "1px solid #f5f5f0" }}>
      <div onClick={onToggle} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center", padding: "0.75rem 1.25rem", cursor: "pointer", transition: "background 0.1s" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#dce8f8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, color: "#2a5da8", flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name} <span style={{ fontWeight: 400, color: "#888", fontSize: 13 }}>· {s.team}</span></div>
          <div style={{ fontSize: 12, color: "#888" }}>{s.date} · {new Date(s.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ background: "#e1f5ee", color: "#085041", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}><i className="ti ti-bug" /> {s.testingHrs}h</span>
          <span style={{ background: "#e6f1fb", color: "#0c447c", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}><i className="ti ti-users" /> {s.meetingHrs}h</span>
        </div>
        <i className="ti ti-chevron-down" style={{ fontSize: 16, color: "#bbb", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {expanded && (
        <div style={{ padding: "1rem 1.25rem", background: "#fafaf8", borderTop: "1px solid #f0f0ea" }}>
          {/* Associate info */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Associate info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
              <Field label="Name">
                <select style={smInputStyle} value={s.name} onChange={e => upd("name", e.target.value)}>
                  {ASSOCIATES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Date"><input style={smInputStyle} type="date" value={s.date} onChange={e => upd("date", e.target.value)} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Team">
                <select style={smInputStyle} value={s.team} onChange={e => upd("team", e.target.value)}>
                  {TEAMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Work hours"><input style={smInputStyle} type="number" min="1" max="24" step="0.5" value={s.workday} onChange={e => upd("workday", parseFloat(e.target.value) || 9)} /></Field>
            </div>
          </div>

          {/* Tests */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Testing activities</div>
            {s.tests.map(t => (
              <div key={t._id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 80px auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input style={smInputStyle} value={t.name} onChange={e => updTest(t._id, "name", e.target.value)} placeholder="Testing item" />
                <select style={smInputStyle} value={t.type} onChange={e => updTest(t._id, "type", e.target.value)}>
                  <optgroup label="Manual">{MANUAL_TYPES.map(x => <option key={x}>{x}</option>)}</optgroup>
                  <optgroup label="Automation">{AUTO_TYPES.map(x => <option key={x}>{x}</option>)}</optgroup>
                </select>
                <input style={{ ...smInputStyle, textAlign: "center" }} type="number" min="0" max="24" step="0.5" value={t.hours} onChange={e => updTest(t._id, "hours", parseFloat(e.target.value) || 0)} />
                <button onClick={() => remTest(t._id)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 16, padding: 4 }}><i className="ti ti-x" /></button>
              </div>
            ))}
            <button onClick={addTest} style={{ fontSize: 12, color: "#3a7bd5", background: "none", border: "1px dashed #93b8ea", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "inherit" }}><i className="ti ti-plus" /> Add row</button>
          </div>

          {/* Meetings */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Meetings</div>
            {s.meetings.map(m => (
              <div key={m._id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 80px auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input style={smInputStyle} value={m.name} onChange={e => updMeet(m._id, "name", e.target.value)} placeholder="Meeting name" />
                <select style={smInputStyle} value={m.mtype} onChange={e => updMeet(m._id, "mtype", e.target.value)}>
                  {MEETING_TYPES.map(x => <option key={x}>{x}</option>)}
                </select>
                <input style={{ ...smInputStyle, textAlign: "center" }} type="number" min="0" max="24" step="0.5" value={m.hours} onChange={e => updMeet(m._id, "hours", parseFloat(e.target.value) || 0)} />
                <button onClick={() => remMeet(m._id)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 16, padding: 4 }}><i className="ti ti-x" /></button>
              </div>
            ))}
            <button onClick={addMeet} style={{ fontSize: 12, color: "#3a7bd5", background: "none", border: "1px dashed #93b8ea", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "inherit" }}><i className="ti ti-plus" /> Add row</button>
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: "0.75rem", borderTop: "1px solid #ececea" }}>
            <Btn variant="primary" onClick={handleSave}><i className="ti ti-device-floppy" /> Save changes</Btn>
            <Btn variant="danger" onClick={() => onDelete(s.id)}><i className="ti ti-trash" /> Delete</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("choose");
  const [submitted, setSubmitted] = useState(null);
  const [masterUnlocked, setMasterUnlocked] = useState(false);

  const bgStyle = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#f5f5f0", minHeight: "100vh", padding: "2rem 1rem", color: "#1a1a1a" };
  const pageStyle = { maxWidth: mode === "master" ? 900 : 700, margin: "0 auto" };

  if (mode === "choose") return (
    <div style={bgStyle}>
      <div style={{ ...pageStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", textAlign: "center", gap: "1.5rem" }}>
        <div style={{ fontSize: 40, color: "#2a6dd9" }}><i className="ti ti-chart-bar" /></div>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Daily productivity tracker</h1>
        <p style={{ fontSize: 14, color: "#666", maxWidth: 340 }}>Are you filling in your daily log, or accessing the master dashboard?</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Btn variant="primary" onClick={() => setMode("associate")} style={{ padding: "12px 24px", fontSize: 14 }}><i className="ti ti-edit" /> Fill my daily form</Btn>
          <Btn variant="outline" onClick={() => setMode("master")} style={{ padding: "12px 24px", fontSize: 14 }}><i className="ti ti-layout-dashboard" /> Master dashboard</Btn>
        </div>
      </div>
    </div>
  );

  if (mode === "associate") return (
    <div style={bgStyle}>
      <div style={pageStyle}>
        {submitted ? <SuccessScreen sub={submitted} /> : <AssociateForm onSubmitDone={setSubmitted} />}
      </div>
    </div>
  );

  if (mode === "master") return (
    <div style={bgStyle}>
      <div style={pageStyle}>
        {masterUnlocked ? <MasterDashboard /> : <MasterLogin onUnlock={() => setMasterUnlocked(true)} />}
      </div>
    </div>
  );
}
