'use client';

import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------
   Dynamic Weather Wallpaper (halaman login)
   - Langit mengikuti jam (pagi, siang, sore, malam) dan cuaca (cerah, berawan, hujan, badai, kabut).
   - Semua nilai (awan, hujan, petir, kabut, jam) bergerak halus menuju target sehingga perpindahan
     cuaca terlihat hidup, bukan berganti mendadak.
   - Mode: Live (cuaca nyata Open-Meteo + jam perangkat), Demo (siklus otomatis), atau dipilih manual.
------------------------------------------------------------------- */

type RGB = [number, number, number];
type Wx = { cloud: number; rain: number; storm: number; fog: number; wind: number };
type WxKey = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog';

const PRESETS: Record<WxKey, Wx> = {
  clear: { cloud: 0.08, rain: 0, storm: 0, fog: 0, wind: 0.25 },
  cloudy: { cloud: 0.82, rain: 0, storm: 0, fog: 0.05, wind: 0.45 },
  rain: { cloud: 0.96, rain: 0.7, storm: 0, fog: 0.12, wind: 0.6 },
  storm: { cloud: 1, rain: 1, storm: 1, fog: 0.15, wind: 1 },
  fog: { cloud: 0.6, rain: 0, storm: 0, fog: 0.85, wind: 0.1 },
};
const WX_KEYS: WxKey[] = ['clear', 'cloudy', 'rain', 'storm', 'fog'];
const WX_ICON: Record<WxKey, string> = { clear: '☀️', cloudy: '⛅', rain: '🌧️', storm: '⛈️', fog: '🌫️' };
const WX_LABEL: Record<WxKey, { en: string; id: string }> = {
  clear: { en: 'Clear', id: 'Cerah' },
  cloudy: { en: 'Cloudy', id: 'Berawan' },
  rain: { en: 'Rain', id: 'Hujan' },
  storm: { en: 'Storm', id: 'Badai' },
  fog: { en: 'Fog', id: 'Kabut' },
};
const TIMES = [
  { key: 'morning', h: 7, icon: '🌅', en: 'Morning', id: 'Pagi' },
  { key: 'noon', h: 12.5, icon: '🌞', en: 'Noon', id: 'Siang' },
  { key: 'evening', h: 17.7, icon: '🌇', en: 'Evening', id: 'Sore' },
  { key: 'night', h: 22, icon: '🌙', en: 'Night', id: 'Malam' },
] as const;

// Lokasi cuaca nyata: Jakarta (Ancol).
const LAT = -6.12;
const LON = 106.83;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const dist = (a: RGB, b: RGB) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Palet langit (atas, tengah, bawah) per jam.
const SKY: { h: number; c: [RGB, RGB, RGB] }[] = [
  { h: 0, c: [hex('#04081c'), hex('#0a1433'), hex('#14214a')] },
  { h: 5, c: [hex('#0d1230'), hex('#2a2f6b'), hex('#7a5a8a')] },
  { h: 6.4, c: [hex('#3b5b9e'), hex('#e58f7a'), hex('#ffd09a')] },
  { h: 8, c: [hex('#4a90d9'), hex('#8fc3ee'), hex('#d9ecfa')] },
  { h: 12, c: [hex('#2b7bd6'), hex('#62aee8'), hex('#b9defa')] },
  { h: 16.3, c: [hex('#3a82d0'), hex('#7db8e6'), hex('#f3e2b8')] },
  { h: 18, c: [hex('#34508f'), hex('#e27d5c'), hex('#ffb870')] },
  { h: 19.4, c: [hex('#1a2250'), hex('#5a3a7a'), hex('#d0607a')] },
  { h: 21, c: [hex('#080e2a'), hex('#101a3c'), hex('#1a2850')] },
  { h: 24, c: [hex('#04081c'), hex('#0a1433'), hex('#14214a')] },
];
function skyAt(h: number): [RGB, RGB, RGB] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const a = SKY[i], b = SKY[i + 1];
    if (h >= a.h && h <= b.h) {
      const t = smooth((h - a.h) / (b.h - a.h));
      return [mix(a.c[0], b.c[0], t), mix(a.c[1], b.c[1], t), mix(a.c[2], b.c[2], t)];
    }
  }
  return SKY[0].c;
}
const nightness = (h: number) => (h <= 5 ? 1 : h < 7 ? 1 - smooth((h - 5) / 2) : h < 18 ? 0 : h < 20 ? smooth((h - 18) / 2) : 1);

// WMO weather_code (Open-Meteo) -> parameter cuaca.
function fromCode(code: number, cover: number, wind: number): Wx {
  const c = clamp(cover / 100, 0, 1);
  const w = clamp(wind / 30, 0.1, 1);
  if (code === 0) return { cloud: Math.min(c, 0.2), rain: 0, storm: 0, fog: 0, wind: w };
  if (code === 1) return { cloud: Math.max(0.15, Math.min(c, 0.4)), rain: 0, storm: 0, fog: 0, wind: w };
  if (code === 2) return { cloud: Math.max(0.45, Math.min(c, 0.75)), rain: 0, storm: 0, fog: 0, wind: w };
  if (code === 3) return { cloud: Math.max(0.8, c), rain: 0, storm: 0, fog: 0.05, wind: w };
  if (code === 45 || code === 48) return { cloud: 0.6, rain: 0, storm: 0, fog: 0.85, wind: 0.1 };
  if (code >= 51 && code <= 57) return { cloud: 0.9, rain: 0.3, storm: 0, fog: 0.1, wind: w };
  if (code === 61 || code === 80) return { cloud: 0.92, rain: 0.45, storm: 0, fog: 0.1, wind: w };
  if (code === 63 || code === 81) return { cloud: 0.96, rain: 0.7, storm: 0, fog: 0.12, wind: w };
  if (code === 65 || code === 82) return { cloud: 1, rain: 0.95, storm: 0, fog: 0.15, wind: w };
  if (code >= 95) return { cloud: 1, rain: 0.9, storm: 1, fog: 0.15, wind: Math.max(w, 0.8) };
  if (code >= 71 && code <= 77) return { cloud: 0.9, rain: 0, storm: 0, fog: 0.3, wind: w };
  return { cloud: Math.max(0.5, c), rain: 0, storm: 0, fog: 0, wind: w };
}
function codeLabel(code: number, lang: 'en' | 'id'): string {
  const id = lang === 'id';
  if (code === 0) return id ? 'Cerah' : 'Clear';
  if (code <= 2) return id ? 'Cerah berawan' : 'Partly cloudy';
  if (code === 3) return id ? 'Mendung' : 'Overcast';
  if (code === 45 || code === 48) return id ? 'Berkabut' : 'Foggy';
  if (code >= 95) return id ? 'Badai petir' : 'Thunderstorm';
  if (code >= 51 && code <= 67) return id ? 'Hujan' : 'Rain';
  if (code >= 80 && code <= 82) return id ? 'Hujan lebat' : 'Showers';
  return id ? 'Berawan' : 'Cloudy';
}

type Mode = 'live' | 'demo' | 'manual';

export default function WeatherWallpaper({ lang }: { lang: 'en' | 'id' }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('live');
  const [wxPin, setWxPin] = useState<WxKey | null>(null);
  const [timePin, setTimePin] = useState<number | null>(null);
  const [live, setLive] = useState<{ wx: Wx; code: number; temp: number } | null>(null);
  const [offline, setOffline] = useState(false);
  const [demoKey, setDemoKey] = useState<WxKey>('clear');

  // Nilai terkini untuk loop animasi (tanpa render ulang React).
  const ctl = useRef({ mode, wxPin, timePin, live, demoKey });
  ctl.current = { mode, wxPin, timePin, live, demoKey };

  useEffect(() => {
    try {
      const m = localStorage.getItem('fanos-wx-mode');
      if (m === 'demo') setMode('demo');
    } catch { /* abaikan */ }
  }, []);

  // Cuaca nyata (diperbarui tiap 10 menit).
  useEffect(() => {
    let dead = false;
    async function pull() {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m&timezone=auto`, { cache: 'no-store' });
        if (!r.ok) throw new Error('x');
        const j = await r.json();
        const c = j.current;
        if (dead || !c) return;
        setLive({ wx: fromCode(c.weather_code, c.cloud_cover, c.wind_speed_10m), code: c.weather_code, temp: Math.round(c.temperature_2m) });
        setOffline(false);
      } catch {
        if (!dead) setOffline(true);
      }
    }
    pull();
    const t = setInterval(pull, 10 * 60 * 1000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  // Mode demo: ganti cuaca tiap ~13 detik.
  useEffect(() => {
    if (mode !== 'demo') return;
    const seq: WxKey[] = ['clear', 'cloudy', 'rain', 'storm', 'rain', 'cloudy', 'fog', 'clear'];
    let i = 0;
    setDemoKey(seq[0]);
    const t = setInterval(() => { i = (i + 1) % seq.length; setDemoKey(seq[i]); }, 13000);
    return () => clearInterval(t);
  }, [mode]);

  // ---------------------------------------------------------------- animasi
  useEffect(() => {
    const cv = canvas.current, box = wrap.current;
    if (!cv || !box) return;
    const ctx = cv.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return;
    const g2 = ctx;
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const r = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const R = rng(20261120);

    // Bintang
    const stars = Array.from({ length: 170 }, () => ({ x: R(), y: R() * 0.7, r: 0.4 + R() * 1.2, ph: R() * 6.28, sp: 0.6 + R() * 1.8 }));

    // Sprite awan (putih lembut), diwarnai ulang secara berkala.
    const mkCloud = (w: number, h: number) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d')!;
      const n = 16;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = w * (0.18 + 0.64 * t) + (R() - 0.5) * w * 0.06;
        const rr = h * (0.28 + 0.2 * Math.sin(t * Math.PI) + R() * 0.12);
        const y = h * (0.62 - 0.16 * Math.sin(t * Math.PI)) + (R() - 0.5) * h * 0.1;
        const gr = g.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, 'rgba(255,255,255,0.85)');
        gr.addColorStop(0.55, 'rgba(255,255,255,0.35)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      return c;
    };
    const baseSprites = Array.from({ length: 5 }, () => mkCloud(360, 170));
    const tinted = baseSprites.map((s) => { const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; return c; });
    let lastTint: RGB = [-99, -99, -99];
    const retint = (col: RGB) => {
      if (dist(col, lastTint) < 6) return;
      lastTint = col;
      tinted.forEach((t, i) => {
        const g = t.getContext('2d')!;
        g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, t.width, t.height);
        g.drawImage(baseSprites[i], 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = rgba(col, 1);
        g.fillRect(0, 0, t.width, t.height);
      });
    };
    const clouds = Array.from({ length: 24 }, (_, i) => {
      const layer = R();
      return { sp: i % 5, x: R(), y: 0.03 + R() * 0.5, scale: 0.55 + layer * 1.25, speed: 0.004 + layer * 0.012, thr: (i / 24) * 0.9 + R() * 0.08, layer };
    });
    clouds.sort((a, b) => a.layer - b.layer);

    // Sprite kabut
    const fogSprite = (() => {
      const c = document.createElement('canvas');
      c.width = 640; c.height = 220;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(320, 110, 0, 320, 110, 320);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.setTransform(1, 0, 0, 0.36, 0, 70);
      g.fillStyle = gr;
      g.fillRect(0, 0, 640, 640);
      return c;
    })();
    const fogs = Array.from({ length: 6 }, (_, i) => ({ x: R(), y: 0.42 + (i / 6) * 0.5, s: 1.2 + R() * 1.4, v: 0.006 + R() * 0.01 }));

    // Skyline
    const mkCity = (n: number, minW: number, maxW: number, minH: number, maxH: number) => {
      const out: { x: number; w: number; h: number; lit: number[] ; ant: number }[] = [];
      for (let i = 0; i < n; i++) {
        const w = minW + R() * (maxW - minW);
        const h = minH + Math.pow(R(), 1.6) * (maxH - minH);
        out.push({ x: (i / n) + (R() - 0.5) * 0.02, w, h, lit: Array.from({ length: 60 }, () => (R() < 0.45 ? 1 : 0)), ant: R() < 0.18 ? 0.04 + R() * 0.05 : 0 });
      }
      return out;
    };
    const cityFar = mkCity(30, 0.022, 0.05, 0.07, 0.2);
    const cityNear = mkCity(20, 0.04, 0.085, 0.1, 0.34);
    const flicker = Array.from({ length: 60 }, () => R() * 6.28);

    // Hujan
    const NRAIN = 950;
    const rx = new Float32Array(NRAIN), ry = new Float32Array(NRAIN), rv = new Float32Array(NRAIN), rl = new Float32Array(NRAIN);
    for (let i = 0; i < NRAIN; i++) { rx[i] = R(); ry[i] = R(); rv[i] = 0.7 + R() * 0.6; rl[i] = 9 + R() * 18; }
    const splashes: { x: number; y: number; a: number }[] = [];

    // Petir
    let flash = 0, bolt: { x: number; y: number }[] | null = null, boltLife = 0, nextBolt = 4, echo = 0;

    // Keadaan terinterpolasi
    const cur: Wx = { ...PRESETS.clear };
    let hour = ((d) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600)(new Date());
    let demoHour = 9;
    let drift = 0;
    let last = performance.now();
    let raf = 0;
    let to: ReturnType<typeof setTimeout> | undefined;

    const target = (): { wx: Wx; hour: number; snap: boolean } => {
      const c = ctl.current;
      const now = new Date();
      const real = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      if (c.mode === 'demo') return { wx: PRESETS[c.demoKey], hour: demoHour, snap: false };
      const liveWx = c.live ? c.live.wx : PRESETS.clear;
      return { wx: c.wxPin ? PRESETS[c.wxPin] : liveWx, hour: c.timePin ?? real, snap: false };
    };

    const makeBolt = () => {
      const pts: { x: number; y: number }[] = [];
      let x = W * (0.15 + R() * 0.7), y = H * 0.08;
      pts.push({ x, y });
      while (y < H * (0.5 + R() * 0.2)) { x += (R() - 0.5) * W * 0.07; y += H * (0.03 + R() * 0.05); pts.push({ x, y }); }
      return pts;
    };

    function frame(now: number) {
      const dt = reduced ? 0.016 : Math.min(0.05, (now - last) / 1000);
      last = now;
      const tg = target();
      const c = ctl.current;
      if (c.mode === 'demo') demoHour = (demoHour + dt * 0.25) % 24;

      // Cuaca bergerak halus menuju target (±3 detik).
      const k = reduced ? 1 : 1 - Math.exp(-dt / 2.6);
      cur.cloud = lerp(cur.cloud, tg.wx.cloud, k);
      cur.rain = lerp(cur.rain, tg.wx.rain, 1 - Math.exp(-dt / 2.0));
      cur.storm = lerp(cur.storm, tg.wx.storm, 1 - Math.exp(-dt / 1.8));
      cur.fog = lerp(cur.fog, tg.wx.fog, 1 - Math.exp(-dt / 3.5));
      cur.wind = lerp(cur.wind, tg.wx.wind, 1 - Math.exp(-dt / 3));
      // Jam: ikut target, lompatan besar dibuat seperti time-lapse.
      let dh = tg.hour - hour;
      if (dh > 12) dh -= 24; else if (dh < -12) dh += 24;
      const step = clamp(dh, -4 * dt, 4 * dt);
      hour = reduced ? tg.hour : (hour + step + 24) % 24;
      drift += dt * (0.4 + cur.wind);

      const night = nightness(hour);
      let [top, mid, bot] = skyAt(hour);
      // Redupkan & abu-abukan langit saat berawan / hujan / kabut.
      const gloom = clamp(Math.max(cur.cloud * 0.72, cur.rain * 0.92, cur.fog * 0.55), 0, 1);
      const lum = (cc: RGB) => (cc[0] * 0.3 + cc[1] * 0.59 + cc[2] * 0.11);
      const grey = (cc: RGB, dark: number): RGB => { const l = lum(cc) * dark; return [l * 0.92, l * 0.98, l * 1.08]; };
      const dark = 0.86 - cur.rain * 0.3 - cur.storm * 0.22;
      top = mix(top, grey(top, dark * 0.9), gloom);
      mid = mix(mid, grey(mid, dark), gloom);
      bot = mix(bot, grey(bot, dark * 1.05), gloom);

      // Langit
      const sg = g2.createLinearGradient(0, 0, 0, H);
      sg.addColorStop(0, rgba(top));
      sg.addColorStop(0.55, rgba(mid));
      sg.addColorStop(1, rgba(bot));
      g2.fillStyle = sg;
      g2.fillRect(0, 0, W, H);

      const yH = H * 0.8;
      // Bintang
      const starA = night * (1 - cur.cloud * 0.95) * (1 - cur.fog * 0.8);
      if (starA > 0.02) {
        for (const s of stars) {
          const tw = 0.55 + 0.45 * Math.sin(now / 1000 * s.sp + s.ph);
          g2.fillStyle = `rgba(255,255,255,${(starA * tw).toFixed(3)})`;
          g2.beginPath();
          g2.arc(s.x * W, s.y * H, s.r, 0, 6.283);
          g2.fill();
        }
      }
      // Matahari
      const arc = (t: number) => ({ x: W * (0.12 + 0.76 * t), y: yH + 24 - Math.sin(clamp(t, 0, 1) * Math.PI) * H * 0.6 });
      const ts = (hour - 6) / 12;
      if (ts > -0.08 && ts < 1.08) {
        const p = arc(ts);
        const alt = Math.sin(clamp(ts, 0, 1) * Math.PI);
        const warm = mix([255, 150, 70], [255, 244, 214], smooth(alt * 1.4));
        const vis = (1 - cur.cloud * 0.55) * (1 - cur.fog * 0.4) * (1 - cur.rain * 0.4);
        const rad = H * (0.2 + (1 - alt) * 0.1);
        const g = g2.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, rgba(warm, 0.55 * vis));
        g.addColorStop(1, rgba(warm, 0));
        g2.fillStyle = g;
        g2.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
        g2.fillStyle = rgba(mix(warm, [255, 255, 255], 0.5), clamp(vis * 1.1, 0, 1) * (cur.cloud > 0.85 ? 0.25 : 1));
        g2.beginPath();
        g2.arc(p.x, p.y, H * 0.035, 0, 6.283);
        g2.fill();
      }
      // Bulan
      const tm = (((hour - 18) % 24) + 24) % 24 / 12;
      if (tm > -0.05 && tm < 1.05) {
        const p = arc(tm);
        const vis = (1 - cur.cloud * 0.8) * (1 - cur.fog * 0.6);
        const rad = H * 0.16;
        const g = g2.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, `rgba(200,215,255,${(0.35 * vis).toFixed(3)})`);
        g.addColorStop(1, 'rgba(200,215,255,0)');
        g2.fillStyle = g;
        g2.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
        g2.fillStyle = `rgba(240,244,255,${(0.95 * vis).toFixed(3)})`;
        g2.beginPath();
        g2.arc(p.x, p.y, H * 0.026, 0, 6.283);
        g2.fill();
        g2.fillStyle = `rgba(190,200,230,${(0.35 * vis).toFixed(3)})`;
        g2.beginPath();
        g2.arc(p.x - H * 0.008, p.y - H * 0.004, H * 0.006, 0, 6.283);
        g2.arc(p.x + H * 0.007, p.y + H * 0.009, H * 0.004, 0, 6.283);
        g2.fill();
      }

      // Awan
      const dayCol = mix(mix(mid, [255, 255, 255], 0.62), [255, 255, 255], 1 - night);
      const nightCol = mix(mid, [150, 165, 215], 0.45);
      let cloudCol = mix(dayCol, nightCol, night);
      const heavy: RGB = mix([92, 100, 116], [28, 32, 46], night);
      cloudCol = mix(cloudCol, heavy, clamp(cur.rain * 0.85 + cur.storm * 0.25 + (cur.cloud > 0.9 ? 0.15 : 0), 0, 1));
      retint(cloudCol);
      for (const cl of clouds) {
        const a = clamp((cur.cloud * 1.18 - cl.thr) * 3, 0, 1) * (0.5 + cl.layer * 0.42);
        if (a < 0.01) continue;
        const sw = 360 * cl.scale, sh = 170 * cl.scale;
        const span = W + sw;
        const x = ((cl.x * span + drift * cl.speed * W * 6) % span) - sw;
        g2.globalAlpha = a;
        g2.drawImage(tinted[cl.sp], x, cl.y * H * (0.7 + cur.cloud * 0.35) - sh * 0.3, sw, sh);
      }
      g2.globalAlpha = 1;
      // Lapisan mendung di atas
      const ov = clamp(cur.rain * 0.5 + cur.cloud * 0.18 + cur.storm * 0.2, 0, 0.8);
      if (ov > 0.01) {
        const og = g2.createLinearGradient(0, 0, 0, H * 0.7);
        og.addColorStop(0, rgba(mix([40, 46, 62], [10, 12, 22], night), ov));
        og.addColorStop(1, rgba([40, 46, 62], 0));
        g2.fillStyle = og;
        g2.fillRect(0, 0, W, H * 0.7);
      }

      // Kabut
      if (cur.fog > 0.02) {
        const fc = mix(mix(bot, [235, 240, 248], 0.55), [90, 100, 125], night * 0.8);
        retintFog(fc);
        g2.globalAlpha = clamp(cur.fog * 0.6, 0, 0.7);
        for (const f of fogs) {
          const fw = 640 * f.s, fh = 220 * f.s;
          const span = W + fw;
          const x = ((f.x * span + drift * f.v * W * 8) % span) - fw;
          g2.drawImage(fogTint, x, f.y * H - fh * 0.5, fw, fh);
        }
        g2.globalAlpha = 1;
      }

      // Kota (jauh)
      const farCol = mix(mix(bot, [18, 26, 50], 0.32 + night * 0.25), bot, cur.fog * 0.7);
      const nearCol = mix(mix(bot, [8, 12, 26], 0.5 + night * 0.32), bot, cur.fog * 0.35);
      const drawCity = (list: typeof cityFar, col: RGB, lights: boolean) => {
        g2.fillStyle = rgba(col);
        g2.beginPath();
        for (const b of list) {
          const bx = b.x * W, bw = b.w * W, bh = b.h * H;
          g2.rect(bx, H - bh, bw, bh + 2);
          if (b.ant) g2.rect(bx + bw * 0.48, H - bh - b.ant * H, Math.max(1.4, bw * 0.04), b.ant * H);
        }
        g2.fill();
        if (lights && night > 0.12) {
          g2.fillStyle = `rgba(255,214,130,${(night * 0.85).toFixed(3)})`;
          g2.beginPath();
          list.forEach((b, bi) => {
            const bx = b.x * W, bw = b.w * W, bh = b.h * H;
            const cols = Math.max(1, Math.floor(bw / 9)), rows = Math.floor(bh / 13);
            for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
              const idx = (r * cols + cc + bi * 7) % 60;
              if (!b.lit[idx]) continue;
              const fl = 0.75 + 0.25 * Math.sin(now / 1600 + flicker[idx]);
              if (fl < 0.55) continue;
              g2.rect(bx + 3 + cc * 9, H - bh + 5 + r * 13, 3.2, 4.4);
            }
          });
          g2.fill();
        }
      };
      drawCity(cityFar, farCol, false);
      drawCity(cityNear, nearCol, true);

      // Kabut tanah / uap hujan
      const mistA = clamp(cur.rain * 0.28 + cur.fog * 0.3, 0, 0.5);
      if (mistA > 0.01) {
        const mg = g2.createLinearGradient(0, H * 0.7, 0, H);
        mg.addColorStop(0, rgba(mix(bot, [220, 228, 240], 0.4), 0));
        mg.addColorStop(1, rgba(mix(bot, [220, 228, 240], 0.4), mistA));
        g2.fillStyle = mg;
        g2.fillRect(0, H * 0.7, W, H * 0.3);
      }

      // Hujan
      const nr = Math.floor(NRAIN * Math.pow(cur.rain, 0.85));
      if (nr > 0) {
        const slant = 0.12 + cur.wind * 0.42;
        const far = new Path2D(), near = new Path2D();
        for (let i = 0; i < nr; i++) {
          const sp = rv[i] * (900 + cur.rain * 500);
          ry[i] += (sp * dt) / H;
          rx[i] -= (sp * dt * slant) / W;
          if (ry[i] > 1) { ry[i] -= 1.05; rx[i] = R(); if (R() < 0.05 && splashes.length < 90) splashes.push({ x: R() * W, y: H * (0.9 + R() * 0.09), a: 1 }); }
          if (rx[i] < -0.05) rx[i] += 1.1;
          const x = rx[i] * W, y = ry[i] * H, l = rl[i] * (0.7 + cur.rain * 0.6);
          const path = i % 3 === 0 ? near : far;
          path.moveTo(x, y);
          path.lineTo(x + slant * l, y - l);
        }
        const rc = night > 0.5 ? '180,200,240' : '215,228,250';
        g2.lineCap = 'round';
        g2.strokeStyle = `rgba(${rc},${(0.22 + cur.rain * 0.12).toFixed(3)})`;
        g2.lineWidth = 0.9;
        g2.stroke(far);
        g2.strokeStyle = `rgba(${rc},${(0.4 + cur.rain * 0.2).toFixed(3)})`;
        g2.lineWidth = 1.4;
        g2.stroke(near);
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.a -= dt * 2.6;
        if (s.a <= 0) { splashes.splice(i, 1); continue; }
        g2.strokeStyle = `rgba(210,225,250,${(s.a * 0.45).toFixed(3)})`;
        g2.lineWidth = 1;
        g2.beginPath();
        g2.ellipse(s.x, s.y, (1 - s.a) * 9 + 1, (1 - s.a) * 3 + 0.4, 0, 0, 6.283);
        g2.stroke();
      }

      // Petir
      if (cur.storm > 0.35) {
        nextBolt -= dt;
        if (nextBolt <= 0) {
          bolt = makeBolt(); boltLife = 0.2; flash = 1; echo = 0.13;
          nextBolt = (3 + R() * 7) / cur.storm;
        }
      }
      if (echo > 0) { echo -= dt; if (echo <= 0) flash = Math.max(flash, 0.7); }
      if (boltLife > 0 && bolt) {
        boltLife -= dt;
        g2.save();
        g2.globalAlpha = clamp(boltLife / 0.2, 0, 1);
        g2.strokeStyle = '#eaf2ff';
        g2.shadowColor = '#9cc4ff';
        g2.shadowBlur = 22;
        g2.lineWidth = 2.2;
        g2.lineJoin = 'round';
        g2.beginPath();
        bolt.forEach((p, i) => (i ? g2.lineTo(p.x, p.y) : g2.moveTo(p.x, p.y)));
        g2.stroke();
        g2.lineWidth = 1;
        g2.beginPath();
        const mid2 = bolt[Math.floor(bolt.length / 2)];
        g2.moveTo(mid2.x, mid2.y);
        g2.lineTo(mid2.x + W * 0.08, mid2.y + H * 0.14);
        g2.lineTo(mid2.x + W * 0.05, mid2.y + H * 0.26);
        g2.stroke();
        g2.restore();
      }
      if (flash > 0.01) {
        g2.fillStyle = `rgba(215,228,255,${(flash * 0.42).toFixed(3)})`;
        g2.fillRect(0, 0, W, H);
        flash *= Math.exp(-dt * 7);
      }

      // Vinyet halus
      const vg = g2.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${(0.28 + night * 0.15).toFixed(3)})`);
      g2.fillStyle = vg;
      g2.fillRect(0, 0, W, H);
    }

    // Sprite kabut berwarna
    const fogTint = document.createElement('canvas');
    fogTint.width = fogSprite.width; fogTint.height = fogSprite.height;
    let lastFog: RGB = [-99, -99, -99];
    function retintFog(col: RGB) {
      if (dist(col, lastFog) < 6) return;
      lastFog = col;
      const g = fogTint.getContext('2d')!;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, fogTint.width, fogTint.height);
      g.drawImage(fogSprite, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = rgba(col, 1);
      g.fillRect(0, 0, fogTint.width, fogTint.height);
    }

    const loop = (t: number) => {
      if (!document.hidden) frame(t);
      if (reduced) to = setTimeout(() => { raf = requestAnimationFrame(loop); }, 1000);
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); if (to) clearTimeout(to); ro.disconnect(); };
  }, []);

  // ---------------------------------------------------------------- UI
  const L = (o: { en: string; id: string }) => (lang === 'id' ? o.id : o.en);
  const pickWx = (k: WxKey) => { setWxPin(k); setMode('manual'); try { localStorage.setItem('fanos-wx-mode', 'manual'); } catch { /* */ } };
  const pickTime = (h: number) => { setTimePin(h); setMode('manual'); try { localStorage.setItem('fanos-wx-mode', 'manual'); } catch { /* */ } };
  const goLive = () => { setWxPin(null); setTimePin(null); setMode('live'); try { localStorage.setItem('fanos-wx-mode', 'live'); } catch { /* */ } };
  const goDemo = () => { setWxPin(null); setTimePin(null); setMode('demo'); try { localStorage.setItem('fanos-wx-mode', 'demo'); } catch { /* */ } };
  const status =
    mode === 'demo'
      ? (lang === 'id' ? 'Mode demo · cuaca & waktu berganti otomatis' : 'Demo mode · weather & time change automatically')
      : live && !offline
        ? `Jakarta · ${live.temp}°C · ${codeLabel(live.code, lang)}`
        : (lang === 'id' ? 'Jakarta · cuaca nyata tidak tersedia' : 'Jakarta · live weather unavailable');
  const activeWx = mode === 'demo' ? demoKey : wxPin;

  return (
    <div ref={wrap} className="wx-wrap" data-no-i18n>
      <canvas ref={canvas} className="wx-canvas" aria-hidden="true" />
      <div className="wx-ui">
        <div className="wx-status">{status}</div>
        <div className="wx-bar">
          <button type="button" className={`wx-chip${mode === 'live' ? ' on' : ''}`} onClick={goLive}><span className="wx-dot" />Live</button>
          <button type="button" className={`wx-chip${mode === 'demo' ? ' on' : ''}`} onClick={goDemo}>▶ Demo</button>
          <span className="wx-sep" />
          {WX_KEYS.map((k) => (
            <button key={k} type="button" className={`wx-chip wx-ic${activeWx === k ? ' on' : ''}`} onClick={() => pickWx(k)} title={L(WX_LABEL[k])}>{WX_ICON[k]}</button>
          ))}
          <span className="wx-sep" />
          {TIMES.map((t) => (
            <button key={t.key} type="button" className={`wx-chip wx-ic${timePin === t.h ? ' on' : ''}`} onClick={() => pickTime(t.h)} title={L(t)}>{t.icon}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
