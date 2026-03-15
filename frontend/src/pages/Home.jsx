// src/pages/Home.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import AQICard from "../components/AQICard";
import ForecastChart from "../components/ForecastChart";
import Map from "../components/Map";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const fadeIn = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up {
    opacity: 0;
    animation: fadeUp 0.5s ease forwards;
  }
  .fade-up-1 { animation-delay: 0.05s; }
  .fade-up-2 { animation-delay: 0.15s; }
  .fade-up-3 { animation-delay: 0.25s; }
  .fade-up-4 { animation-delay: 0.35s; }
  .fade-up-5 { animation-delay: 0.45s; }
  .fade-up-6 { animation-delay: 0.55s; }
`;

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "right", lineHeight: 1.3 }}>
      <div style={{ fontSize: "22px", fontWeight: 700, color: "#1e293b", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
        {time.toLocaleTimeString()}
      </div>
      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
        {time.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

function getAQICategory(aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (Sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

const CATEGORY_COLORS = {
  "Good": "#22c55e",
  "Moderate": "#f59e0b",
  "Unhealthy (Sensitive)": "#f97316",
  "Unhealthy": "#ef4444",
  "Very Unhealthy": "#9333ea",
  "Hazardous": "#881337",
};

const card = {
  background: "#fff",
  borderRadius: "16px",
  border: "1px solid #f1f5f9",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  padding: "22px 26px",
};

const sectionLabel = {
  fontSize: "10px",
  fontWeight: 700,
  color: "#94a3b8",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "10px",
};

export default function Home() {
  const [forecasts, setForecasts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  useEffect(() => {
    fetchData();
    fetchWeather();
  }, []);

  const latest = forecasts[0];
  const latestAqi = latest?.predicted_value ?? null;
  const cityData = { Hyderabad: latestAqi };

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

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#1e293b" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        ${fadeIn}
      `}</style>

      {/* Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 48px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
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
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>AirCast Hyderabad</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>Hyper-Local Air Quality Forecaster</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <LiveClock />
          <div style={{ width: "1px", height: "28px", background: "#e2e8f0" }} />
          {lastUpdated && (
            <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
              <div style={{ fontWeight: 600, color: "#64748b", fontSize: "11px" }}>Last updated</div>
              <div>{lastUpdated}</div>
            </div>
          )}
          <button
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
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "12px", padding: "12px 16px", fontSize: "13px" }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "80px 0", fontSize: "15px" }}>
            Loading dashboard...
          </div>
        ) : (
          <>
            {/* Row 1: AQI + Weather */}
            <div className="fade-up fade-up-1" style={{ display: "flex", gap: "20px", alignItems: "stretch" }}>
              <div style={{ flexShrink: 0 }}>
                <div style={sectionLabel}>Current AQI</div>
                <AQICard city="Hyderabad" aqi={latestAqi} forecastAt={latest?.forecast_at} />
              </div>

              {weather && (
                <div style={{ flex: 1 }}>
                  <div style={sectionLabel}>Live Weather</div>
                  <div style={{ display: "flex", gap: "14px", height: "calc(100% - 26px)" }}>
                    {[
                      { icon: "🌡️", value: `${weather.temperature}°C`, label: "Temperature", color: "#fef3c7", accent: "#d97706" },
                      { icon: "💧", value: `${weather.humidity}%`, label: "Humidity", color: "#eff6ff", accent: "#3b82f6" },
                      { icon: "💨", value: `${weather.wind_speed} km/h`, label: "Wind Speed", color: "#f0fdf4", accent: "#16a34a" },
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
                      }}>
                        <div style={{ fontSize: "22px" }}>{w.icon}</div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: w.accent, letterSpacing: "-1px" }}>{w.value}</div>
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>{w.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Row 2: PM2.5 History */}
            {history.length > 0 && (
              <div className="fade-up fade-up-2" style={card}>
                <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>PM2.5 — Last 24 Hours</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Actual sensor readings from Hyderabad stations</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 600, background: "#eff6ff", padding: "4px 12px", borderRadius: "99px", border: "1px solid #bfdbfe" }}>
                    Raw Data
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: "12px" }}
                      formatter={(val) => [`${val} µg/m³`, "PM2.5"]}
                    />
                    <Line type="monotone" dataKey="PM25" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Row 3: Pie + Map */}
            <div className="fade-up fade-up-3" style={{ display: "flex", gap: "20px" }}>
              {pieData.length > 0 && (
                <div style={{ ...card, flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>AQI Category Breakdown</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>Hours in each category (last 24h)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#6b7280"} />
                        ))}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                      <Tooltip formatter={(val) => [`${val} hrs`]} contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 22px 8px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" }}>Map View</div>
                <div style={{ height: "272px" }}>
                  <Map cityData={cityData} />
                </div>
              </div>
            </div>

            {/* Row 4: Forecast */}
            <div className="fade-up fade-up-4" style={card}>
              <ForecastChart forecasts={forecasts} />
            </div>

            {/* Row 5: Health Advisory */}
            {latestAqi !== null && (
              <div className="fade-up fade-up-5" style={{
                background: latestAqi <= 50 ? "#f0fdf4" : latestAqi <= 100 ? "#fffbeb" : latestAqi <= 150 ? "#fff7ed" : "#fef2f2",
                border: `1px solid ${latestAqi <= 50 ? "#bbf7d0" : latestAqi <= 100 ? "#fde68a" : latestAqi <= 150 ? "#fed7aa" : "#fecaca"}`,
                borderRadius: "14px",
                padding: "14px 20px",
                fontSize: "13px",
                fontWeight: 500,
                color: latestAqi <= 50 ? "#166534" : latestAqi <= 100 ? "#92400e" : latestAqi <= 150 ? "#9a3412" : "#991b1b",
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