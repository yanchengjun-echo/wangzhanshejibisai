/* ==========================================================================
   银绣山河 · 03 板块「巧手成纹」——数字蜡染（队友版整合）
   --------------------------------------------------------------------------
   从队友 batik.html 提炼，玩法与算法保持不变：
     选布（本白/月白/浅茶）→ 选纹样（9 稿）→ 沿底稿墨线描蜡（落空提示）
     → 浸染 → 氧化 → 脱蜡 → 成品（保存 2000×2086 PNG）
   核心机制：读取纹样图片像素，生成「只能描墨线」的蒙版，
     只有落在墨线附近（TOL≈12px）的笔触才留下蜡。

   对外接口（window.Batik，与苗绣通过 studio:mode 事件解耦）：
     Batik.reset()      重开（回选布）
     Batik.setStage(s)  直接跳某步（调试用）
     Batik.loadPattern(i) 选纹样
   依赖 studio.js（window.Studio）：监听 'studio:mode'，切到 dye 时重排画布。
   ========================================================================== */
(function () {
  'use strict';

  const W = 1000, H = 1043;
  const STEPS = ["CLOTH", "WAX", "DYE", "DEWAX", "DONE"];
  const FABRICS = [
    { name: "本白", hex: "#F7F2E6" },
    { name: "月白", hex: "#E9EFF5" },
    { name: "浅茶", hex: "#EFE4CF" }
  ];
  // 纹样图片：优先用 Base64 内嵌（patterns.js 提供），保证 file:// 双击打开也能读像素；
  // 未提供时回退到相对路径（HTTP 下同样可用）。
  function resolveSrc(key) {
    const b = (typeof window !== "undefined") && window.BATIK_PATTERNS && window.BATIK_PATTERNS[key];
    if (b) return b;
    return "assets/batik/pattern-" + key + ".jpg";
  }
  const PATTERNS = [
    { id: "peacock", key: "peacock", name: "孔雀花枝", src: resolveSrc("peacock"), crop: null },
    { id: "bird1", key: "birds", name: "鸟纹·回首", src: resolveSrc("birds"), crop: { x: 58, y: 57, w: 346, h: 347 } },
    { id: "bird2", key: "birds", name: "鸟纹·展翅", src: resolveSrc("birds"), crop: { x: 466, y: 467, w: 349, h: 345 } },
    { id: "p04", key: "p04", name: "纹样·四", src: resolveSrc("p04"), crop: null },
    { id: "p05", key: "p05", name: "纹样·五", src: resolveSrc("p05"), crop: null },
    { id: "p06", key: "p06", name: "纹样·六", src: resolveSrc("p06"), crop: null },
    { id: "p07", key: "p07", name: "纹样·七", src: resolveSrc("p07"), crop: null },
    { id: "p08", key: "p08", name: "纹样·八", src: resolveSrc("p08"), crop: null },
    { id: "p09", key: "p09", name: "纹样·九", src: resolveSrc("p09"), crop: null }
  ];
  const CFG = { MIN_WAX: 0.55, R: 22, TOL: 12, DYE_MS: 2600, OX_MS: 1200, DEWAX_MS: 2000, CRACKS: 50 };
  const HINTS = {
    CLOTH: "选一块布，再选一稿纹样。",
    WAX: "按住鼠标，沿淡蓝底稿描蜡；只有墨线上的笔触会留下蜡。",
    DYE: "靛蓝从布底漫上来，蜡线处保持布色。",
    DEWAX: "沸水把蜡煮化，蓝底白纹显现。",
    DONE: "一块蜡染完成了。可以保存成品，也可以再做一块。"
  };

  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get("debug") === "1";
  if (Q.get("fast") === "1") { CFG.DYE_MS = 260; CFG.OX_MS = 120; CFG.DEWAX_MS = 260; }

  const $ = (id) => document.getElementById(id);
  const el = {
    stage: $("batik-stage"), frame: $("batikFrame"), hint: $("batikHint"), knife: $("batikKnife"),
    toast: $("batikToast"), loadCard: $("batikLoad"), loadTitle: $("batikLoadTitle"), loadMsg: $("batikLoadMsg"),
    retry: $("batikRetry"), steps: $("batikSteps"), clothDots: $("batikClothDots"), patCards: $("batikPatCards"),
    btnStart: $("batikBtnStart"), progFill: $("batikProgFill"), progTxt: $("batikProgTxt"), guide: $("batikGuide"),
    btnUndo: $("batikBtnUndo"), btnClear: $("batikBtnClear"), btnFill: $("batikBtnFill"), btnToDye: $("batikBtnToDye"),
    btnDewax: $("batikBtnDewax"), btnSave: $("batikBtnSave"), btnAgain: $("batikBtnAgain"), donePrev: $("batikDonePrev"),
    dyeStatus: $("batikDyeStatus"), proto: $("batikProto"), debug: $("batikDebug")
  };

  if (!el.stage) return;   // 非体验页（没有蜡染工作台）直接退出

  const ctx = el.stage.getContext("2d");

  const state = {
    stage: "CLOTH", fabric: FABRICS[0], pattern: 0, ready: false, loading: false, busy: false,
    progress: 0, guide: true, waxVis: 1, dyeLevel: 0, oxidation: 0, allWax: false, dewaxP: 0
  };

  let layers = {}, ink = null, totalInk = 0, covered = null, coveredCount = 0;
  let strokes = [], current = null, drawing = false, lastPt = null;
  let dirtyWax = false, needsDraw = false, raf = null, brush = null;
  let crackSeeds = [], drops = [], runId = 0, loadToken = 0;
  let finalCanvas = null, finalURL = "";

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w || W; c.height = h || H;
    return c;
  }
  function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function toast(msg, ms) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.toast.classList.remove("show"), ms || 2200);
  }

  function initLayers() {
    layers = {
      cloth: makeCanvas(), inkMask: makeCanvas(), guide: makeCanvas(),
      waxRaw: makeCanvas(), waxMask: makeCanvas(), waxTint: makeCanvas(), dye: makeCanvas()
    };
    layers.clothCtx = layers.cloth.getContext("2d");
    layers.waxRawCtx = layers.waxRaw.getContext("2d");
    layers.waxMaskCtx = layers.waxMask.getContext("2d");
    layers.waxTintCtx = layers.waxTint.getContext("2d");
    layers.dyeCtx = layers.dye.getContext("2d");
    layers.waxRawCtx.lineCap = "round";
    layers.waxRawCtx.lineJoin = "round";
    brush = makeBrush(CFG.R);
  }
  function makeBrush(r) {
    const c = makeCanvas(r * 2, r * 2), x = c.getContext("2d");
    const g = x.createRadialGradient(r, r, r * 0.35, r, r, r);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.82, "rgba(255,255,255,1)");
    g.addColorStop(0.96, "rgba(255,255,255,0.82)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath(); x.arc(r, r, r, 0, Math.PI * 2); x.fill();
    return c;
  }
  function tint(src, color) {
    const c = makeCanvas(), x = c.getContext("2d");
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = "source-over";
    return c;
  }

  function buildCloth() {
    const c = layers.clothCtx;
    c.clearRect(0, 0, W, H);
    c.fillStyle = state.fabric.hex; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = 0.035; c.strokeStyle = "#000"; c.lineWidth = 0.6;
    for (let x = 0; x < W; x += 3) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 3) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.restore();
    c.save();
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      c.fillStyle = "rgba(80,60,30," + (0.015 + Math.random() * 0.035).toFixed(3) + ")";
      c.fillRect(x, y, 1, 1);
    }
    c.restore();
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(45,34,16,0.10)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  function buildMask(img, crop) {
    const tmp = makeCanvas();
    const t = tmp.getContext("2d", { willReadFrequently: true });
    t.fillStyle = "#fff"; t.fillRect(0, 0, W, H);
    const sw = crop ? crop.w : img.naturalWidth;
    const sh = crop ? crop.h : img.naturalHeight;
    const sx = crop ? crop.x : 0;
    const sy = crop ? crop.y : 0;
    const s = Math.min((W - 60) / sw, (H - 60) / sh);
    const dw = sw * s, dh = sh * s;
    t.drawImage(img, sx, sy, sw, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const src = t.getImageData(0, 0, W, H);
    const out = t.createImageData(W, H);
    ink = new Uint8Array(W * H);
    totalInk = 0;
    for (let i = 0; i < W * H; i++) {
      const p = i * 4;
      const a0 = src.data[p + 3];
      let a = 0;
      if (a0 > 128) {
        const lum = 0.299 * src.data[p] + 0.587 * src.data[p + 1] + 0.114 * src.data[p + 2];
        if (lum < 120) a = 255;
        else if (lum < 165) a = Math.round(255 * (165 - lum) / 45);
      }
      out.data[p] = 255; out.data[p + 1] = 255; out.data[p + 2] = 255; out.data[p + 3] = a;
      if (a > 128) { ink[i] = 1; totalInk++; }
    }
    const im = layers.inkMask.getContext("2d");
    im.clearRect(0, 0, W, H); im.putImageData(out, 0, 0);
    layers.guide = tint(layers.inkMask, "#2A4A70");
    covered = new Uint8Array(W * H); coveredCount = 0;
    buildCrackSeeds();
  }
  function buildCrackSeeds() {
    crackSeeds = [];
    for (let y = 6; y < H - 6; y += 6) {
      for (let x = 6; x < W - 6; x += 6) {
        const i = y * W + x;
        if (!ink[i]) continue;
        let dx = 0, dy = 0;
        if (!ink[i - 1]) dx = -1;
        else if (!ink[i + 1]) dx = 1;
        else if (!ink[i - W]) dy = -1;
        else if (!ink[i + W]) dy = 1;
        if (dx || dy) crackSeeds.push({ x, y, dx, dy });
      }
    }
  }

  function clearWax() {
    if (!layers.waxRawCtx) return;
    layers.waxRawCtx.clearRect(0, 0, W, H);
    layers.waxMaskCtx.clearRect(0, 0, W, H);
    layers.waxTintCtx.clearRect(0, 0, W, H);
    if (covered) covered.fill(0);
    coveredCount = 0; strokes = []; current = null;
    state.allWax = false; state.progress = 0; state.waxVis = 1;
    dirtyWax = false;
    updateProgressUI();
  }
  function rebuildWax() {
    if (state.allWax) return;
    const m = layers.waxMaskCtx;
    m.clearRect(0, 0, W, H);
    m.drawImage(layers.waxRaw, 0, 0);
    m.globalCompositeOperation = "destination-in";
    m.drawImage(layers.inkMask, 0, 0);
    m.globalCompositeOperation = "source-over";
    const t = layers.waxTintCtx;
    t.clearRect(0, 0, W, H);
    t.drawImage(layers.waxMask, 0, 0);
    t.globalCompositeOperation = "source-in";
    const g = t.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#EAD3A8"); g.addColorStop(0.55, "#E0C692"); g.addColorStop(1, "#D2B47C");
    t.fillStyle = g; t.fillRect(0, 0, W, H);
    t.globalCompositeOperation = "source-over";
  }
  function hasInkNear(x, y) {
    if (!ink) return false;
    const t = (function () {
      const w = el.stage.getBoundingClientRect().width || W;
      return clamp(12 * 1000 / w, 12, 36);
    })();
    const x0 = Math.max(0, Math.floor(x - t)), x1 = Math.min(W - 1, Math.ceil(x + t));
    const y0 = Math.max(0, Math.floor(y - t)), y1 = Math.min(H - 1, Math.ceil(y + t));
    for (let yy = y0; yy <= y1; yy += 2) {
      const row = yy * W;
      for (let xx = x0; xx <= x1; xx += 2) if (ink[row + xx]) return true;
    }
    return false;
  }
  function rawStamp(x, y) {
    const c = layers.waxRawCtx;
    c.drawImage(brush, x - CFG.R, y - CFG.R);
    const r = CFG.R - 2, r2 = r * r;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
    let added = 0;
    for (let yy = y0; yy <= y1; yy++) {
      const dy = yy - y, row = yy * W;
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx - x;
        if (dx * dx + dy * dy > r2) continue;
        const i = row + xx;
        if (ink[i] && !covered[i]) { covered[i] = 1; added++; }
      }
    }
    coveredCount += added;
    dirtyWax = true;
    return added;
  }
  function stampAt(x, y) {
    if (state.allWax || !state.ready || !ink) return false;
    if (!hasInkNear(x, y)) return false;
    rawStamp(x, y);
    state.progress = totalInk ? coveredCount / totalInk : 0;
    updateProgressUI();
    requestDraw();
    return true;
  }
  function replayStrokes() {
    layers.waxRawCtx.clearRect(0, 0, W, H);
    layers.waxMaskCtx.clearRect(0, 0, W, H);
    layers.waxTintCtx.clearRect(0, 0, W, H);
    covered.fill(0); coveredCount = 0;
    for (const stroke of strokes) for (const p of stroke) rawStamp(p.x, p.y);
    state.progress = totalInk ? coveredCount / totalInk : 0;
    dirtyWax = true; updateProgressUI(); requestDraw();
  }
  function autoFill() {
    if (!state.ready || !layers.inkMask) return;
    state.allWax = true;
    const m = layers.waxMaskCtx;
    m.clearRect(0, 0, W, H); m.drawImage(layers.inkMask, 0, 0);
    const t = layers.waxTintCtx;
    t.clearRect(0, 0, W, H); t.drawImage(layers.inkMask, 0, 0);
    t.globalCompositeOperation = "source-in";
    const g = t.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#EAD3A8"); g.addColorStop(0.55, "#E0C692"); g.addColorStop(1, "#D2B47C");
    t.fillStyle = g; t.fillRect(0, 0, W, H);
    t.globalCompositeOperation = "source-over";
    covered.fill(1); coveredCount = totalInk; strokes = [];
    dirtyWax = false; state.progress = totalInk ? 1 : 0;
    updateProgressUI(); requestDraw(); toast("已补全剩余蜡线");
  }

  function requestDraw() {
    needsDraw = true;
    if (!raf) raf = requestAnimationFrame(drawFrame);
  }
  function drawFrame() {
    raf = null;
    needsDraw = false;
    if (dirtyWax) { rebuildWax(); dirtyWax = false; }
    draw();
    if (needsDraw && !raf) raf = requestAnimationFrame(drawFrame);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(layers.cloth, 0, 0);
    if ((state.stage === "CLOTH" || state.stage === "WAX") && state.guide && layers.guide) {
      ctx.globalAlpha = state.stage === "CLOTH" ? 0.16 : 0.22;
      ctx.drawImage(layers.guide, 0, 0);
      ctx.globalAlpha = 1;
    }
    if (state.waxVis > 0 && state.stage !== "CLOTH" && state.stage !== "DONE") {
      ctx.globalAlpha = state.waxVis;
      ctx.drawImage(layers.waxTint, 0, 0);
      ctx.globalAlpha = 1;
    }
    if (state.dyeLevel > 0) {
      const top = H - H * state.dyeLevel;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.clip();
      ctx.drawImage(layers.dye, 0, 0);
      ctx.restore();
      if (state.stage === "DYE" && state.dyeLevel < 0.999) drawSurface(top);
    }
    if (state.oxidation > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(74,110,72," + (0.30 * state.oxidation) + ")";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (state.stage === "DEWAX" && state.dewaxP > 0) drawDrops();
    if (DEBUG) updateDebug();
  }
  function drawSurface(top) {
    const t = performance.now() / 620;
    ctx.save();
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = top + Math.sin(x * 0.018 + t) * 2.2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(196,224,246,.40)"; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const bx = (i * 167 + 73) % W;
      const by = top - 8 - ((performance.now() / 16 + i * 37) % 80);
      const br = 1.5 + (i % 3) * 0.9;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(210,235,255," + (0.10 + (i % 3) * 0.05) + ")"; ctx.fill();
    }
    ctx.restore();
  }
  function makeDrops() {
    const rnd = mulberry32(20261108);
    drops = [];
    for (let i = 0; i < 14; i++) {
      drops.push({ x: 100 + rnd() * 800, y: 560 + rnd() * 360, r: 1.6 + rnd() * 2.8, lag: rnd() * 0.25 });
    }
  }
  function drawDrops() {
    const p = state.dewaxP;
    ctx.save();
    for (const d of drops) {
      const q = clamp((p - d.lag) / 0.75, 0, 1);
      const y = d.y - q * 250;
      const a = (1 - q) * 0.65;
      ctx.beginPath();
      ctx.arc(d.x + Math.sin(q * 6 + d.r) * 6, y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232,192,112," + a + ")"; ctx.fill();
    }
    ctx.restore();
  }

  function buildDye() {
    const c = layers.dyeCtx;
    c.clearRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2E5B7E"); g.addColorStop(0.48, "#1B3A63"); g.addColorStop(1, "#10243F");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "destination-out";
    c.drawImage(layers.waxMask, 0, 0);
    c.globalCompositeOperation = "source-over";
    drawCracks(c);
  }
  function drawCracks(c) {
    if (!crackSeeds.length) return;
    const rnd = mulberry32(99173);
    c.save(); c.lineCap = "round";
    for (let i = 0; i < CFG.CRACKS; i++) {
      const s = crackSeeds[(rnd() * crackSeeds.length) | 0];
      let x = s.x, y = s.y;
      const base = Math.atan2(s.dy, s.dx) + (rnd() < 0.58 ? Math.PI : 0) + (rnd() - .5) * 0.55;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const ang = base + (rnd() - .5) * 0.95;
        const len = 3 + rnd() * 8;
        x += Math.cos(ang) * len; y += Math.sin(ang) * len;
        c.lineTo(x, y);
      }
      c.strokeStyle = "rgba(7,18,32," + (0.28 + rnd() * 0.25).toFixed(2) + ")";
      c.lineWidth = 0.8 + rnd() * 0.8;
      c.stroke();
    }
    c.restore();
  }

  function startDye() {
    if (state.busy || state.stage !== "WAX") return;
    if (state.progress < CFG.MIN_WAX) {
      toast("再描一些，至少 55% 才能入染");
      el.frame.classList.add("shake");
      setTimeout(() => el.frame.classList.remove("shake"), 280);
      return;
    }
    if (dirtyWax) { rebuildWax(); dirtyWax = false; }
    buildDye();
    setStage("DYE");
    state.busy = true; state.dyeLevel = 0; state.oxidation = 0;
    el.dyeStatus.textContent = "靛蓝正在渗入纤维…";
    const id = ++runId, t0 = performance.now();
    function dyeTick(t) {
      if (id !== runId) return;
      const p = clamp((t - t0) / CFG.DYE_MS, 0, 1);
      state.dyeLevel = easeInOut(p);
      requestDraw();
      if (p < 1) { requestAnimationFrame(dyeTick); return; }
      state.dyeLevel = 1; state.oxidation = 1;
      el.dyeStatus.textContent = "出缸时偏黄绿，正在氧化…";
      const t1 = performance.now();
      function oxTick(tt) {
        if (id !== runId) return;
        const q = clamp((tt - t1) / CFG.OX_MS, 0, 1);
        state.oxidation = 1 - q;
        requestDraw();
        if (q < 1) { requestAnimationFrame(oxTick); return; }
        state.oxidation = 0; state.busy = false;
        setStage("DEWAX");
        toast("浸染完成，蜡还封着布");
      }
      requestAnimationFrame(oxTick);
    }
    requestAnimationFrame(dyeTick);
  }
  function startDewax() {
    if (state.busy || state.stage !== "DEWAX") return;
    state.busy = true; state.dewaxP = 0; state.waxVis = 1;
    makeDrops();
    const id = ++runId, t0 = performance.now();
    function tick(t) {
      if (id !== runId) return;
      const p = clamp((t - t0) / CFG.DEWAX_MS, 0, 1);
      state.dewaxP = p;
      state.waxVis = 1 - easeInOut(p);
      requestDraw();
      if (p < 1) { requestAnimationFrame(tick); return; }
      state.waxVis = 0; state.busy = false;
      setTimeout(() => { if (id === runId) setStage("DONE"); }, 320);
    }
    requestAnimationFrame(tick);
  }

  function buildFinal() {
    if (!layers.cloth || !layers.dye) return;
    const out = makeCanvas(2000, 2086);
    const c = out.getContext("2d");
    c.imageSmoothingEnabled = true;
    c.drawImage(layers.cloth, 0, 0, 2000, 2086);
    c.drawImage(layers.dye, 0, 0, 2000, 2086);
    finalCanvas = out;
    try {
      finalURL = out.toDataURL("image/png");
      el.donePrev.src = finalURL;
    } catch (e) {
      finalURL = "";
      toast("成品预览失败，请通过本地服务器打开");
    }
  }
  function saveImage() {
    if (!finalCanvas && state.stage === "DONE") buildFinal();
    if (!finalCanvas) { toast("成品还没准备好"); return; }
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const name = "蜡染作品_" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "_" + pad(d.getHours()) + pad(d.getMinutes()) + ".png";
    try {
      finalCanvas.toBlob(function (blob) {
        if (!blob) { fallbackSave(name); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 12000);
        toast("已保存 2000×2086 成品图");
      }, "image/png");
    } catch (e) { fallbackSave(name); }
  }
  function fallbackSave(name) {
    try {
      const a = document.createElement("a");
      a.href = finalCanvas.toDataURL("image/png");
      a.download = name; a.click();
      toast("已保存成品图");
    } catch (e) { toast("保存失败：请通过本地服务器打开"); }
  }

  function setStage(s) {
    if (state.stage === s) return;
    state.stage = s;
    const idx = STEPS.indexOf(s);
    el.steps.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("cur", i === idx);
      li.classList.toggle("done", i < idx);
      const no = li.querySelector(".no");
      if (no) {
        no.textContent = i < idx ? "✓" : String(i + 1).padStart(2, "0");
        if (i < idx) {
          no.style.setProperty("background", "#08111b", "important");
          no.style.setProperty("color", "#c9ad78", "important");
          no.style.setProperty("border-color", "rgba(201,173,120,.72)", "important");
          no.style.setProperty("box-shadow", "none", "important");
        } else if (i === idx) {
          no.style.setProperty("background", "#0b1621", "important");
          no.style.setProperty("color", "#e6cfa3", "important");
          no.style.setProperty("border-color", "#e6cfa3", "important");
        } else {
          no.style.setProperty("background", "#08111b", "important");
          no.style.setProperty("color", "rgba(239,231,216,.40)", "important");
          no.style.setProperty("border-color", "rgba(230,207,163,.22)", "important");
          no.style.setProperty("box-shadow", "none", "important");
        }
      }
    });
    STEPS.forEach(k => {
      const pane = $("batik-p-" + k);
      if (pane) pane.classList.toggle("show", k === s);
    });
    el.hint.textContent = HINTS[s] || "";
    el.frame.classList.toggle("waxing", s === "WAX");
    el.knife.classList.remove("show");
    if (s === "DONE") {
      if (state.dyeLevel < 1) { state.dyeLevel = 1; state.waxVis = 0; }
      buildFinal();
    }
    requestDraw();
  }
  function updateProgressUI() {
    const pct = Math.round((state.progress || 0) * 100);
    el.progFill.style.width = pct + "%";
    el.progTxt.textContent = "上蜡 " + pct + "%";
    const ok = state.progress >= CFG.MIN_WAX;
    el.btnToDye.setAttribute("aria-disabled", ok ? "false" : "true");
    el.btnToDye.classList.toggle("is-disabled", !ok);
    el.btnToDye.textContent = ok ? "浸入染缸" : "浸入染缸（还差 " + Math.max(0, Math.ceil(CFG.MIN_WAX * 100) - pct) + "%）";
  }

  function toCanvas(e) {
    const r = el.stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function moveKnife(e) {
    if (state.stage !== "WAX" || e.pointerType === "touch") { el.knife.classList.remove("show"); return; }
    el.knife.classList.add("show");
    el.knife.style.left = e.clientX + "px";
    el.knife.style.top = e.clientY + "px";
    const p = toCanvas(e);
    el.knife.classList.toggle("bad", !hasInkNear(p.x, p.y));
  }
  function startDraw(e) {
    if (state.stage !== "WAX" || state.busy) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    el.stage.setPointerCapture(e.pointerId);
    drawing = true;
    const p = toCanvas(e);
    lastPt = p; current = [p];
    if (!stampAt(p.x, p.y)) {
      toast("这里没有底稿，蜡刀落空");
      el.frame.classList.add("shake");
      setTimeout(() => el.frame.classList.remove("shake"), 260);
    }
  }
  function moveDraw(e) {
    if (!drawing || state.stage !== "WAX") return;
    e.preventDefault();
    const p = toCanvas(e);
    const dx = p.x - lastPt.x, dy = p.y - lastPt.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i <= steps; i++) stampAt(lastPt.x + dx * i / steps, lastPt.y + dy * i / steps);
    current.push(p); lastPt = p;
  }
  function endDraw() {
    if (!drawing) return;
    drawing = false;
    if (current && current.length) strokes.push(current);
    current = null; lastPt = null;
    if (dirtyWax) { rebuildWax(); dirtyWax = false; }
    state.progress = totalInk ? coveredCount / totalInk : 0;
    updateProgressUI(); requestDraw();
  }

  function showLoad(title, msg, isError) {
    el.loadTitle.textContent = title;
    el.loadMsg.textContent = msg;
    el.loadCard.classList.add("show");
    el.loadCard.classList.toggle("error", !!isError);
    el.retry.hidden = !isError;
  }
  function hideLoad() {
    el.loadCard.classList.remove("show", "error");
    el.retry.hidden = true;
  }
  function loadPattern(idx) {
    const p = PATTERNS[idx];
    if (!p) return;
    state.pattern = idx; state.ready = false; state.loading = true;
    el.btnStart.setAttribute("aria-disabled", "true");
    el.patCards.querySelectorAll(".batik-pat").forEach((c, i) => c.classList.toggle("sel", i === idx));
    showLoad("正在提取纹样", "第一次加载需要读取纹样像素，请稍候。", false);
    const token = ++loadToken;
    const img = new Image();
    img.decoding = "async";
    // 仅对跨域 HTTP 图片设置 crossOrigin；data URL 与 file:// 下设置反而会触发 CORS 拦截
    if (/^https?:/i.test(p.src)) img.crossOrigin = "anonymous";
    img.onload = function () {
      if (token !== loadToken) return;
      try {
        buildMask(img, p.crop);
        clearWax();
        state.ready = true; state.loading = false;
        hideLoad();
        el.btnStart.setAttribute("aria-disabled", "false");
        updateProgressUI(); requestDraw();
        toast("纹样「" + p.name + "」已就绪");
      } catch (e) {
        showLoad("纹样读取失败", "浏览器阻止了像素读取，请刷新重试。", true);
      }
    };
    img.onerror = function () {
      if (token !== loadToken) return;
      showLoad("纹样加载失败", "纹样资源未能加载，请刷新重试。", true);
    };
    img.src = p.src;
  }

  function buildClothDots() {
    el.clothDots.innerHTML = "";
    FABRICS.forEach((f, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "batik-swatch" + (i === 0 ? " sel" : "");
      b.style.background = f.hex; b.title = f.name;
      b.setAttribute("aria-label", "布色：" + f.name);
      b.dataset.i = i;
      el.clothDots.appendChild(b);
    });
  }
  function updateClothSel() {
    el.clothDots.querySelectorAll(".batik-swatch").forEach((b, i) => {
      b.classList.toggle("sel", FABRICS[i].hex === state.fabric.hex);
    });
  }
  function drawThumb(canvas, p) {
    const c = canvas.getContext("2d"), size = canvas.width;
    c.fillStyle = "#fff"; c.fillRect(0, 0, size, size);
    c.fillStyle = "#eee"; c.font = "10px sans-serif"; c.textAlign = "center";
    c.fillText(p.name, size / 2, size / 2);
    const img = new Image();
    if (/^https?:/i.test(p.src)) img.crossOrigin = "anonymous";
    img.onload = function () {
      c.fillStyle = "#fff"; c.fillRect(0, 0, size, size);
      const sw = p.crop ? p.crop.w : img.naturalWidth;
      const sh = p.crop ? p.crop.h : img.naturalHeight;
      const sx = p.crop ? p.crop.x : 0;
      const sy = p.crop ? p.crop.y : 0;
      const s = Math.min((size - 12) / sw, (size - 12) / sh);
      const dw = sw * s, dh = sh * s;
      c.drawImage(img, sx, sy, sw, sh, (size - dw) / 2, (size - dh) / 2, dw, dh);
    };
    img.src = p.src;
  }
  function buildPatCards() {
    el.patCards.innerHTML = "";
    PATTERNS.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "batik-pat" + (i === 0 ? " sel" : "");
      b.dataset.i = i; b.setAttribute("aria-label", "纹样：" + p.name);
      const cv = document.createElement("canvas"); cv.width = 110; cv.height = 110;
      const s = document.createElement("span"); s.textContent = p.name;
      b.appendChild(cv); b.appendChild(s); el.patCards.appendChild(b);
      drawThumb(cv, p);
    });
  }

  function resetAll() {
    runId++;
    state.busy = false; state.dyeLevel = 0; state.oxidation = 0;
    state.dewaxP = 0; state.waxVis = 1;
    finalCanvas = null; finalURL = "";
    el.donePrev.removeAttribute("src");
    clearWax(); dirtyWax = false;
    setStage("CLOTH"); requestDraw();
    toast("已重新开始");
  }

  function bind() {
    el.stage.addEventListener("pointerdown", startDraw);
    el.stage.addEventListener("pointermove", moveDraw);
    el.stage.addEventListener("pointerup", endDraw);
    el.stage.addEventListener("pointercancel", endDraw);
    el.stage.addEventListener("pointerleave", () => { if (!drawing) el.knife.classList.remove("show"); });
    el.stage.addEventListener("contextmenu", e => e.preventDefault());
    document.addEventListener("pointermove", moveKnife);
    document.addEventListener("pointerleave", () => el.knife.classList.remove("show"));

    el.clothDots.addEventListener("click", e => {
      const b = e.target.closest(".batik-swatch"); if (!b) return;
      state.fabric = FABRICS[+b.dataset.i];
      updateClothSel(); buildCloth(); requestDraw();
    });
    el.patCards.addEventListener("click", e => {
      const b = e.target.closest(".batik-pat"); if (!b) return;
      const i = +b.dataset.i;
      if (i === state.pattern && state.ready) return;
      loadPattern(i);
    });
    el.btnStart.addEventListener("click", () => {
      if (el.btnStart.getAttribute("aria-disabled") === "true") return;
      if (!state.ready) return;
      setStage("WAX"); updateProgressUI();
    });
    el.guide.addEventListener("change", () => { state.guide = el.guide.checked; requestDraw(); });
    el.btnUndo.addEventListener("click", () => {
      if (state.allWax) { toast("演示补全后请用「清空」重画"); return; }
      if (!strokes.length) { toast("没有可撤销的笔画"); return; }
      strokes.pop(); replayStrokes(); toast("已撤销一笔");
    });
    el.btnClear.addEventListener("click", () => {
      if (state.stage !== "WAX") return;
      clearWax(); requestDraw(); toast("已清空蜡迹");
    });
    el.btnFill.addEventListener("click", () => { if (state.stage === "WAX") autoFill(); });
    el.btnToDye.addEventListener("click", () => {
      if (el.btnToDye.getAttribute("aria-disabled") === "true") {
        toast("再描一些，至少 55% 才能入染");
        el.frame.classList.add("shake");
        setTimeout(() => el.frame.classList.remove("shake"), 280);
        return;
      }
      startDye();
    });
    el.btnDewax.addEventListener("click", startDewax);
    el.btnSave.addEventListener("click", saveImage);
    el.btnAgain.addEventListener("click", resetAll);
    el.retry.addEventListener("click", () => { if (state.pattern >= 0) loadPattern(state.pattern); });
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (state.stage === "WAX" && !state.busy && !state.allWax && strokes.length) {
          e.preventDefault(); strokes.pop(); replayStrokes();
        }
      }
    });
    // 仅当内嵌纹样数据缺失时才提示（正常情况下 Base64 内嵌，file:// 也能直接玩）
    if (location.protocol === "file:" && !(window.BATIK_PATTERNS && window.BATIK_PATTERNS.peacock)) {
      el.proto.classList.add("show");
    }
    if (DEBUG) el.debug.classList.add("show");
  }

  function updateDebug() {
    el.debug.textContent =
      "stage=" + state.stage +
      "\nprogress=" + Math.round(state.progress * 100) + "%" +
      "\ncovered=" + coveredCount + " / " + totalInk +
      "\nwaxVis=" + state.waxVis.toFixed(2) +
      "\ndyeLevel=" + state.dyeLevel.toFixed(2) +
      "\nviewport=" + innerWidth + "x" + innerHeight;
  }

  function init() {
    initLayers();
    buildCloth();
    buildClothDots();
    buildPatCards();
    bind();
    setStage("CLOTH");
    loadPattern(0);
    const pIdx = Q.get("pattern");
    if (pIdx !== null) {
      const n = parseInt(pIdx, 10);
      if (n >= 0 && n < PATTERNS.length) loadPattern(n);
    }
  }

  // 从苗绣切回蜡染时，画布可能刚从 hidden 恢复，尺寸需要重排
  if (window.Studio && window.Studio.on) {
    window.Studio.on('studio:mode', function (e) {
      if (e.detail && e.detail.mode === 'dye') {
        window.setTimeout(function () { requestDraw(); }, 30);
      }
    });
  }

  window.Batik = {
    reset: resetAll,
    setStage: setStage,
    loadPattern: loadPattern,
    save: saveImage,
    getState: function () { return state; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
