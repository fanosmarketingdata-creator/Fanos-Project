'use client';

import { useEffect, useRef } from 'react';

// Latar aurora bergaya mesh-gradient (versi gelap): gumpalan cahaya lembut yang melayang pelan. Kecepatan 1.0 bawaan.
const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform float uTime; uniform vec2 uResolution; uniform vec3 uBase; uniform float uSeed;
uniform float uBright, uSat, uOpacity, uNoise, uFade, uBloom, uBlend;
uniform vec2 uMove; uniform vec4 uLS, uLI;

float h1(float i){ return fract(sin(i * 127.1 + uSeed) * 43758.5453); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// noise 1D halus: nilai acak yang berganti pelan-pelan (tiap "sel" waktu mendapat nilai acak baru)
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }

// Gumpalan cahaya: posisi, ukuran, kekuatan, dan warnanya berubah acak seiring waktu.
vec3 layer(vec3 col, vec2 p, vec2 b, vec2 amp, float rate, float id, float r, vec3 cA, vec3 cB, float k, float ls, float li){
  float t = uTime * rate * ls;
  vec2 q = b + amp * vec2(n1(t + id * 7.0) - 0.5, n1(t * 1.13 + id * 13.0 + 5.0) - 0.5) * 2.0;
  float rr = r * (0.75 + 0.6 * n1(t * 0.7 + id * 3.0));
  vec2 d = p - q;
  float w = pow(exp(-dot(d, d) / (rr * rr)), mix(1.6, 0.6, uBlend));
  float str = k * li * (0.25 + 0.95 * n1(t * 0.5 + id * 11.0));
  vec3 c = mix(cA, cB, smoothstep(0.25, 0.75, n1(t * 0.6 + id * 17.0)));
  return mix(col, c, clamp(w * str, 0.0, 1.0));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;
  float asp = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  // aliran lembut seperti kabut tertiup angin
  float nf = uNoise / 0.5;
  p += 0.08 * vec2(sin(uv.y * 3.0 * nf + uTime * 0.14 * -uMove.y), cos(uv.x * 2.5 * nf - uTime * 0.14 * -uMove.x));

  vec3 teal = vec3(0.035, 0.36, 0.33), green = vec3(0.04, 0.30, 0.14), cyan = vec3(0.03, 0.42, 0.56);
  vec3 blue = vec3(0.04, 0.17, 0.70), navy = vec3(0.02, 0.09, 0.42), indigo = vec3(0.14, 0.10, 0.58);

  vec3 col = uBase;
  col = layer(col, p, vec2(0.55 * asp, 0.55), vec2(0.34 * asp, 0.28), 0.10, 1.0, 0.62, navy, blue, 0.95, uLS.x / 0.27, uLI.x / 0.35);
  col = layer(col, p, vec2(0.15 * asp, 0.78), vec2(0.20 * asp, 0.22), 0.13, 2.0, 0.34, teal, green, 0.90, uLS.y / 0.27, uLI.y / 0.35);
  col = layer(col, p, vec2(0.05 * asp, 0.62), vec2(0.12 * asp, 0.24), 0.16, 3.0, 0.24, green, teal, 0.75, uLS.y / 0.27, uLI.y / 0.35);
  col = layer(col, p, vec2(0.82 * asp, 0.55), vec2(0.20 * asp, 0.26), 0.12, 4.0, 0.32, cyan, teal, 0.80, uLS.z / 0.27, uLI.z / 0.35);
  col = layer(col, p, vec2(0.92 * asp, 0.12), vec2(0.16 * asp, 0.18), 0.15, 5.0, 0.38, blue, indigo, 0.85, uLS.w / 0.27, uLI.w / 0.35);
  col = layer(col, p, vec2(0.72 * asp, 0.90), vec2(0.26 * asp, 0.14), 0.11, 6.0, 0.32, navy, cyan, 0.80, uLS.x / 0.27, uLI.x / 0.35);
  col = layer(col, p, vec2(0.32 * asp, 0.22), vec2(0.24 * asp, 0.18), 0.14, 7.0, 0.32, cyan, blue, 0.70, uLS.z / 0.27, uLI.z / 0.35);
  col = layer(col, p, vec2(0.50 * asp, 0.95), vec2(0.30 * asp, 0.10), 0.09, 8.0, 0.30, indigo, teal, 0.55, uLS.w / 0.27, uLI.w / 0.35);

  col += col * col * uBloom * 0.12;
  col *= 0.6 + uBright;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, uSat * 0.5);
  float v = smoothstep(1.15, 0.25, length((uv - 0.5) * vec2(1.0, 1.15)));
  col *= mix(0.55, 1.0, v);
  col *= 1.0 - uFade * (1.0 - uv.y);
  col = mix(uBase, col, uOpacity);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const DEFAULT_LS = [0.37, 0.15, 0.2, 0.3];
const DEFAULT_LI = [0.5, 0.35, 0.3, 0.4];

export default function AuroraBackground({
  speed = 1.0,
  brightness = 0.4,
  saturation = 2.0,
  opacity = 1.0,
  noiseScale = 0.5,
  movementX = -2.0,
  movementY = -3.0,
  verticalFade = 0.0,
  bloom = 5.0,
  blend = 0.5,
  layerSpeed = DEFAULT_LS,
  layerIntensity = DEFAULT_LI,
  base = '#030816',
}: {
  speed?: number;
  brightness?: number;
  saturation?: number;
  opacity?: number;
  noiseScale?: number;
  movementX?: number;
  movementY?: number;
  verticalFade?: number;
  bloom?: number;
  blend?: number;
  layerSpeed?: number[];
  layerIntensity?: number[];
  base?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext('webgl', { alpha: false, antialias: false }) as WebGLRenderingContext | null;
    if (!gl) return;
    const g: WebGLRenderingContext = gl;
    const mk = (type: number, src: string) => { const s = g.createShader(type)!; g.shaderSource(s, src); g.compileShader(s); return s; };
    const prog = g.createProgram()!;
    g.attachShader(prog, mk(g.VERTEX_SHADER, VERT));
    g.attachShader(prog, mk(g.FRAGMENT_SHADER, FRAG));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) return;
    g.useProgram(prog);
    const buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, buf);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    const loc = g.getAttribLocation(prog, 'position');
    g.enableVertexAttribArray(loc);
    g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);

    const u = (n: string) => g.getUniformLocation(prog, n);
    g.uniform3fv(u('uBase'), new Float32Array(hex(base)));
    g.uniform1f(u('uSeed'), Math.random() * 100); // tiap kunjungan berbeda
    g.uniform1f(u('uBright'), brightness);
    g.uniform1f(u('uSat'), saturation);
    g.uniform1f(u('uOpacity'), opacity);
    g.uniform1f(u('uNoise'), noiseScale);
    g.uniform1f(u('uFade'), verticalFade);
    g.uniform1f(u('uBloom'), bloom);
    g.uniform1f(u('uBlend'), blend);
    g.uniform2f(u('uMove'), movementX, movementY);
    g.uniform4f(u('uLS'), layerSpeed[0] ?? 0.3, layerSpeed[1] ?? 0.3, layerSpeed[2] ?? 0.3, layerSpeed[3] ?? 0.3);
    g.uniform4f(u('uLI'), layerIntensity[0] ?? 0.35, layerIntensity[1] ?? 0.35, layerIntensity[2] ?? 0.35, layerIntensity[3] ?? 0.35);
    const uTime = u('uTime'), uRes = u('uResolution');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(cv.clientWidth * dpr)), h = Math.max(1, Math.floor(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      g.viewport(0, 0, w, h);
      g.uniform2f(uRes, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      g.uniform1f(uTime, ((now - t0) / 1000) * speed);
      g.drawArrays(g.TRIANGLES, 0, 3);
      if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
      else if (reduce) raf = window.setTimeout(() => requestAnimationFrame(frame), 1000) as unknown as number;
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => { if (!document.hidden && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, base, brightness, saturation, opacity, noiseScale, movementX, movementY, verticalFade, bloom, blend, layerSpeed.join(), layerIntensity.join()]);

  return (
    <div className="aurora-bg" style={{ background: base }} aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
