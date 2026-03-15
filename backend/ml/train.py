import pandas as pd
import numpy as np
import psycopg2
import pickle
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score


print("Connecting to database...")

conn = psycopg2.connect(
    host="localhost",
    database="air_quality",
    user="postgres",
    password="moksha123"   
)

query = """
    SELECT
        city,
        measured_at,
        MAX(CASE WHEN parameter = 'pm25'             THEN value END) AS pm25,
        MAX(CASE WHEN parameter = 'pm10'             THEN value END) AS pm10,
        MAX(CASE WHEN parameter = 'pm1'              THEN value END) AS pm1,
        MAX(CASE WHEN parameter = 'no2'              THEN value END) AS no2,
        MAX(CASE WHEN parameter = 'no'               THEN value END) AS no,
        MAX(CASE WHEN parameter = 'nox'              THEN value END) AS nox,
        MAX(CASE WHEN parameter = 'so2'              THEN value END) AS so2,
        MAX(CASE WHEN parameter = 'co'               THEN value END) AS co,
        MAX(CASE WHEN parameter = 'o3'               THEN value END) AS o3,
        MAX(CASE WHEN parameter = 'temperature'      THEN value END) AS temperature,
        MAX(CASE WHEN parameter = 'relativehumidity' THEN value END) AS relativehumidity,
        MAX(CASE WHEN parameter = 'wind_speed'       THEN value END) AS wind_speed,
        MAX(CASE WHEN parameter = 'wind_direction'   THEN value END) AS wind_direction,
        MAX(CASE WHEN parameter = 'um003'            THEN value END) AS um003
    FROM aqi_readings
    WHERE measured_at >= '2025-01-01'
        OR (measured_at >= '2022-01-01' AND measured_at < '2023-01-01')
        OR (measured_at >= '2018-01-01' AND measured_at < '2019-01-01')
    GROUP BY city, measured_at
    ORDER BY measured_at ASC;
"""

df = pd.read_sql(query, conn)
conn.close()

print(f" Loaded {len(df)} rows from database!")
print(f" Columns: {list(df.columns)}")
print(df.head())


print("\n Creating AQI target column from pm25...")

def pm25_to_aqi(pm25):
    """Convert PM2.5 concentration to AQI using US EPA formula"""
    if pd.isna(pm25) or pm25 < 0:
        return np.nan
    elif pm25 <= 12.0:
        return ((50 - 0) / (12.0 - 0)) * (pm25 - 0) + 0
    elif pm25 <= 35.4:
        return ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51
    elif pm25 <= 55.4:
        return ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101
    elif pm25 <= 150.4:
        return ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151
    elif pm25 <= 250.4:
        return ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201
    else:
        return ((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5) + 301

df['aqi_value'] = df['pm25'].apply(pm25_to_aqi)

df = df.dropna(subset=['aqi_value'])
print(f"✅ AQI column created! {len(df)} rows with valid AQI values")

print("\n🔧 Engineering features...")

df['measured_at'] = pd.to_datetime(df['measured_at'])
df = df.sort_values('measured_at')

df['hour']       = df['measured_at'].dt.hour
df['day']        = df['measured_at'].dt.day
df['month']      = df['measured_at'].dt.month
df['weekday']    = df['measured_at'].dt.weekday
df['is_weekend'] = (df['weekday'] >= 5).astype(int)

df['aqi_lag_1h']  = df.groupby('city')['aqi_value'].shift(1)
df['aqi_lag_3h']  = df.groupby('city')['aqi_value'].shift(3)
df['aqi_lag_24h'] = df.groupby('city')['aqi_value'].shift(24)

df['aqi_rolling_3h']  = df.groupby('city')['aqi_value'].transform(
    lambda x: x.rolling(window=3, min_periods=1).mean()
)
df['aqi_rolling_24h'] = df.groupby('city')['aqi_value'].transform(
    lambda x: x.rolling(window=24, min_periods=1).mean()
)

df = df.dropna(subset=['aqi_lag_1h', 'aqi_lag_3h'])

print(f"✅ Features engineered! {len(df)} rows ready for training")


print("\n📋 Defining features and target...")

feature_columns = [
    'pm25', 'pm10', 'pm1', 'no2', 'no', 'nox', 'so2', 'co', 'o3', 'um003',
    'temperature', 'relativehumidity', 'wind_speed', 'wind_direction',
    'hour', 'day', 'month', 'weekday', 'is_weekend',
    'aqi_lag_1h', 'aqi_lag_3h', 'aqi_lag_24h',
    'aqi_rolling_3h', 'aqi_rolling_24h'
]

available_features = [
    col for col in feature_columns
    if col in df.columns and df[col].notna().sum() > 10
]

X = df[available_features].fillna(df[available_features].median())
y = df['aqi_value']

print(f" Features used ({len(available_features)}): {available_features}")
print(f" X shape: {X.shape}, y shape: {y.shape}")


print("\n  Splitting into train/test sets (80/20)...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False 
)

print(f" Training rows: {len(X_train)}")
print(f" Testing rows:  {len(X_test)}")


print("\n Training XGBoost model...")

model = XGBRegressor(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbosity=1
)

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=50
)

print(" Model trained!")

print("\n Evaluating model performance...")

y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2  = r2_score(y_test, y_pred)

print(f" Mean Absolute Error (MAE): {mae:.2f}")
print(f" R² Score:                  {r2:.4f}")
print()
print(f"   MAE = {mae:.2f} → predictions off by ~{mae:.1f} AQI points on average")
print(f"   R²  = {r2:.4f} → model explains {r2*100:.1f}% of AQI variation")

if r2 > 0.85:
    print("\n🔥 EXCELLENT model! R² above 0.85 — you crushed it!")
elif r2 > 0.70:
    print("\n👍 GOOD model! R² above 0.70 — solid performance!")
elif r2 > 0.50:
    print("\n🙂 DECENT model! More data will improve it.")
else:
    print("\n🤔 Needs more data or tuning. Let's fix it!")

print("\n Top features by importance:")
importance_df = pd.DataFrame({
    'feature': available_features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print(importance_df.head(10).to_string(index=False))

print("\n Saving model.pkl and features.pkl...")

with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

with open("features.pkl", "wb") as f:
    pickle.dump(available_features, f)

print(" model.pkl saved!")
print(" features.pkl saved!")
print()
print("=" * 50)
print(" Phase 5 COMPLETE! Model trained and saved!")
print("=" * 50)
print(" Next: predict.py — time to make forecasts!")