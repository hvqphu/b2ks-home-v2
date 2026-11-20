import { WeatherCondition, WeatherInfo } from '../types/b2ks';

const WEATHER_CACHE_KEY = 'b2ks_weather_cache_v1';
const WEATHER_COORDS_KEY = 'b2ks_weather_coords_v1';
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CoordsCache {
  lat: number;
  lon: number;
  label: string;
  isGeo?: boolean;
  ts: number;
}

function getDefaultCoordsByTimezone(): CoordsCache {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Tokyo') || tz.includes('Japan')) {
      return { lat: 35.6762, lon: 139.6503, label: 'Tokyo', ts: 0 };
    }
    if (tz.includes('Seoul')) {
      return { lat: 37.5665, lon: 126.978, label: 'Seoul', ts: 0 };
    }
    if (tz.includes('Singapore')) {
      return { lat: 1.3521, lon: 103.8198, label: 'Singapore', ts: 0 };
    }
    if (tz.includes('Bangkok')) {
      return { lat: 13.7563, lon: 100.5018, label: 'Bangkok', ts: 0 };
    }
    if (tz.includes('London')) {
      return { lat: 51.5072, lon: -0.1276, label: 'London', ts: 0 };
    }
    if (tz.includes('America/Los_Angeles')) {
      return { lat: 37.7749, lon: -122.4194, label: 'California', ts: 0 };
    }
    if (tz.includes('America/New_York')) {
      return { lat: 40.7128, lon: -74.006, label: 'New York', ts: 0 };
    }
  } catch {
    // ignore timezone detection error
  }
  return { lat: 10.8231, lon: 106.6297, label: 'TP.HCM', ts: 0 };
}

export function mapWmoCodeToWeather(
  code: number,
  isDay: boolean
): { condition: WeatherCondition; label: string; icon: string } {
  if (code === 0) {
    return {
      condition: 'clear',
      label: isDay ? 'Nắng đẹp' : 'Trời quang',
      icon: isDay ? '☀️' : '🌙',
    };
  }
  if (code === 1 || code === 2) {
    return {
      condition: 'cloudy',
      label: isDay ? 'Nắng nhẹ, ít mây' : 'Ít mây',
      icon: isDay ? '🌤️' : '☁️',
    };
  }
  if (code === 3) {
    return {
      condition: 'cloudy',
      label: 'Nhiều mây',
      icon: '☁️',
    };
  }
  if (code === 45 || code === 48) {
    return {
      condition: 'fog',
      label: 'Sương mù',
      icon: '🌫️',
    };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      condition: 'rain',
      label: code >= 63 || code >= 81 ? 'Mưa rào' : 'Mưa nhẹ',
      icon: '🌧️',
    };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return {
      condition: 'snow',
      label: 'Tuyết rơi',
      icon: '❄️',
    };
  }
  if (code >= 95) {
    return {
      condition: 'thunder',
      label: 'Mưa dông',
      icon: '⛈️',
    };
  }
  return {
    condition: 'clear',
    label: isDay ? 'Nắng đẹp' : 'Trời quang',
    icon: isDay ? '☀️' : '🌙',
  };
}

export function getCachedWeatherInfo(): WeatherInfo {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WeatherInfo;
      if (parsed && typeof parsed.tempC === 'number' && parsed.condition) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt cache
  }
  const h = new Date().getHours();
  const isDay = h >= 6 && h < 18;
  return {
    condition: 'clear',
    label: isDay ? 'Nắng đẹp' : 'Trời quang',
    icon: isDay ? '☀️' : '🌙',
    tempC: 29,
    windKmh: 8,
    locationLabel: getDefaultCoordsByTimezone().label,
    isDay,
    updatedAt: 0,
  };
}

async function getSavedOrGeoCoords(requestGeo: boolean): Promise<CoordsCache> {
  if (requestGeo && typeof navigator !== 'undefined' && navigator.geolocation) {
    const geoCoords = await new Promise<CoordsCache | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4)),
            label: 'Vị trí của bạn',
            isGeo: true,
            ts: Date.now(),
          });
        },
        () => resolve(null),
        { timeout: 4500, maximumAge: 600000 }
      );
    });
    if (geoCoords) {
      try {
        localStorage.setItem(WEATHER_COORDS_KEY, JSON.stringify(geoCoords));
      } catch {
        // ignore
      }
      return geoCoords;
    }
  }

  try {
    const raw = localStorage.getItem(WEATHER_COORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CoordsCache;
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return getDefaultCoordsByTimezone();
}

export async function fetchLiveWeatherInfo(force = false, requestGeo = false): Promise<WeatherInfo> {
  const cached = getCachedWeatherInfo();
  if (!force && !requestGeo && cached.updatedAt > 0 && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
    return cached;
  }

  const coords = await getSavedOrGeoCoords(requestGeo);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=auto`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return cached;
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        is_day?: number;
        wind_speed_10m?: number;
      };
    };
    const cur = data?.current;
    if (!cur) return cached;

    const isDay = cur.is_day === 1;
    const code = Number(cur.weather_code ?? 0);
    const mapped = mapWmoCodeToWeather(code, isDay);
    const nextWeather: WeatherInfo = {
      condition: mapped.condition,
      label: mapped.label,
      icon: mapped.icon,
      tempC: Math.round(Number(cur.temperature_2m ?? 28)),
      windKmh: Math.round(Number(cur.wind_speed_10m ?? 6)),
      locationLabel: coords.label,
      isDay,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(nextWeather));
    } catch {
      // ignore
    }
    return nextWeather;
  } catch {
    return cached;
  }
}
