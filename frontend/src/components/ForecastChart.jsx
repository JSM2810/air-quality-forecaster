// src/components/ForecastChart.jsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";

const getLineColor = (avg) => {
  if (avg <= 50)  return { stroke: "#22c55e", fill: "#22c55e" };
  if (avg <= 100) return { stroke: "#f59e0b", fill: "#f59e0b" };
  if (avg <= 150) return { stroke: "#f97316", fill: "#f97316" };
  if (avg <= 200) return { stroke: "#ef4444", fill: "#ef4444" };
  return { stroke: "#9333ea", fill: "#9333ea" };
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        fontSize: "12px",
      }}>
        <div style={{ color: "#94a3b8", marginBottom: "4px" }}>{label}</div>
        <div style={{ fontWeight: 700, fontSize: "18px", color: "#0f172a" }}>{val}</div>
        <div style={{ color: "#94a3b8", fontSize: "10px" }}>AQI (PM2.5)</div>
      </div>
    );
  }
  return null;
};

export default function ForecastChart({ forecasts }) {
  if (!forecasts || forecasts.length === 0) {
    return (
      <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0", fontSize: "13px" }}>
        No forecast data available yet.
      </div>
    );
  }

  const data = forecasts.map((f) => ({
    time: new Date(f.forecast_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    AQI: Math.round(f.predicted_value),
  }));

  const avgAqi = data.reduce((sum, d) => sum + d.AQI, 0) / data.length;
  const { stroke, fill } = getLineColor(avgAqi);

  return (
    <div>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>24-Hour AQI Forecast</div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>ML-predicted air quality for the next 24 hours</div>
        </div>
        <div style={{
          background: `${fill}18`,
          color: stroke,
          fontSize: "11px",
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: "99px",
          border: `1px solid ${fill}33`,
        }}>
          Avg AQI: {Math.round(avgAqi)}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fill} stopOpacity={0.15} />
              <stop offset="95%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={50}  stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={150} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Area
            type="monotone"
            dataKey="AQI"
            stroke={stroke}
            strokeWidth={2.5}
            fill="url(#aqiGradient)"
            dot={false}
            activeDot={{ r: 5, fill: stroke, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}