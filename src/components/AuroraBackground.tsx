'use client';

import { useEffect, useRef } from 'react';

// Latar aurora bergaya mesh-gradient (versi gelap): gumpalan cahaya lembut yang melayang pelan. Kecepatan 1.0 bawaan.
const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform float uTime; uniform vec2 uResolution; uniform vec3 uBase;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Satu gumpalan cahaya lembut (gaussian) yang melayang pelan.
float blob(vec2 p, vec2 c, vec2 amp, vec2 fr, float ph, float r){
  vec2 q = c + amp * vec2(sin(uTime * fr.x + ph), cos(uTime * fr.y + ph * 1.7));
  vec2 d = p - q;
  return exp(-dot(d, d) / (r * r));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;
  float asp = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  // lengkungan halus supaya bentuknya organik seperti kabut aurora
  p += 0.06 * vec2(sin(uv.y * 3.0 + uTime * 0.21), cos(uv.x * 2.5 - uTime * 0.17));

  vec3 col = uBase;
  // versi gelap dari palet aurora: teal-hijau (kiri atas), cyan (kanan), biru kerajaan, navy
  col = mix(col, vec3(0.020, 0.115, 0.330), blob(p, vec2(0.55 * asp, 0.55), vec2(0.20, 0.12), vec2(0.13, 0.11), 0.4, 0.62) * 0.95);
  col = mix(col, vec3(0.035, 0.360, 0.330), blob(p, vec2(0.12 * asp, 0.82), vec2(0.12, 0.10), vec2(0.17, 0.13), 1.3, 0.34) * 0.85);
  col = mix(col, vec3(0.040, 0.300, 0.140), blob(p, vec2(0.02 * asp, 0.68), vec2(0.07, 0.10), vec2(0.15, 0.19), 2.1, 0.22) * 0.70);
  col = mix(col, vec3(0.030, 0.420, 0.560), blob(p, vec2(0.80 * asp, 0.55), vec2(0.12, 0.14), vec2(0.12, 0.16), 3.2, 0.30) * 0.70);
  col = mix(col, vec3(0.040, 0.170, 0.700), blob(p, vec2(0.95 * asp, 0.10), vec2(0.10, 0.10), vec2(0.18, 0.12), 4.0, 0.36) * 0.80);
  col = mix(col, vec3(0.020, 0.090, 0.420), blob(p, vec2(0.75 * asp, 0.92), vec2(0.18, 0.06), vec2(0.10, 0.14), 5.1, 0.30) * 0.75);
  col = mix(col, vec3(0.030, 0.250, 0.350), blob(p, vec2(0.30 * asp, 0.22), vec2(0.15, 0.10), vec2(0.14, 0.18), 6.0, 0.30) * 0.55);

  // vignette gelap + butiran halus agar tidak ada banding
  float v = smoothstep(1.15, 0.25, length((uv - 0.5) * vec2(1.0, 1.15)));
  col *= mix(0.55, 1.0, v);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function AuroraBackground({
  speed = 1.0,
  base = '#030816',
}: {
  speed?: number;
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
  }, [speed, base]);

  return (
    <div className="aurora-bg" style={{ background: base }} aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
