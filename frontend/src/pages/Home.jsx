// src/pages/Home.jsx
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import AQICard from "../components/AQICard";
import ForecastChart from "../components/ForecastChart";
import Map from "../components/Map";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
  ReferenceLine, ReferenceArea
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ── Animated AQI Number ─────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const start = performance.now();
    const from = 0;
    const to = value;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(from + (to - from) * ease));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span>{display}</span>;
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = "20px", radius = "8px", dark = false }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: dark ? "rgba(255,255,255,0.07)" : "#e2e8f0",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: dark
          ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)"
          : "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
        animation: "shimmer 1.4s infinite",
      }} />
    </div>
  );
}

function SkeletonDashboard({ dark }) {
  const cardBg = dark ? "#0f172a" : "#fff";
  const border = dark ? "#334155" : "#e2e8f0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Row 1 */}
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ width: "220px", background: cardBg, borderRadius: "16px", border: `1px solid ${border}`, padding: "22px 26px" }}>
          <Skeleton w="80px" h="12px" dark={dark} />
          <div style={{ marginTop: "16px" }}><Skeleton w="100px" h="60px" radius="12px" dark={dark} /></div>
          <div style={{ marginTop: "12px" }}><Skeleton w="70px" h="14px" dark={dark} /></div>
          <div style={{ marginTop: "8px" }}><Skeleton w="100%" h="6px" radius="99px" dark={dark} /></div>
        </div>
        <div style={{ flex: 1, display: "flex", gap: "14px" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ flex: 1, background: cardBg, borderRadius: "16px", border: `1px solid ${border}`, padding: "20px 22px" }}>
              <Skeleton w="30px" h="30px" radius="50%" dark={dark} />
              <div style={{ marginTop: "12px" }}><Skeleton w="80px" h="32px" radius="8px" dark={dark} /></div>
              <div style={{ marginTop: "8px" }}><Skeleton w="60px" h="11px" dark={dark} /></div>
            </div>
          ))}
        </div>
      </div>
      {/* Row 2 */}
      <div style={{ background: cardBg, borderRadius: "16px", border: `1px solid ${border}`, padding: "22px 26px" }}>
        <Skeleton w="180px" h="14px" dark={dark} />
        <div style={{ marginTop: "6px" }}><Skeleton w="240px" h="11px" dark={dark} /></div>
        <div style={{ marginTop: "20px" }}><Skeleton w="100%" h="180px" radius="12px" dark={dark} /></div>
      </div>
      {/* Row 3 */}
      <div style={{ display: "flex", gap: "20px" }}>
        {[0,1].map(i => (
          <div key={i} style={{ flex: 1, background: cardBg, borderRadius: "16px", border: `1px solid ${border}`, padding: "22px 26px" }}>
            <Skeleton w="140px" h="14px" dark={dark} />
            <div style={{ marginTop: "20px" }}><Skeleton w="100%" h="200px" radius="12px" dark={dark} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock({ dark }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "right", lineHeight: 1.3 }}>
      <div style={{ fontSize: "22px", fontWeight: 700, color: dark ? "#f1f5f9" : "#1e293b", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
        {time.toLocaleTimeString()}
      </div>
      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
        {time.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getAQICategory(aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (Sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function getAQIColor(aqi) {
  if (!aqi) return "#6b7280";
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#f59e0b";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#9333ea";
  return "#881337";
}

const CATEGORY_COLORS = {
  "Good": "#22c55e",
  "Moderate": "#f59e0b",
  "Unhealthy (Sensitive)": "#f97316",
  "Unhealthy": "#ef4444",
  "Very Unhealthy": "#9333ea",
  "Hazardous": "#881337",
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [forecasts, setForecasts]     = useState([]);
  const [weather, setWeather]         = useState(null);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dark, setDark]               = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [forecastRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/api/forecast/city`, { params: { name: "Hyderabad" } }),
        axios.get(`${API_BASE}/api/aqi/history/city`, { params: { name: "Hyderabad" } }),
      ]);
      setForecasts(forecastRes.data);
      setHistory(historyRes.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      setError("Could not load data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/weather/current`);
      setWeather(res.data);
    } catch (err) {
      console.error("Weather fetch failed:", err);
    }
  };

  useEffect(() => { fetchData(); fetchWeather(); }, []);

  const latest    = forecasts[0];
  const latestAqi = latest?.predicted_value ?? null;
  const aqiColor  = getAQIColor(latestAqi);
  const cityData  = { Hyderabad: latestAqi };

  const categoryCounts = {};
  history.forEach((h) => {
    const cat = getAQICategory(h.value);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

  const historyChartData = history.map((h) => ({
    time: new Date(h.measured_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    PM25: h.value,
  }));

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const bg       = dark ? "#0a0f1e" : "#f8fafc";
  const cardBg   = dark ? "#111827" : "#ffffff";
  const cardBorder = dark ? "#1e293b" : "#f1f5f9";
  const textPrimary   = dark ? "#f1f5f9" : "#0f172a";
  const textSecondary = dark ? "#94a3b8" : "#94a3b8";
  const headerBg = dark ? "#0f172a" : "#ffffff";
  const headerBorder = dark ? "#1e293b" : "#e2e8f0";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";
  const tooltipBg = dark ? "#1e293b" : "#ffffff";
  const tooltipBorder = dark ? "#334155" : "#e2e8f0";

  const card = {
    background: cardBg,
    borderRadius: "16px",
    border: `1px solid ${cardBorder}`,
    boxShadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    padding: "22px 26px",
  };

  const sectionLabel = {
    fontSize: "10px",
    fontWeight: 700,
    color: textSecondary,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "10px",
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: textPrimary, transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        .fade-up { opacity: 0; animation: fadeUp 0.5s ease forwards; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.15s; }
        .fade-up-3 { animation-delay: 0.25s; }
        .fade-up-4 { animation-delay: 0.35s; }
        .fade-up-5 { animation-delay: 0.45s; }
        .dark-toggle:hover { opacity: 0.8; }
        .refresh-btn:hover { opacity: 0.85; transform: scale(1.02); }
        .refresh-btn { transition: opacity 0.15s, transform 0.15s; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        background: headerBg,
        borderBottom: `1px solid ${headerBorder}`,
        padding: "0 48px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "background 0.3s, border-color 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "17px", boxShadow: "0 2px 8px rgba(59,130,246,0.3)"
          }}>🌍</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: textPrimary, letterSpacing: "-0.3px" }}>AirCast Hyderabad</div>
            <div style={{ fontSize: "10px", color: textSecondary, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>Hyper-Local Air Quality Forecaster</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <LiveClock dark={dark} />
          <div style={{ width: "1px", height: "28px", background: headerBorder }} />

          {/* Dark mode toggle */}
          <button
            className="dark-toggle"
            onClick={() => setDark(d => !d)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: dark ? "#1e293b" : "#f1f5f9",
              border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
              borderRadius: "10px",
              width: "38px", height: "38px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "17px",
              transition: "background 0.2s",
            }}
          >
            {dark ? "☀️" : "🌙"}
          </button>

          {lastUpdated && (
            <div style={{ fontSize: "11px", color: textSecondary, textAlign: "center" }}>
              <div style={{ fontWeight: 600, color: dark ? "#64748b" : "#64748b", fontSize: "11px" }}>Last updated</div>
              <div>{lastUpdated}</div>
            </div>
          )}
          <button
            className="refresh-btn"
            onClick={() => { fetchData(); fetchWeather(); }}
            style={{
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
              fontFamily: "inherit",
              letterSpacing: "-0.2px",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 40px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {error && (
          <div style={{ background: dark ? "#2d0f0f" : "#fef2f2", border: `1px solid ${dark ? "#7f1d1d" : "#fecaca"}`, color: "#ef4444", borderRadius: "12px", padding: "12px 16px", fontSize: "13px" }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <SkeletonDashboard dark={dark} />
        ) : (
          <>
            {/* ── Row 1: AQI + Weather ── */}
            <div className="fade-up fade-up-1" style={{ display: "flex", gap: "20px", alignItems: "stretch" }}>
              <div style={{ flexShrink: 0 }}>
                <div style={sectionLabel}>Current AQI</div>
                {/* Custom AQI card with animated number */}
                <div style={{
                  ...card,
                  minWidth: "200px",
                  borderTop: `3px solid ${aqiColor}`,
                }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: aqiColor, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    📍 Hyderabad
                  </div>
                  <div style={{ fontSize: "64px", fontWeight: 800, color: aqiColor, letterSpacing: "-3px", lineHeight: 1.1, margin: "8px 0 4px" }}>
                    <AnimatedNumber value={latestAqi} />
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: aqiColor }}>
                    {getAQICategory(latestAqi)}
                  </div>
                  <div style={{ marginTop: "10px", height: "5px", borderRadius: "99px", background: dark ? "#1e293b" : "#f1f5f9", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min((latestAqi / 300) * 100, 100)}%`,
                      background: aqiColor,
                      borderRadius: "99px",
                      transition: "width 1.2s ease",
                    }} />
                  </div>
                  {latest?.forecast_at && (
                      <div style={{ fontSize: "10px", color: textSecondary, marginTop: "8px" }}>
                        PM2.5 AQI Forecast
                      </div>
                  )}
                  {history.length > 0 && (
                    <div style={{
                      fontSize: "10px",
                      color: "#f59e0b",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      ⚠️ Last available data: {new Date(history[0].measured_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
              </div>

              {weather && (
                <div style={{ flex: 1 }}>
                  <div style={sectionLabel}>Live Weather</div>
                  <div style={{ display: "flex", gap: "14px", height: "calc(100% - 26px)" }}>
                    {[
                      { icon: "🌡️", value: `${weather.temperature}°C`, label: "Temperature", color: dark ? "#2d1a00" : "#fef3c7", accent: "#d97706" },
                      { icon: "💧", value: `${weather.humidity}%`, label: "Humidity", color: dark ? "#0c1a2e" : "#eff6ff", accent: "#3b82f6" },
                      { icon: "💨", value: `${weather.wind_speed} km/h`, label: "Wind Speed", color: dark ? "#0a1f0f" : "#f0fdf4", accent: "#16a34a" },
                    ].map((w) => (
                      <div key={w.label} style={{
                        flex: 1,
                        background: w.color,
                        borderRadius: "16px",
                        padding: "20px 22px",
                        border: `1px solid ${w.accent}22`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        transition: "background 0.3s",
                      }}>
                        <div style={{ fontSize: "22px" }}>{w.icon}</div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: w.accent, letterSpacing: "-1px" }}>{w.value}</div>
                        <div style={{ fontSize: "11px", color: dark ? "#94a3b8" : "#64748b", fontWeight: 500 }}>{w.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Row 2: PM2.5 History ── */}
            {history.length > 0 && (
              <div className="fade-up fade-up-2" style={card}>
                <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: textPrimary }}>PM2.5 — Last 24 Hours</div>
                    <div style={{ fontSize: "11px", color: textSecondary, marginTop: "2px" }}>Actual sensor readings from Hyderabad stations</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 600, background: dark ? "#172036" : "#eff6ff", padding: "4px 12px", borderRadius: "99px", border: "1px solid #bfdbfe" }}>
                    Raw Data
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historyChartData}>
                    {/* AQI color zone bands */}
                    <ReferenceArea y1={0}   y2={12}  fill="#22c55e" fillOpacity={0.07} />
                    <ReferenceArea y1={12}  y2={35}  fill="#f59e0b" fillOpacity={0.07} />
                    <ReferenceArea y1={35}  y2={55}  fill="#f97316" fillOpacity={0.07} />
                    <ReferenceArea y1={55}  y2={150} fill="#ef4444" fillOpacity={0.07} />
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: textSecondary }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: textSecondary }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: `1px solid ${tooltipBorder}`, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: "12px", background: tooltipBg, color: textPrimary }}
                      formatter={(val) => [`${val} µg/m³`, "PM2.5"]}
                    />
                    <Line type="monotone" dataKey="PM25" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Row 3: Pie + Map ── */}
            <div className="fade-up fade-up-3" style={{ display: "flex", gap: "20px" }}>
              {pieData.length > 0 && (
                <div style={{ ...card, flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: textPrimary, marginBottom: "4px" }}>AQI Category Breakdown</div>
                  <div style={{ fontSize: "11px", color: textSecondary, marginBottom: "12px" }}>Hours in each category (last 24h)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#6b7280"} />
                        ))}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", color: textSecondary }} />
                      <Tooltip formatter={(val) => [`${val} hrs`]} contentStyle={{ borderRadius: "10px", border: `1px solid ${tooltipBorder}`, fontSize: "12px", background: tooltipBg, color: textPrimary }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 22px 8px", fontSize: "10px", fontWeight: 700, color: textSecondary, letterSpacing: "0.1em", textTransform: "uppercase" }}>Map View</div>
                <div style={{ height: "272px" }}>
                  {/* Pass AQI color to map for colored marker */}
                  <Map cityData={cityData} aqiColor={aqiColor} />
                </div>
              </div>
            </div>

            {/* ── Row 4: Forecast Chart ── */}
            <div className="fade-up fade-up-4" style={card}>
              <ForecastChart forecasts={forecasts} dark={dark} />
            </div>

            {/* ── Row 5: Health Advisory ── */}
            {latestAqi !== null && (
              <div className="fade-up fade-up-5" style={{
                background: latestAqi <= 50
                  ? (dark ? "#052e16" : "#f0fdf4")
                  : latestAqi <= 100
                  ? (dark ? "#2d1a00" : "#fffbeb")
                  : latestAqi <= 150
                  ? (dark ? "#2a1200" : "#fff7ed")
                  : (dark ? "#2d0f0f" : "#fef2f2"),
                border: `1px solid ${latestAqi <= 50 ? "#bbf7d0" : latestAqi <= 100 ? "#fde68a" : latestAqi <= 150 ? "#fed7aa" : "#fecaca"}`,
                borderRadius: "14px",
                padding: "14px 20px",
                fontSize: "13px",
                fontWeight: 500,
                color: latestAqi <= 50 ? "#16a34a" : latestAqi <= 100 ? "#d97706" : latestAqi <= 150 ? "#ea580c" : "#dc2626",
                transition: "background 0.3s",
              }}>
                <strong>💡 Health Advisory:</strong>{" "}
                {latestAqi <= 50 && "Air quality is great! Perfect day for outdoor activities. 🌳"}
                {latestAqi > 50 && latestAqi <= 100 && "Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion."}
                {latestAqi > 100 && latestAqi <= 150 && "Unhealthy for sensitive groups. Keep windows closed and reduce outdoor activity."}
                {latestAqi > 150 && latestAqi <= 200 && "Unhealthy air! Wear a mask outdoors and avoid strenuous activity. 😷"}
                {latestAqi > 200 && "Very poor air quality! Stay indoors and avoid going outside. ☠️"}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}