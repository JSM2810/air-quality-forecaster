# 🌍 AirCast Hyderabad — Hyper-Local Air Quality Forecaster

A full-stack air quality forecasting web app for Hyderabad, India. Fetches real sensor data from OpenAQ, trains an XGBoost ML model, and displays 24-hour PM2.5 AQI forecasts on a polished React dashboard.

---

## 🚀 Features

- 📡 **Real AQI Data** — Pulls live sensor readings from OpenAQ v3 API
- 🤖 **ML Forecasting** — XGBoost model with R²=0.9888, predicts next 24 hours of PM2.5 AQI
- 🌤️ **Live Weather** — Temperature, humidity, wind speed via Open-Meteo API (no key needed)
- 📊 **Interactive Dashboard** — Area charts, pie charts, AQI progress bar, color-coded weather cards
- 🗺️ **Map View** — Leaflet map with AQI color-coded marker for Hyderabad
- 🌙 **Dark / Light Mode** — Full theme toggle
- ⏱️ **Auto Scheduler** — APScheduler fetches fresh data every 6 hours
- ⚠️ **Data Staleness Label** — Clearly shows "Last available: Jul 2025" when upstream data is stale

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Recharts, Leaflet, Axios |
| **Backend** | FastAPI, SQLAlchemy, psycopg2, APScheduler |
| **ML** | XGBoost, Pandas, Scikit-learn |
| **Database** | PostgreSQL |
| **Data Sources** | OpenAQ v3 API, Open-Meteo API |

---

## 📁 Project Structure

```
air-quality-forecaster/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── database.py          # DB connection (SQLAlchemy)
│   ├── models.py            # ORM table definitions
│   ├── schemas.py           # Pydantic validation schemas
│   ├── routes/
│   │   ├── aqi.py           # AQI endpoints (/latest, /history, /parameter)
│   │   └── forecast.py      # Forecast endpoints (/city, /latest, /run)
│   ├── services/
│   │   ├── fetcher.py       # OpenAQ data fetcher
│   │   └── scheduler.py     # APScheduler auto-fetch (every 6h)
│   ├── ml/
│   │   ├── train.py         # XGBoost model training
│   │   ├── predict.py       # 24-hour forecast generation
│   │   ├── model.pkl        # Trained model
│   │   └── features.pkl     # Feature list
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AQICard.jsx
│       │   ├── ForecastChart.jsx
│       │   ├── Map.jsx
│       │   └── HealthAdvisory.jsx
│       ├── pages/
│       │   └── Home.jsx
│       ├── App.jsx
│       └── main.jsx
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (local)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/air-quality-forecaster.git
cd air-quality-forecaster
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost/air_quality
OPENAQ_API_KEY=your_openaq_api_key_here
```

Run the backend:

```bash
python -m uvicorn main:app --reload
```

### 3. Fetch historical data

```bash
python services/fetcher.py
```

### 4. Train the ML model

```bash
python ml/train.py
```

### 5. Generate forecasts

```bash
python ml/predict.py
```

### 6. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Database Schema

### `aqi_readings`
Stores raw sensor measurements from OpenAQ.

| Column | Type | Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | Auto ID |
| city | VARCHAR | City name |
| country | VARCHAR | Country code |
| location_name | VARCHAR | Sensor station name |
| latitude | FLOAT | Sensor latitude |
| longitude | FLOAT | Sensor longitude |
| parameter | VARCHAR | Pollutant (pm25, no2, etc.) |
| value | FLOAT | Measured value |
| unit | VARCHAR | Unit (µg/m³) |
| measured_at | TIMESTAMPTZ | Measurement timestamp |

### `aqi_forecasts`
Stores ML model predictions.

| Column | Type | Description |
|---|---|---|
| id | SERIAL PRIMARY KEY | Auto ID |
| city | VARCHAR | City name |
| predicted_value | FLOAT | Predicted AQI value |
| forecast_at | TIMESTAMPTZ | Forecasted timestamp |
| run_at | TIMESTAMPTZ | When the model ran |

---

## 🤖 ML Model Details

- **Algorithm:** XGBoost Regressor
- **Features (22 total):** pm25, pm10, no2, rolling averages (3h, 6h, 12h, 24h), lag features (1h, 2h, 3h, 6h, 12h, 24h), time features (hour, day of week, month, is_weekend)
- **Performance:** R² = 0.9888 | MAE = 1.51
- **Output:** 24-hour hourly AQI forecasts stored in `aqi_forecasts`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/aqi/latest` | Latest AQI reading |
| GET | `/api/aqi/history/city` | Last 24h history for a city |
| GET | `/api/forecast/city` | 24h forecast for a city |
| GET | `/api/forecast/latest` | Most recent forecast entry |
| POST | `/api/forecast/run` | Trigger forecast manually |
| GET | `/api/weather/current` | Live weather for Hyderabad |

---

## ⚠️ Known Issues & Limitations

### 🔴 Stale AQI Data (OpenAQ API Upstream Issue)
This is the most visible limitation of the app right now.

**What you see:** The dashboard shows AQI data from **July 2025** instead of current readings.

**Why it happens:** OpenAQ is an open-source, community-driven platform that aggregates sensor data from government agencies like TSPCB (Telangana State Pollution Control Board). The Hyderabad sensors on OpenAQ stopped syncing after July 2025 — this is an **upstream data pipeline issue on OpenAQ's side**, completely outside our control.

**What we've done about it:**
- The dashboard displays a clear amber warning: *"Last available: Jul 2025"* so users know the data is not live
- The auto-scheduler (`fetcher.py`) continues to poll OpenAQ every 6 hours — the moment OpenAQ resumes syncing Hyderabad data, the app will automatically pick it up and display fresh readings
- The ML forecast model still runs and generates predictions based on the most recent available data

**Workaround / Future fix:** Integrate a secondary real-time data source (e.g. WAQI API, IQAir API, or direct TSPCB scraping) as a fallback when OpenAQ data is stale.

### 🟡 Hyderabad Only
The ML model is trained exclusively on Hyderabad data. Multi-city support (Mumbai, Delhi, Bangalore) was explored but dropped to keep the model accurate and focused.

---

## 🔮 Roadmap

- [ ] Integrate fallback real-time data source (WAQI / IQAir API)
- [ ] Multi-city support with city selector
- [ ] LSTM model for longer-range forecasts
- [ ] Push notifications for unhealthy AQI alerts

---

## 📄 License

MIT License — feel free to use, modify, and build on this project.

---

Built with ❤️ for Hyderabad 🌿