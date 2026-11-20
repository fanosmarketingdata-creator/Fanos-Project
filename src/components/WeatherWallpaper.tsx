'use client';

import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------
   Dynamic Weather Wallpaper (halaman login) - versi WebGL
   - Seluruh langit digambar oleh fragment shader: awan volumetrik (fbm) berperspektif dengan
     pencahayaan dari matahari/bulan, laut yang memantulkan langit, bintang, kabut, hujan berlapis.
   - Cuaca nyata (Open-Meteo, Jakarta) + jam perangkat. Semua nilai bergerak halus menuju target
     sehingga perubahan cuaca terlihat hidup.
   - Parameter rahasia untuk uji: ?wx=clear|cloudy|rain|storm|fog&h=0..24
------------------------------------------------------------------- */

type RGB = [number, number, number];
type Wx = { cloud: number; rain: number; storm: number; fog: number; wind: number };
type WxKey = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog';

const PRESETS: Record<WxKey, Wx> = {
  clear: { cloud: 0.1, rain: 0, storm: 0, fog: 0, wind: 0.25 },
  cloudy: { cloud: 0.82, rain: 0, storm: 0, fog: 0.05, wind: 0.45 },
  rain: { cloud: 0.96, rain: 0.7, storm: 0, fog: 0.12, wind: 0.6 },
  storm: { cloud: 1, rain: 1, storm: 1, fog: 0.15, wind: 1 },
  fog: { cloud: 0.6, rain: 0, storm: 0, fog: 0.85, wind: 0.1 },
};

const LAT = -6.12; // Jakarta (Ancol)
const LON = 106.83;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

const SKY: { h: number; c: [RGB, RGB, RGB] }[] = [
  { h: 0, c: [hex('#03061a'), hex('#0a1330'), hex('#14224a')] },
  { h: 5, c: [hex('#0b1030'), hex('#2a2f6b'), hex('#8a5f8c')] },
  { h: 6.3, c: [hex('#34569c'), hex('#e58f7a'), hex('#ffcf98')] },
  { h: 8, c: [hex('#3f86d6'), hex('#86bdec'), hex('#d6eaf9')] },
  { h: 12, c: [hex('#1f6fd0'), hex('#5aa7e8'), hex('#b4daf8')] },
  { h: 16.3, c: [hex('#3279cc'), hex('#79b4e4'), hex('#f1dfb4')] },
  { h: 18, c: [hex('#2e4a8c'), hex('#e0795a'), hex('#ffb56c')] },
  { h: 19.4, c: [hex('#18204c'), hex('#573878'), hex('#cf5f7c')] },
  { h: 21, c: [hex('#070d28'), hex('#101a3c'), hex('#1a2850')] },
  { h: 24, c: [hex('#03061a'), hex('#0a1330'), hex('#14224a')] },
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

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uTime; uniform vec2 uDrift;
uniform vec3 uTop, uMid, uBot, uSunCol, uFogCol;
uniform vec2 uSun, uMoon, uLight, uFlashPos;
uniform float uSunVis, uMoonVis, uNight, uCloud, uRain, uStorm, uFog, uWind, uFlash, uHor;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = m * p; a *= 0.5; }
  return s;
}
vec3 skyGrad(float y){
  vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.38, y));
  return mix(c, uTop, smoothstep(0.3, 1.0, y));
}

// Satu lapisan awan: x = alpha, yzw = warna.
vec4 cloudLayer(vec2 p, float y, float scale, float speed, float cover, float seed){
  float depth = 1.0 / (y * 1.1 + 0.34);
  vec2 cp = vec2(p.x * depth * 0.7, depth * 0.95) * scale * 4.2 + uDrift * speed * 4.2 + seed;
  float f = fbm(cp + vec2(0.0, uTime * 0.006));
  float thr = mix(0.80, 0.30, cover);
  float d = smoothstep(thr, thr + 0.24, f);
  float f2 = fbm(cp + uLight * 0.16 + vec2(0.0, uTime * 0.006));
  float d2 = smoothstep(thr, thr + 0.24, f2);
  float lit = clamp(1.25 - d2 * 1.15, 0.0, 1.0);
  float g = clamp(uRain * 0.62 + uStorm * 0.25, 0.0, 0.9);
  vec3 litCol = mix(vec3(1.0), uSunCol, 0.4) * (1.0 - uNight * 0.78) + uNight * vec3(0.22, 0.27, 0.42);
  vec3 shCol = mix(uMid * 0.62, vec3(0.36, 0.4, 0.5), 0.5) * (1.0 - uNight * 0.55);
  litCol = mix(litCol, vec3(0.52, 0.56, 0.64) * (1.0 - uNight * 0.8), g * 0.85);
  shCol  = mix(shCol,  vec3(0.2, 0.22, 0.29)  * (1.0 - uNight * 0.7), g);
  vec3 c = mix(shCol, litCol, lit * (1.0 - 0.38 * d));
  // tepi bercahaya (silver lining)
  float rim = (1.0 - d) * smoothstep(0.0, 0.5, d) * 0.0 + pow(clamp(1.0 - d, 0.0, 1.0), 3.0) * d * 3.2;
  c += uSunCol * rim * 0.22 * uSunVis * (1.0 - g);
  float a = d * smoothstep(0.0, 0.14, y);
  return vec4(a, c);
}

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float hor = uHor;
  vec3 col;
  float cloudDim = 1.0 - uCloud * 0.62;

  if (p.y >= hor) {
    float y = (p.y - hor) / (0.5 - hor);
    col = skyGrad(y);

    // bintang
    float stA = uNight * (1.0 - uCloud * 0.96) * (1.0 - uFog) * smoothstep(0.02, 0.3, y);
    if (stA > 0.01) {
      vec2 g = p * 95.0; vec2 id = floor(g); float h = hash(id);
      if (h > 0.972) {
        vec2 f = fract(g) - 0.5;
        float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.34, 0.0, length(f)) * tw * stA * (0.5 + h * 0.5);
      }
    }

    // matahari
    vec2 ds = p - uSun; float dS = length(ds);
    float sunG = (exp(-dS * 4.2) * 0.3 + exp(-dS * 15.0) * 0.42) * uSunVis * cloudDim * (1.0 - uFog * 0.5);
    col += uSunCol * sunG;
    col = mix(col, vec3(1.0, 0.98, 0.92), smoothstep(0.024, 0.018, dS) * uSunVis * (1.0 - uCloud * 0.85));
    // bulan
    vec2 dm = p - uMoon; float dM = length(dm);
    col += vec3(0.55, 0.65, 0.95) * (exp(-dM * 7.0) * 0.35 + exp(-dM * 24.0) * 0.4) * uMoonVis * cloudDim * (1.0 - uFog * 0.6);
    float moonDisc = smoothstep(0.026, 0.021, dM) * uMoonVis * (1.0 - uCloud * 0.9);
    float crater = 0.88 + 0.12 * noise((dm + 0.3) * 160.0);
    col = mix(col, vec3(0.93, 0.95, 1.0) * crater, moonDisc);

    // awan: dua lapis untuk kedalaman
    if (uCloud > 0.03) {
      vec4 cB = cloudLayer(p, y, 1.7, 1.55, clamp(uCloud * 0.92, 0.0, 1.0), 31.0);
      col = mix(col, cB.yzw, cB.x * 0.78);
      vec4 cA = cloudLayer(p, y, 1.0, 1.0, uCloud, 0.0);
      col = mix(col, cA.yzw, cA.x * 0.96);
    }
    // lapisan mendung merata saat hujan / sangat berawan
    float veil = smoothstep(0.72, 1.0, uCloud) * 0.62 * smoothstep(0.0, 0.18, y);
    float vl = dot(uMid, vec3(0.3, 0.59, 0.11));
    col = mix(col, vec3(vl) * vec3(0.94, 1.0, 1.08) * (0.9 - uRain * 0.3 - uStorm * 0.15), veil * (0.55 + 0.45 * fbm(vec2(p.x * 3.0 + uDrift.x * 3.0, y * 5.0 + uTime * 0.01))));
    // kabut tipis di horizon
    col = mix(col, skyGrad(0.0), exp(-y * 10.0) * 0.55);
  } else {
    // laut
    float sy = (hor - p.y) / (hor + 0.5);
    float depth = 1.0 / (sy * 1.5 + 0.07);
    float sp = 0.4 + uWind;
    vec2 wp = vec2(p.x * depth * 0.9, depth * 1.4);
    float w1 = fbm(wp * 1.1 + vec2(uTime * 0.05 * sp, uTime * 0.13 * sp));
    float w2 = noise(wp * 5.0 + vec2(uTime * 0.2 * sp, uTime * 0.38 * sp));
    float wave = (w1 - 0.5) * 0.9 + (w2 - 0.5) * 0.35;
    vec3 refl = skyGrad(clamp(sy * 0.85 + wave * 0.05, 0.0, 1.0));
    refl = mix(refl, uFogCol, 0.0);
    vec3 deep = mix(uBot * 0.2, vec3(0.03, 0.12, 0.18), 0.5) * (1.0 - uNight * 0.55) + uMid * 0.06;
    float fres = mix(0.92, 0.32, smoothstep(0.0, 0.85, sy));
    col = mix(deep, refl, fres);
    col *= 1.0 + wave * 0.35;
    float gl = pow(max(0.0, noise(vec2(wp.x * 7.0, wp.y * 30.0) + uTime * vec2(0.3, 0.9) * sp) * 1.3 - 0.36), 3.0);
    float pathS = exp(-abs(p.x - uSun.x) / (0.05 + sy * 0.36)) * uSunVis * cloudDim;
    col += uSunCol * gl * pathS * 2.6;
    float pathM = exp(-abs(p.x - uMoon.x) / (0.04 + sy * 0.26)) * uMoonVis * cloudDim;
    col += vec3(0.7, 0.8, 1.0) * gl * pathM * 1.3;
    // buih ombak
    float cap = smoothstep(0.64, 0.78, w1 + w2 * 0.15) * (0.1 + uWind * 0.55) * (0.25 + sy);
    col = mix(col, vec3(0.86, 0.9, 0.95) * (1.0 - uNight * 0.7), cap * 0.5);
    // riak hujan
    if (uRain > 0.05) {
      vec2 rp = vec2(p.x * depth * 3.2, depth * 3.4);
      vec2 cell = floor(rp); vec2 f = fract(rp) - 0.5;
      float h = hash(cell); float t = fract(uTime * 0.8 + h * 6.0);
      float ring = smoothstep(0.035, 0.0, abs(length(f * vec2(1.0, 2.2)) - t * 0.42)) * (1.0 - t) * step(h, uRain * 0.85);
      col += vec3(0.62, 0.72, 0.84) * ring * 0.4 * (1.0 - uNight * 0.5);
    }
    // menyatu dengan horizon
    col = mix(col, skyGrad(0.0), exp(-sy * 16.0) * 0.9);
  }

  // hujan (3 lapis)
  if (uRain > 0.02) {
    float sl = 0.1 + uWind * 0.32;
    float acc = 0.0;
    for (int L = 0; L < 3; L++) {
      float fl = float(L);
      float cols = 46.0 + fl * 48.0;
      float len = 0.13 - fl * 0.035;
      float wid = 0.1 + fl * 0.035;
      float spd = 2.4 - fl * 0.55;
      vec2 q = vec2(p.x + p.y * sl, p.y);
      float cx = q.x * cols; float id = floor(cx); float fx = fract(cx) - 0.5;
      float r = hash(vec2(id, 3.7 + fl)); float r2 = hash(vec2(id, 9.1 + fl));
      float on = step(r2, uRain * 0.92 + 0.02);
      float d = fract(q.y * 1.9 + uTime * spd * (0.85 + 0.3 * r) + r * 13.0);
      float s = smoothstep(len, 0.0, d) * smoothstep(wid, wid * 0.35, abs(fx));
      acc += s * on * (0.85 - fl * 0.25);
    }
    vec3 rc = mix(vec3(0.82, 0.88, 0.97), vec3(0.45, 0.52, 0.7), uNight);
    col = mix(col, rc, clamp(acc, 0.0, 1.0) * (0.34 + uRain * 0.2));
    col *= 1.0 - uRain * 0.08;
  }

  // kabut
  if (uFog > 0.02) {
    float fogH = 0.6 + 0.4 * exp(-abs(p.y - hor) * 2.6);
    float wisp = fbm(vec2(p.x * 2.2 + uDrift.x * 0.5, p.y * 3.2) + uTime * 0.02);
    col = mix(col, uFogCol, clamp(uFog * (0.55 + 0.55 * wisp) * fogH * 1.1, 0.0, 0.93));
  }

  // kilatan petir
  if (uFlash > 0.01) {
    float fl = 0.35 + 0.65 * exp(-length(p - uFlashPos) * 1.6);
    col += vec3(0.6, 0.72, 1.0) * uFlash * fl * 0.65;
  }

  // vinyet + grain
  col *= 1.0 - 0.34 * smoothstep(0.42, 1.05, length(p * vec2(0.85, 1.0)));
  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.022;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default function WeatherWallpaper({ lang }: { lang: 'en' | 'id' }) {
  const wrap = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const boltRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState<{ wx: Wx; code: number; temp: number } | null>(null);
  const [offline, setOffline] = useState(false);
  const liveRef = useRef<Wx | null>(null);
  liveRef.current = live ? live.wx : null;

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

  useEffect(() => {
    const cv0 = glRef.current, bc0 = boltRef.current, box0 = wrap.current;
    if (!cv0 || !bc0 || !box0) return;
    const cv: HTMLCanvasElement = cv0, bc: HTMLCanvasElement = bc0, box: HTMLDivElement = box0;
    const gl0 = (cv.getContext('webgl', { antialias: false, alpha: false }) || cv.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl0) return;
    const gl: WebGLRenderingContext = gl0;
    const b2 = bc.getContext('2d');
    if (!b2) return;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U: Record<string, WebGLUniformLocation | null> = {};
    for (const n of ['uRes', 'uTime', 'uDrift', 'uTop', 'uMid', 'uBot', 'uSunCol', 'uFogCol', 'uSun', 'uMoon', 'uLight', 'uFlashPos', 'uSunVis', 'uMoonVis', 'uNight', 'uCloud', 'uRain', 'uStorm', 'uFog', 'uWind', 'uFlash', 'uHor']) U[n] = gl.getUniformLocation(prog, n);

    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const qs = new URLSearchParams(window.location.search);
    const forceWx = qs.get('wx') as WxKey | null;
    const forceH = qs.get('h') !== null ? parseFloat(qs.get('h') as string) : null;

    let W = 1, H = 1;
    const resize = () => {
      const r = box.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const sc = Math.min(dpr, Math.sqrt(1_100_000 / (W * H)));
      cv.width = Math.max(2, Math.round(W * sc));
      cv.height = Math.max(2, Math.round(H * sc));
      bc.width = W; bc.height = H;
      gl.viewport(0, 0, cv.width, cv.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const cur: Wx = { ...PRESETS.clear };
    let hour = forceH ?? ((d) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600)(new Date());
    let drift = 0;
    let flash = 0, echo = 0, nextBolt = 4, boltLife = 0;
    let bolt: { x: number; y: number }[] | null = null;
    let flashPos: [number, number] = [0, 0.2];
    let last = performance.now();
    let t0 = last;
    let raf = 0;
    let to: ReturnType<typeof setTimeout> | undefined;

    const makeBolt = () => {
      const pts: { x: number; y: number }[] = [];
      let x = W * (0.2 + Math.random() * 0.6), y = H * 0.05;
      pts.push({ x, y });
      const endY = H * (0.42 + Math.random() * 0.2);
      while (y < endY) { x += (Math.random() - 0.5) * W * 0.08; y += H * (0.03 + Math.random() * 0.05); pts.push({ x, y }); }
      return pts;
    };

    function frame(now: number) {
      const dt = reduced ? 0.016 : Math.min(0.05, (now - last) / 1000);
      last = now;
      const aspect = W / H;
      const tg = forceWx && PRESETS[forceWx] ? PRESETS[forceWx] : (liveRef.current ?? PRESETS.clear);
      const k = reduced ? 1 : 1 - Math.exp(-dt / 2.6);
      cur.cloud = lerp(cur.cloud, tg.cloud, k);
      cur.rain = lerp(cur.rain, tg.rain, 1 - Math.exp(-dt / 2.0));
      cur.storm = lerp(cur.storm, tg.storm, 1 - Math.exp(-dt / 1.8));
      cur.fog = lerp(cur.fog, tg.fog, 1 - Math.exp(-dt / 3.5));
      cur.wind = lerp(cur.wind, tg.wind, 1 - Math.exp(-dt / 3));
      const real = forceH ?? ((d) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600)(new Date());
      let dh = real - hour;
      if (dh > 12) dh -= 24; else if (dh < -12) dh += 24;
      hour = (hour + clamp(dh, -4 * dt, 4 * dt) + 24) % 24;
      drift += dt * (0.012 + cur.wind * 0.03);

      const night = nightness(hour);
      let [top, mid, bot] = skyAt(hour);
      const gloom = clamp(Math.max(cur.cloud * 0.7, cur.rain * 0.92, cur.fog * 0.5), 0, 1);
      const lum = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      const grey = (c: RGB, d: number): RGB => { const l = lum(c) * d; return [l * 0.93, l * 0.99, l * 1.08]; };
      const dark = 0.9 - cur.rain * 0.32 - cur.storm * 0.2;
      top = mix(top, grey(top, dark * 0.85), gloom);
      mid = mix(mid, grey(mid, dark), gloom);
      bot = mix(bot, grey(bot, dark * 1.05), gloom);

      const hor = -0.2;
      const arc = (t: number): [number, number] => [(t - 0.5) * aspect * 0.86, hor + Math.sin(clamp(t, 0, 1) * Math.PI) * 0.52 - 0.012];
      const ts = (hour - 6) / 12;
      const tm = ((((hour - 18) % 24) + 24) % 24) / 12;
      const sun = arc(ts), moon = arc(tm);
      const sunVis = smooth(ts / 0.07) * smooth((1 - ts) / 0.07);
      const moonVis = smooth(tm / 0.07) * smooth((1 - tm) / 0.07);
      const alt = Math.sin(clamp(ts, 0, 1) * Math.PI);
      const sunCol = mix([1, 0.55, 0.26], [1, 0.95, 0.82], smooth(alt * 1.5));
      const fogCol = mix(mix(bot, [0.92, 0.94, 0.97], 0.55), [0.16, 0.19, 0.28], night * 0.85);
      const lightDir: [number, number] = sunVis > 0.1 || night < 0.5 ? [sun[0] * 0.4 + 0.1, 0.55] : [moon[0] * 0.4 + 0.1, 0.55];

      // petir
      if (cur.storm > 0.35) {
        nextBolt -= dt;
        if (nextBolt <= 0) {
          bolt = makeBolt(); boltLife = 0.22; flash = 1; echo = 0.13;
          nextBolt = (3 + Math.random() * 7) / cur.storm;
          flashPos = [(bolt[0].x / W - 0.5) * aspect, 0.5 - bolt[0].y / H];
        }
      }
      if (echo > 0) { echo -= dt; if (echo <= 0) flash = Math.max(flash, 0.7); }

      gl.uniform2f(U.uRes, cv.width, cv.height);
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      gl.uniform2f(U.uDrift, drift, drift * 0.15);
      gl.uniform3f(U.uTop, top[0], top[1], top[2]);
      gl.uniform3f(U.uMid, mid[0], mid[1], mid[2]);
      gl.uniform3f(U.uBot, bot[0], bot[1], bot[2]);
      gl.uniform3f(U.uSunCol, sunCol[0], sunCol[1], sunCol[2]);
      gl.uniform3f(U.uFogCol, fogCol[0], fogCol[1], fogCol[2]);
      gl.uniform2f(U.uSun, sun[0], sun[1]);
      gl.uniform2f(U.uMoon, moon[0], moon[1]);
      gl.uniform2f(U.uLight, lightDir[0], lightDir[1]);
      gl.uniform2f(U.uFlashPos, flashPos[0], flashPos[1]);
      gl.uniform1f(U.uSunVis, sunVis);
      gl.uniform1f(U.uMoonVis, moonVis);
      gl.uniform1f(U.uNight, night);
      gl.uniform1f(U.uCloud, cur.cloud);
      gl.uniform1f(U.uRain, cur.rain);
      gl.uniform1f(U.uStorm, cur.storm);
      gl.uniform1f(U.uFog, cur.fog);
      gl.uniform1f(U.uWind, cur.wind);
      gl.uniform1f(U.uFlash, flash);
      gl.uniform1f(U.uHor, hor);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // sambaran petir (overlay 2D)
      b2!.clearRect(0, 0, W, H);
      if (boltLife > 0 && bolt) {
        boltLife -= dt;
        b2!.save();
        b2!.globalAlpha = clamp(boltLife / 0.22, 0, 1);
        b2!.strokeStyle = '#f2f7ff';
        b2!.shadowColor = '#9cc4ff';
        b2!.shadowBlur = 26;
        b2!.lineWidth = 2.4;
        b2!.lineJoin = 'round';
        b2!.beginPath();
        bolt.forEach((p, i) => (i ? b2!.lineTo(p.x, p.y) : b2!.moveTo(p.x, p.y)));
        b2!.stroke();
        b2!.lineWidth = 1.1;
        b2!.beginPath();
        const m = bolt[Math.floor(bolt.length / 2)];
        b2!.moveTo(m.x, m.y);
        b2!.lineTo(m.x + W * 0.08, m.y + H * 0.13);
        b2!.lineTo(m.x + W * 0.05, m.y + H * 0.24);
        b2!.stroke();
        b2!.restore();
      }
      flash *= Math.exp(-dt * 7);
    }

    const loop = (t: number) => {
      if (!document.hidden) frame(t);
      if (reduced) to = setTimeout(() => { raf = requestAnimationFrame(loop); }, 1000);
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); if (to) clearTimeout(to); ro.disconnect(); };
  }, []);

  const status = live && !offline
    ? `Jakarta · ${live.temp}°C · ${codeLabel(live.code, lang)}`
    : (lang === 'id' ? 'Jakarta · cuaca nyata tidak tersedia' : 'Jakarta · live weather unavailable');

  return (
    <div ref={wrap} className="wx-wrap" data-no-i18n>
      <canvas ref={glRef} className="wx-canvas" aria-hidden="true" />
      <canvas ref={boltRef} className="wx-canvas wx-bolt" aria-hidden="true" />
      <div className="wx-ui">
        <div className="wx-status"><span className="wx-dot" />{status}</div>
      </div>
    </div>
  );
}
