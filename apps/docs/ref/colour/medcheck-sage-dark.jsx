import { useState } from "react";

// ── Sage Serenity Token System ──────────────────────────────────────────────
const DARK = {
  bg:           "#1A1E1C",   // deepest background
  surface:      "#252A27",   // card / sheet surface
  surfaceAlt:   "#2E3531",   // nested surface / input bg
  surfaceHigh:  "#363D39",   // hover / elevated
  primary:      "#7BAF9A",   // sage green
  primaryDim:   "#4A6A5A",   // muted primary for tags
  text:         "#E8EAE6",   // primary text
  textMuted:    "#9AA59F",   // secondary text
  textFaint:    "#5A6560",   // placeholder / disabled
  accent:       "#E05C4C",   // red — alerts, CTAs, side effects
  accentDim:    "#4A2522",   // red dim bg
  border:       "#3A4240",   // subtle dividers
  borderStrong: "#4A5450",   // stronger dividers
  success:      "#7BAF9A",   // same as primary
  warning:      "#D4A017",   // amber warning
  warningDim:   "#3A2A08",
};

const LIGHT = {
  bg:           "#F5F4F0",
  surface:      "#ECEAE3",
  surfaceAlt:   "#E2DFD5",
  surfaceHigh:  "#D8D5C8",
  primary:      "#5C7A6B",
  primaryDim:   "#C8DDD6",
  text:         "#2C2F2D",
  textMuted:    "#6B7570",
  textFaint:    "#A0A8A4",
  accent:       "#C0392B",
  accentDim:    "#F5E0DC",
  border:       "#D4D0C7",
  borderStrong: "#BDB9B0",
  success:      "#5C7A6B",
  warning:      "#B8860B",
  warningDim:   "#F5EDD0",
};

// ── Tiny reusable components ─────────────────────────────────────────────────
const Tag = ({ children, color, bg, style = {} }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    background: bg, color, borderRadius: 6,
    padding: "2px 8px", fontSize: 10, fontWeight: 600,
    letterSpacing: "0.02em", ...style,
  }}>
    {children}
  </span>
);

const Pill = ({ children, c }) => (
  <span style={{
    background: c.surfaceAlt, color: c.textMuted,
    borderRadius: 20, padding: "3px 10px",
    fontSize: 10, fontWeight: 500,
  }}>
    {children}
  </span>
);

const Divider = ({ c }) => (
  <div style={{ height: 1, background: c.border, margin: "14px 0" }} />
);

// ── Medicine detail bottom-sheet ─────────────────────────────────────────────
const DetailSheet = ({ c, onClose }) => (
  <div style={{
    position: "absolute", bottom: 0, left: 0, right: 0,
    background: c.surface,
    borderRadius: "20px 20px 0 0",
    padding: "20px 20px 32px",
    border: `1px solid ${c.borderStrong}`,
    boxShadow: "0 -8px 40px rgba(0,0,0,0.35)",
    zIndex: 10,
  }}>
    {/* drag handle */}
    <div style={{
      width: 36, height: 4, borderRadius: 2,
      background: c.border, margin: "0 auto 18px",
    }} />

    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <div>
        <div style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 20, color: c.text, marginBottom: 4,
        }}>
          Paracetamol 500mg
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag color={c.primary} bg={c.primaryDim}>Analgesic</Tag>
          <Tag color={c.primary} bg={c.primaryDim}>Antipyretic</Tag>
        </div>
      </div>
      <button onClick={onClose} style={{
        background: c.surfaceAlt, border: "none", borderRadius: 8,
        color: c.textMuted, cursor: "pointer", padding: "6px 10px",
        fontSize: 14, lineHeight: 1,
      }}>✕</button>
    </div>

    <Divider c={c} />

    {/* Sections */}
    {[
      {
        icon: "💊", label: "Prescribed Dosage",
        content: "Adults: 500–1000 mg every 4–6 hrs · Max 4g/day\nChildren (6–12): 250–500 mg every 4–6 hrs",
        color: c.primary, bg: c.primaryDim,
      },
      {
        icon: "🩺", label: "Use for Symptoms",
        content: "Fever · Headache · Mild to moderate pain\nToothache · Cold & flu relief",
        color: c.primary, bg: c.primaryDim,
      },
      {
        icon: "⚠️", label: "Side Effects",
        content: "Liver damage (overdose) · Nausea · Rash\nBlood disorders (rare)",
        color: c.accent, bg: c.accentDim,
      },
      {
        icon: "🛡️", label: "Take Alongside",
        content: "Vitamin C · Probiotics · Plenty of water\nAvoid: Alcohol, Warfarin, other paracetamol products",
        color: c.warning, bg: c.warningDim,
      },
    ].map(({ icon, label, content, color, bg }) => (
      <div key={label} style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {label}
          </span>
        </div>
        <div style={{
          background: bg, borderRadius: 10, padding: "10px 12px",
          borderLeft: `3px solid ${color}`,
        }}>
          {content.split("\n").map((line, i) => (
            <div key={i} style={{
              fontSize: 12, color: c.text, lineHeight: 1.7,
              opacity: i === 0 ? 1 : 0.75,
            }}>{line}</div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── Main App Screen ──────────────────────────────────────────────────────────
const medicines = [
  {
    name: "Paracetamol 500mg",
    tags: ["Fever", "Headache", "Pain"],
    dose: "500mg · 3× daily",
    qty: "18 left",
    alert: true,
    icon: "💊",
  },
  {
    name: "Ibuprofen 400mg",
    tags: ["Inflammation", "Pain"],
    dose: "400mg · 2× daily",
    qty: "6 left",
    alert: false,
    icon: "🔵",
  },
  {
    name: "Cetirizine 10mg",
    tags: ["Allergy", "Runny nose"],
    dose: "10mg · Once daily",
    qty: "24 left",
    alert: false,
    icon: "🟢",
  },
  {
    name: "Antacid Tablet",
    tags: ["Acidity", "Heartburn"],
    dose: "1–2 tabs · After meals",
    qty: "30 left",
    alert: false,
    icon: "🟡",
  },
];

const Screen = ({ c, isDark, onToggle }) => {
  const [sheet, setSheet] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [search, setSearch] = useState("");

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{
      width: 340,
      height: 680,
      borderRadius: 40,
      background: c.bg,
      border: `8px solid ${isDark ? "#111" : "#E0DDD8"}`,
      boxShadow: isDark
        ? "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px #000"
        : "0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px #ccc",
      overflow: "hidden",
      position: "relative",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Status bar */}
      <div style={{
        background: c.bg, padding: "12px 20px 6px",
        display: "flex", justifyContent: "space-between",
        fontSize: 10, color: c.textMuted, fontWeight: 600, flexShrink: 0,
      }}>
        <span>9:41</span>
        <span>● ● ●</span>
      </div>

      {/* Header */}
      <div style={{ padding: "10px 20px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22, color: c.text, lineHeight: 1.2,
            }}>
              My Medicines
            </div>
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {filtered.length} items in cabinet
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* dark mode toggle */}
            <button onClick={onToggle} style={{
              background: c.surfaceAlt, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: "7px 9px", cursor: "pointer",
              fontSize: 14, lineHeight: 1, color: c.textMuted,
            }}>
              {isDark ? "☀️" : "🌙"}
            </button>
            <div style={{
              background: c.accent, borderRadius: 12,
              width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, cursor: "pointer",
              boxShadow: `0 4px 12px ${c.accent}55`,
            }}>+</div>
          </div>
        </div>

        {/* Search */}
        <div style={{
          background: c.surfaceAlt,
          border: `1px solid ${c.border}`,
          borderRadius: 14, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ color: c.textFaint, fontSize: 13 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicines or symptoms…"
            style={{
              background: "none", border: "none", outline: "none",
              color: c.text, fontFamily: "inherit",
              fontSize: 12, width: "100%",
            }}
          />
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{
        display: "flex", gap: 8, padding: "0 20px 14px", flexShrink: 0,
      }}>
        {[
          { label: "Total", value: "4", color: c.primary },
          { label: "Low stock", value: "1", color: c.accent },
          { label: "Expiring", value: "0", color: c.warning },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, background: c.surface,
            borderRadius: 12, padding: "10px 10px 8px",
            border: `1px solid ${c.border}`,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 9, color: c.textMuted, marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{
        padding: "0 20px 10px",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          Cabinet
        </span>
        <span style={{ fontSize: 11, color: c.primary, fontWeight: 600 }}>Sort ↕</span>
      </div>

      {/* Medicine list — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px", paddingBottom: 80 }}>
        {filtered.map((med, i) => (
          <div
            key={i}
            onClick={() => med.name === "Paracetamol 500mg" && setSheet(true)}
            style={{
              background: c.surface,
              borderRadius: 16, padding: "13px 14px",
              marginBottom: 10,
              border: `1px solid ${c.border}`,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = c.surfaceHigh}
            onMouseLeave={e => e.currentTarget.style.background = c.surface}
          >
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 8,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: c.surfaceAlt,
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 16, flexShrink: 0,
                }}>
                  {med.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 3 }}>
                    {med.name}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {med.tags.map(t => (
                      <Pill key={t} c={c}>{t}</Pill>
                    ))}
                  </div>
                </div>
              </div>
              {med.alert && (
                <Tag color={c.accent} bg={c.accentDim}>⚠ Side FX</Tag>
              )}
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 8, borderTop: `1px solid ${c.border}`,
            }}>
              <span style={{ fontSize: 11, color: c.textMuted }}>{med.dose}</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: med.qty === "6 left" ? c.accent : c.textFaint,
              }}>
                {med.qty}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{
            textAlign: "center", paddingTop: 40,
            color: c.textFaint, fontSize: 13,
          }}>
            No medicines found
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: c.surface,
        borderTop: `1px solid ${c.border}`,
        display: "flex", padding: "10px 0 18px",
        backdropFilter: "blur(10px)",
      }}>
        {[
          { id: "home", icon: "🏠", label: "Home" },
          { id: "scan", icon: "📷", label: "Scan" },
          { id: "history", icon: "📋", label: "History" },
          { id: "profile", icon: "👤", label: "Profile" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, background: "none", border: "none",
              cursor: "pointer", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 3,
              padding: 0,
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: activeTab === tab.id ? c.primary : c.textFaint,
            }}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div style={{
                width: 4, height: 4, borderRadius: "50%",
                background: c.primary, marginTop: 1,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Detail sheet overlay */}
      {sheet && (
        <>
          <div
            onClick={() => setSheet(false)}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.5)", zIndex: 9,
            }}
          />
          <DetailSheet c={c} onClose={() => setSheet(false)} />
        </>
      )}
    </div>
  );
};

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(true);
  const c = isDark ? DARK : LIGHT;

  return (
    <div style={{
      minHeight: "100vh",
      background: isDark
        ? "radial-gradient(ellipse at 30% 20%, #1E2A26 0%, #111614 60%, #0D0F0E 100%)"
        : "radial-gradient(ellipse at 30% 20%, #EAE9E2 0%, #F5F4F0 60%, #EDECE6 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px",
      transition: "background 0.4s",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Label above phone */}
      <div style={{
        marginBottom: 28, textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: isDark ? "#252A27" : "#ECEAE3",
          border: `1px solid ${isDark ? "#3A4240" : "#D4D0C7"}`,
          borderRadius: 20, padding: "6px 16px", marginBottom: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isDark ? "#7BAF9A" : "#5C7A6B",
            boxShadow: `0 0 6px ${isDark ? "#7BAF9A" : "#5C7A6B"}`,
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: isDark ? "#9AA59F" : "#6B7570",
            letterSpacing: "0.04em",
          }}>
            Sage Serenity — {isDark ? "Dark Mode" : "Light Mode"}
          </span>
        </div>
        <div style={{
          fontSize: 11, color: isDark ? "#5A6560" : "#A0A8A4",
        }}>
          Click the {isDark ? "☀️" : "🌙"} icon inside the phone · Tap Paracetamol to see details
        </div>
      </div>

      {/* Phone */}
      <Screen c={c} isDark={isDark} onToggle={() => setIsDark(!isDark)} />

      {/* Token legend below */}
      <div style={{
        marginTop: 36,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 8, maxWidth: 480, width: "100%",
      }}>
        {Object.entries(c).map(([key, val]) => (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: isDark ? "#1E2420" : "#ECEAE3",
            border: `1px solid ${isDark ? "#3A4240" : "#D4D0C7"}`,
            borderRadius: 8, padding: "6px 10px",
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: val, border: "1px solid rgba(0,0,0,0.15)",
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 8, color: isDark ? "#5A6560" : "#A0A8A4", fontFamily: "monospace" }}>
                {key}
              </div>
              <div style={{ fontSize: 9, color: isDark ? "#9AA59F" : "#6B7570", fontFamily: "monospace" }}>
                {val}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
