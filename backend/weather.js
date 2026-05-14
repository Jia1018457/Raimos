import fetch from 'node-fetch';

const WMO = {
  0: '晴天', 1: '基本晴朗', 2: '局部多云', 3: '阴天',
  45: '有雾', 48: '冻雾',
  51: '小毛毛雨', 53: '毛毛雨', 55: '浓密毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  66: '冻雨(小)', 67: '冻雨(大)',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '冰粒',
  80: '阵雨', 81: '中阵雨', 82: '强阵雨',
  85: '小阵雪', 86: '大阵雪',
  95: '雷暴', 96: '轻冰雹雷暴', 99: '强冰雹雷暴',
};

/** Geocode a city name to {lat, lon} using Open-Meteo Geocoding API (free). */
export async function geocodeCity(city) {
  if (!city) return null;
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,
      { signal: AbortSignal.timeout(6_000) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const r = d.results?.[0];
    return r ? { lat: r.latitude, lon: r.longitude, timezone: r.timezone || 'Asia/Shanghai' } : null;
  } catch {
    return null;
  }
}

/**
 * Fetch current weather from Open-Meteo (free, no key needed).
 * Returns null on failure.
 */
export async function getWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&timezone=auto&forecast_days=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    return {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind: Math.round(c.wind_speed_10m),
      desc: WMO[c.weather_code] ?? '未知',
    };
  } catch {
    return null;
  }
}

/** Format weather object into a short Chinese string. */
export function weatherText(w) {
  if (!w) return '';
  return `${w.desc}，${w.temp}℃（体感${w.feelsLike}℃），湿度${w.humidity}%，风速${w.wind}km/h`;
}
