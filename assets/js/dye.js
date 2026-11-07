/* ==========================================================================
   银绣山河 · 03 板块「巧手成纹」——蜡染体验线
   --------------------------------------------------------------------------
   状态机： waxing（画蜡） → dyeing（浸染） → cracking（冰裂） → done
   --------------------------------------------------------------------------
   三层画布结构（从下到上）：
     waxCanvas     离屏  蜡迹（主色不透明 + 毛边 alpha 0.3），同时充当防染遮罩
     dyeFabric     DOM   素布底纹 + 蜡迹（整体 alpha .85 呈半透明） + 冰裂纹
     dyeBlue       DOM   靛蓝染液，用 destination-out 按蜡迹 alpha 扣除 → 防染
   --------------------------------------------------------------------------
   为什么蜡迹单独放离屏画布：
     主线条是半透明的，逐段 stroke 会在接缝处叠加变深（一节一节的）。
     把不透明的蜡迹画在同一张离屏画布上，再整体以 alpha 合成，就干净了。
     同时这张画布的 alpha 正好可以给上层蓝色做 destination-out 遮罩。
   ========================================================================== */
(function () {
  'use strict';

  var STATE = { WAXING: 'waxing', DYEING: 'dyeing', CRACKING: 'cracking', DONE: 'done' };
  var STEP_ORDER = ['waxing', 'dyeing', 'cracking'];

  var WAX = '#F5E6C8';         // 蜡黄（规格色）
  var WAX_DEEP = '#EBD49D';    // 略深的蜡黄：只叠在描边上，让蜡迹在浅坯布上立得住
  var DYE_DURATION = 2000;     // 浸染耗时（ms）
  var CRACK_HOLD = 1000;       // 浸染结束静置（ms）
  var CRACK_DURATION = 2400;   // 冰裂蔓延耗时（ms）
  var FADE_IN_LIMIT = 26;      // 速度基准：位移超过这个值视为快笔

  /* ---------- 运行时状态 ---------- */
  var state = STATE.WAXING;
  var W = 0, H = 0, DPR = 1;

  var stage, fabricCanvas, blueCanvas, hintEl, noteEl, btnDye, btnReset;
  var fctx, bctx;
  var waxCanvas, wctx;          // 离屏蜡迹层
  var fabricTex = null;         // 离屏织物底纹

  var waxWidth = 6;
  var strokes = [];             // [{ pts: [{x,y,cx,cy}], width }]
  var curStroke = null;
  var drawing = false;
  var wobPhase = 0;

  var dyeLevel = 0;             // 0 → 1，染液淹没高度
  var cracks = [];              // [{ pts, len, alpha, width }]

  var renderPending = false;

  /* ======================================================================
     一、尺寸与画布
     ====================================================================== */
  var resizeTimer = null;

  function measureAndFit() {
    if (!stage) return;
    var rect = stage.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));

    DPR = Math.min(window.devicePixelRatio || 1, 2);

    if (w === W && h === H && waxCanvas) return;
    W = w; H = h;

    [fabricCanvas, blueCanvas].forEach(function (c) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
      c.style.width = W + 'px';
      c.style.height = H + 'px';
      var ctx = c.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    });

    fctx = fabricCanvas.getContext('2d');
    bctx = blueCanvas.getContext('2d');

    // 离屏蜡迹层：尺寸变化时重建，并把已有蜡迹按数据重画
    waxCanvas = document.createElement('canvas');
    waxCanvas.width = fabricCanvas.width;
    waxCanvas.height = fabricCanvas.height;
    wctx = waxCanvas.getContext('2d');
    wctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    buildFabricTexture();
    replayWax();
    renderAll();
  }

  /* ======================================================================
     二、织物底纹（只生成一次，尺寸变化时重建）
     ====================================================================== */
  function buildFabricTexture() {
    var c = document.createElement('canvas');
    c.width = Math.round(W * DPR);
    c.height = Math.round(H * DPR);
    var ctx = c.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // 坯布底色：微暖米白
    var g = ctx.createLinearGradient(0, 0, W * .4, H);
    g.addColorStop(0, '#FCFAF3');
    g.addColorStop(.55, '#F4EFE1');
    g.addColorStop(1, '#E9E2CF');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 经纬织纹（合并成一条 path，只 stroke 一次）
    ctx.strokeStyle = 'rgba(120, 104, 74, .055)';
    ctx.lineWidth = .5;
    ctx.beginPath();
    for (var x = 0; x < W; x += 3) {
      ctx.moveTo(x + .5, 0);
      ctx.lineTo(x + .5, H);
    }
    for (var y = 0; y < H; y += 3) {
      ctx.moveTo(0, y + .5);
      ctx.lineTo(W, y + .5);
    }
    ctx.stroke();

    // 织物噪点
    var dots = Math.min(5200, Math.round(W * H / 260));
    for (var i = 0; i < dots; i++) {
      ctx.fillStyle = 'rgba(120, 104, 74, ' + (Math.random() * .07).toFixed(3) + ')';
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }

    // 四角暗角，让布面有起伏
    var vg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * .32,
      W / 2, H / 2, Math.max(W, H) * .8
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(90, 74, 48, .16)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    fabricTex = c;
  }

  /* ======================================================================
     三、蜡迹绘制
     ====================================================================== */
  function strokeSeg(ctx, a, b, width, color) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 外层：略深的蜡黄，宽一点点，充当蜡迹边缘的堆积
    ctx.strokeStyle = WAX_DEEP;
    ctx.lineWidth = width + 1.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.cx, b.cy, b.x, b.y);
    ctx.stroke();

    // 内层：规格蜡黄主色
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.cx, b.cy, b.x, b.y);
    ctx.stroke();
  }

  /* 毛边：主路径两侧随机散落 1~3px 圆点，透明度 0.3 左右 */
  function drawFray(ctx, x, y, nx, ny, width) {
    var count = 2 + (Math.random() < .35 ? 1 : 0);
    for (var i = 0; i < count; i++) {
      var side = Math.random() < .5 ? -1 : 1;
      var off = (width / 2 + Math.random() * 2.8) * side;
      var r = .8 + Math.random() * 2.2;
      var jx = (Math.random() * 2 - 1) * 1.5;
      var jy = (Math.random() * 2 - 1) * 1.5;
      ctx.globalAlpha = .14 + Math.random() * .2;
      ctx.fillStyle = WAX_DEEP;
      ctx.beginPath();
      ctx.arc(x + nx * off + jx, y + ny * off + jy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* 一个点落到蜡迹层上（增量绘制，只画新增的一段） */
  function pushPoint(x, y) {
    if (!curStroke) return;
    var pts = curStroke.pts;
    var prev = pts[pts.length - 1];

    // 起笔：一个圆点（同样走双层，和外层描边一致）
    if (!prev) {
      pts.push({ x: x, y: y, cx: x, cy: y });
      wctx.fillStyle = WAX_DEEP;
      wctx.beginPath();
      wctx.arc(x, y, curStroke.width / 2 + .8, 0, Math.PI * 2);
      wctx.fill();
      wctx.fillStyle = WAX;
      wctx.beginPath();
      wctx.arc(x, y, curStroke.width / 2, 0, Math.PI * 2);
      wctx.fill();
      return;
    }

    var dx = x - prev.x;
    var dy = y - prev.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    // 距离过近的点丢弃，避免密集抖动
    if (dist < 1.1) return;

    // 速度 → 微弯幅度：慢笔时蜡液晃动明显，快笔趋于直线
    var amp = Math.max(.3, Math.min(2.0, 2.0 * (1 - dist / FADE_IN_LIMIT)));
    wobPhase += .55;
    var wob = Math.sin(wobPhase) * amp + (Math.random() * 2 - 1) * .55;

    // 法线方向（用于控制点偏移与毛边撒点）
    var nx = -dy / dist;
    var ny = dx / dist;

    var next = {
      x: x, y: y,
      cx: prev.x + dx * .5 + nx * wob,
      cy: prev.y + dy * .5 + ny * wob
    };
    pts.push(next);

    strokeSeg(wctx, prev, next, curStroke.width, WAX);
    drawFray(wctx, x, y, nx, ny, curStroke.width);
  }

  /* 重绘全部蜡迹（尺寸变化时用） */
  function replayWax() {
    if (!wctx) return;
    wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    wctx.clearRect(0, 0, W, H);
    wctx.lineCap = 'round';
    wctx.lineJoin = 'round';

    // 与增量绘制保持同一套画法：先整层铺外层（深蜡黄、稍宽），再铺内层主色
    [['#EBD49D', 1.6, null], [WAX, 0, true]].forEach(function (pass) {
      var color = pass[0];
      var extra = pass[1];
      var isInner = pass[2];

      strokes.forEach(function (s) {
        var w = s.width + (isInner ? 0 : extra);
        if (!s.pts.length) return;

        if (s.pts.length === 1) {
          wctx.fillStyle = color;
          wctx.beginPath();
          wctx.arc(s.pts[0].x, s.pts[0].y, w / 2, 0, Math.PI * 2);
          wctx.fill();
          return;
        }

        wctx.beginPath();
        wctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (var i = 1; i < s.pts.length; i++) {
          var p = s.pts[i];
          wctx.quadraticCurveTo(p.cx, p.cy, p.x, p.y);
        }
        wctx.strokeStyle = color;
        wctx.lineWidth = w;
        wctx.stroke();
      });
    });
  }

  /* ======================================================================
     四、合成渲染
     ====================================================================== */
  function renderFabric() {
    if (!fctx || !fabricTex) return;
    fctx.clearRect(0, 0, W, H);
    fctx.drawImage(fabricTex, 0, 0, W, H);

    // 蜡迹整体半透明合成（抵消段接缝的叠加伪影）
    if (strokes.length) {
      fctx.globalAlpha = .92;
      fctx.drawImage(waxCanvas, 0, 0, W, H);
      fctx.globalAlpha = 1;
    }
  }

  function renderDye() {
    if (!bctx) return;
    bctx.clearRect(0, 0, W, H);
    if (dyeLevel <= 0) return;

    var h = H * dyeLevel;
    var top = H - h;

    var grad = bctx.createLinearGradient(0, top, 0, H);
    grad.addColorStop(0, 'rgba(44, 84, 126, .96)');
    grad.addColorStop(.5, 'rgba(26, 52, 82, .97)');
    grad.addColorStop(1, 'rgba(10, 22, 36, .985)');
    bctx.fillStyle = grad;
    bctx.fillRect(0, top, W, h);

    // 液面高光
    bctx.fillStyle = 'rgba(150, 200, 245, .3)';
    bctx.fillRect(0, top, W, 1.5);

    // 防染：按蜡迹的 alpha 把蓝色抠掉，露出底下的素布
    bctx.globalCompositeOperation = 'destination-out';
    bctx.drawImage(waxCanvas, 0, 0, W, H);
    bctx.globalCompositeOperation = 'source-over';
  }

  function renderAll() {
    renderFabric();
    renderDye();
    updatePreview();
  }

  /* 节流：一帧最多渲染一次 */
  function requestRender() {
    if (renderPending) return;
    renderPending = true;
    window.requestAnimationFrame(function () {
      renderPending = false;
      renderFabric();
      renderDye();
      updatePreview();
    });
  }

  /* ======================================================================
     五、预览缩略
     ====================================================================== */
  function updatePreview() {
    var pctx = window.Studio && window.Studio.getPreviewCtx
      ? window.Studio.getPreviewCtx() : null;
    if (!pctx) return;

    var pw = pctx.canvas.width;
    var ph = pctx.canvas.height;
    pctx.clearRect(0, 0, pw, ph);

    pctx.drawImage(fabricCanvas, 0, 0, pw, ph);
    if (dyeLevel > 0) pctx.drawImage(blueCanvas, 0, 0, pw, ph);
  }

  /* ======================================================================
     六、画蜡：指针事件
     ====================================================================== */
  function localPos(e) {
    var r = fabricCanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (state !== STATE.WAXING) return;
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

    drawing = true;
    if (fabricCanvas.setPointerCapture) {
      try { fabricCanvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    }

    curStroke = { pts: [], width: waxWidth };
    strokes.push(curStroke);

    var p = localPos(e);
    pushPoint(p.x, p.y);
    hideHint();
    requestRender();
    e.preventDefault();
  }

  function onMove(e) {
    if (!drawing || state !== STATE.WAXING) return;

    // 触屏只在按下时画
    if (e.pointerType === 'touch' && e.buttons === 0) return;

    // 合并同一帧内的多个 move 事件，只取最后一个（更平滑也更省）
    var p = localPos(e);
    pushPoint(p.x, p.y);
    requestRender();
    e.preventDefault();
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    curStroke = null;
    if (fabricCanvas.releasePointerCapture && e.pointerId !== undefined) {
      try { fabricCanvas.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    }
    requestRender();
  }

  function bindPointer() {
    fabricCanvas.addEventListener('pointerdown', onDown);
    fabricCanvas.addEventListener('pointermove', onMove);
    fabricCanvas.addEventListener('pointerup', onUp);
    fabricCanvas.addEventListener('pointercancel', onUp);
    // 不监听 pointerleave：setPointerCapture 之后移出画布仍要继续画
  }

  /* ======================================================================
     七、状态机与提示
     ====================================================================== */
  function setState(next) {
    state = next;

    var idx = STEP_ORDER.indexOf(next);
    var steps = document.querySelectorAll('#dyeSteps .step');
    Array.prototype.forEach.call(steps, function (li, i) {
      li.classList.remove('is-active', 'is-done');
      if (next === STATE.DONE) li.classList.add('is-done');
      else if (i < idx) li.classList.add('is-done');
      else if (i === idx) li.classList.add('is-active');
    });

    if (btnDye) btnDye.disabled = next !== STATE.WAXING;
    if (btnReset) btnReset.disabled = (next === STATE.DYEING || next === STATE.CRACKING);
  }

  function setNote(text, kind) {
    if (!noteEl) return;
    noteEl.textContent = text || '';
    noteEl.classList.remove('is-warn', 'is-ok');
    if (kind === 'warn') noteEl.classList.add('is-warn');
    if (kind === 'ok') noteEl.classList.add('is-ok');
  }

  function hideHint() {
    if (hintEl) hintEl.classList.add('is-gone');
  }

  function showHint() {
    if (hintEl) hintEl.classList.remove('is-gone');
  }

  /* ======================================================================
     八、阶段 B：浸染
     ====================================================================== */
  function easeInOutQuad(t) {
    return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function startDyeing() {
    if (state !== STATE.WAXING) return;

    if (!strokes.length) {
      setNote('先在素布上画一笔蜡——有蜡的地方才染不上色。', 'warn');
      return;
    }

    setState(STATE.DYEING);
    hideHint();
    setNote('靛蓝正从缸底漫上来…');
    window.Studio && window.Studio.setPreviewLabel('浸染中');

    var t0 = performance.now();

    function step(now) {
      var t = Math.min(1, (now - t0) / DYE_DURATION);
      dyeLevel = easeInOutQuad(t);
      renderDye();
      updatePreview();

      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        setNote('静置片刻，蜡层正在开裂…');
        window.setTimeout(startCracking, CRACK_HOLD);
      }
    }

    window.requestAnimationFrame(step);
  }

  /* ======================================================================
     九、阶段 C：冰裂
     ====================================================================== */
  function pickSeeds(count) {
    var all = [];
    strokes.forEach(function (s) {
      s.pts.forEach(function (p) { all.push(p); });
    });
    if (!all.length) return [];

    var seeds = [];
    for (var i = 0; i < count; i++) {
      seeds.push(all[Math.floor(Math.random() * all.length)]);
    }
    return seeds;
  }

  /* 随机游走：从种子点出发，每步随机偏转，分支概率 0.3。
     离种子点过远就收住，让裂纹聚在蜡线周围，而不是铺满整块布 */
  var CRACK_REACH = 88;

  function walk(x, y, angle, life) {
    if (cracks.length > 110) return;

    var pts = [{ x: x, y: y }];
    var cx = x, cy = y, a = angle;

    for (var i = 0; i < life; i++) {
      a += (Math.random() - .5) * .95;

      var step = 2.4 + Math.random() * 4.2;
      cx += Math.cos(a) * step;
      cy += Math.sin(a) * step;

      if (cx < -12 || cx > W + 12 || cy < -12 || cy > H + 12) break;

      // 超出扩散半径就停住，避免裂纹飘到没有蜡的地方
      var rx = cx - x, ry = cy - y;
      if (rx * rx + ry * ry > CRACK_REACH * CRACK_REACH) break;

      pts.push({ x: cx, y: cy });

      // 分支
      if (i > 2 && i < life - 3 && Math.random() < .3) {
        walk(cx, cy,
          a + (Math.random() < .5 ? 1 : -1) * (.55 + Math.random() * .7),
          3 + Math.floor(Math.random() * 6));
      }
    }

    if (pts.length > 1) cracks.push({ pts: pts });
  }

  function polyLength(pts) {
    var len = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i].x - pts[i - 1].x;
      var dy = pts[i].y - pts[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  function generateCracks() {
    cracks = [];
    var seeds = pickSeeds(15);

    seeds.forEach(function (s) {
      if (cracks.length < 110) {
        walk(s.x, s.y, Math.random() * Math.PI * 2,
             8 + Math.floor(Math.random() * 14));
      }
    });

    // 预生成每条裂纹的线宽与透明度，避免逐帧随机导致闪烁
    cracks.forEach(function (c) {
      c.len = polyLength(c.pts);
      c.alpha = .55 + Math.random() * .4;
      c.width = 1.5 + Math.random() * 1.1;
    });
  }

  /* 用 lineDashOffset 让裂纹一点点蔓延开来 */
  function renderCracks(progress) {
    renderFabric();
    if (!cracks.length) return;

    fctx.lineCap = 'round';
    fctx.lineJoin = 'round';

    var total = cracks.length;
    for (var i = 0; i < total; i++) {
      var c = cracks[i];
      if (!c.len) continue;

      // 各条裂纹错开生长：前面的先裂，后面的补上
      var stagger = (i / total) * .55;
      var p = (progress - stagger) / .45;
      if (p <= 0) continue;
      if (p > 1) p = 1;

      fctx.setLineDash([c.len, c.len]);
      fctx.lineDashOffset = c.len * (1 - p);
      fctx.strokeStyle = 'rgba(5, 11, 20, ' + c.alpha.toFixed(3) + ')';
      fctx.lineWidth = c.width;

      fctx.beginPath();
      fctx.moveTo(c.pts[0].x, c.pts[0].y);
      for (var j = 1; j < c.pts.length; j++) {
        fctx.lineTo(c.pts[j].x, c.pts[j].y);
      }
      fctx.stroke();
    }

    fctx.setLineDash([]);
    fctx.lineDashOffset = 0;
  }

  function startCracking() {
    setState(STATE.CRACKING);
    generateCracks();
    window.Studio && window.Studio.setPreviewLabel('冰裂中');

    if (!cracks.length) {
      finishCracking();
      return;
    }

    var t0 = performance.now();

    function step(now) {
      var t = Math.min(1, (now - t0) / CRACK_DURATION);
      var eased = 1 - Math.pow(1 - t, 3);
      renderCracks(eased);
      updatePreview();

      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        renderCracks(1);
        updatePreview();
        finishCracking();
      }
    }

    window.requestAnimationFrame(step);
  }

  function finishCracking() {
    setState(STATE.DONE);
    setNote('冰裂纹已成——蜡裂到哪里，靛蓝就渗到哪里。', 'ok');
    window.Studio && window.Studio.setPreviewLabel('成布');
  }

  /* ======================================================================
     十、重置
     ====================================================================== */
  function reset() {
    if (state === STATE.DYEING || state === STATE.CRACKING) return;

    strokes = [];
    cracks = [];
    curStroke = null;
    drawing = false;
    dyeLevel = 0;
    wobPhase = 0;

    if (wctx) {
      wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      wctx.clearRect(0, 0, W, H);
    }

    renderAll();
    setState(STATE.WAXING);
    setNote('');
    showHint();
    window.Studio && window.Studio.setPreviewLabel('素坯');
  }

  /* ======================================================================
     十一、启动
     ====================================================================== */
  function start() {
    stage = document.getElementById('expStage');
    fabricCanvas = document.getElementById('dyeFabric');
    blueCanvas = document.getElementById('dyeBlue');
    hintEl = document.getElementById('dyeHint');
    noteEl = document.getElementById('dyeNote');
    btnDye = document.getElementById('btnDye');
    btnReset = document.getElementById('btnReset');

    if (!stage || !fabricCanvas || !blueCanvas) return;

    measureAndFit();
    bindPointer();

    // 笔触粗细
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-wax-width]'),
      function (btn) {
        btn.addEventListener('click', function () {
          waxWidth = parseInt(btn.getAttribute('data-wax-width'), 10) || 6;
          Array.prototype.forEach.call(
            document.querySelectorAll('[data-wax-width]'),
            function (b) {
              b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            }
          );
        });
      }
    );

    if (btnDye) btnDye.addEventListener('click', startDyeing);
    if (btnReset) btnReset.addEventListener('click', reset);

    // 尺寸变化：防抖后重建画布（保留蜡迹数据）
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measureAndFit, 160);
    });

    // 面板/画布从 hidden 恢复、栅格列宽变化时，窗口 resize 不会触发，
    // 用 ResizeObserver 兜住这类尺寸变化
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(measureAndFit, 140);
      });
      ro.observe(stage);
    }

    // 从入口屏切回蜡染模式时，画布可能刚从 hidden 恢复，需要重新量尺寸
    window.Studio && window.Studio.on('studio:mode', function (e) {
      if (e.detail && e.detail.mode === 'dye') {
        window.setTimeout(function () {
          measureAndFit();
          updatePreview();   // 从苗绣切回来时把预览框重新交还给蜡染
        }, 30);
      }
    });

    setState(STATE.WAXING);
    setNote('');
    window.Studio && window.Studio.setPreviewLabel('素坯');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
