/* ==========================================================================
   银绣山河 · 03 板块「巧手成纹」——苗绣体验线
   --------------------------------------------------------------------------
   两部分：
     1. 针法演示：平绣 / 打籽绣的走线循环小动画（纯 SVG + CSS animation）
     2. 虚拟绣绷：鼠标移动节流 30ms 生成针迹，
        平绣 = 垂直于走线方向的短针脚；打籽绣 = 一粒粒小圆籽
        针迹全部挂在 <g clip-path="url(#hoopClip)"> 下，超出背扇轮廓自动裁掉
   ========================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var THROTTLE = 30;          // 针迹生成节流（ms）
  var CLOTH_RADIUS = 236;     // 绣绷布面半径（viewBox 单位，圆心 300,300）
  var SEED_RADIUS = 300;      // 种子点选取半径

  var hoop, svg, layer, hintEl, countEl, demoEl, btnClear;

  var stitch = 'flat';        // 'flat' | 'seed'
  var color = '#C23B22';
  var count = 0;

  var lastX = 0, lastY = 0, hasLast = false;
  var lastTime = 0;
  var active = false;

  /* ======================================================================
     一、坐标换算：屏幕 → SVG viewBox 坐标
     ====================================================================== */

  /* 绣绷必须是正方形：宽高都写 100% 会让 viewBox 被拉伸，圆变椭圆。
     用容器短边算一个精确的边长，最稳 */
  function fitHoop() {
    if (!svg || !hoop) return;
    var w = hoop.clientWidth;
    var h = hoop.clientHeight;
    if (w <= 0 || h <= 0) return;

    var size = Math.max(120, Math.min(w, h));
    svg.style.width = size + 'px';
    svg.style.height = size + 'px';
  }

  function toSvgCoord(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    // preserveAspectRatio="xMidYMid meet"：取较小边做等比缩放，再居中
    var scale = Math.min(r.width, r.height) / 600;
    var offsetX = r.left + (r.width - 600 * scale) / 2;
    var offsetY = r.top + (r.height - 600 * scale) / 2;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale
    };
  }

  function insideCloth(x, y) {
    var dx = x - 300;
    var dy = y - 300;
    return dx * dx + dy * dy <= CLOTH_RADIUS * CLOTH_RADIUS;
  }

  /* ======================================================================
     二、生成针迹
     ====================================================================== */
  function addFlatStitch(x, y) {
    if (!hasLast) return;

    var dx = x - lastX;
    var dy = y - lastY;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 2.5) return;

    // 走线方向 → 法线方向 = 针脚方向（平绣的针脚垂直于走线）
    var nx = -dy / d;
    var ny = dx / d;
    var len = 9 + Math.random() * 7;
    var skew = (Math.random() - .5) * .35;   // 轻微歪斜，避免过于机械

    var ax = nx + (-ny) * skew;
    var ay = ny + (nx) * skew;

    var line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', (x + ax * len / 2).toFixed(1));
    line.setAttribute('y1', (y + ay * len / 2).toFixed(1));
    line.setAttribute('x2', (x - ax * len / 2).toFixed(1));
    line.setAttribute('y2', (y - ay * len / 2).toFixed(1));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', (2.3 + Math.random() * .9).toFixed(1));
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', (.78 + Math.random() * .22).toFixed(2));
    layer.appendChild(line);
  }

  function addSeedStitch(x, y) {
    var r = 2.1 + Math.random() * 1.5;

    var dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', (x + (Math.random() - .5) * 2).toFixed(1));
    dot.setAttribute('cy', (y + (Math.random() - .5) * 2).toFixed(1));
    dot.setAttribute('r', r.toFixed(1));
    dot.setAttribute('fill', color);
    dot.setAttribute('opacity', (.8 + Math.random() * .2).toFixed(2));
    layer.appendChild(dot);

    // 籽上的一点高光，看起来是一粒线疙瘩而不是平点
    var hi = document.createElementNS(NS, 'circle');
    hi.setAttribute('cx', (x - r * .3).toFixed(1));
    hi.setAttribute('cy', (y - r * .3).toFixed(1));
    hi.setAttribute('r', (r * .34).toFixed(1));
    hi.setAttribute('fill', '#FFFFFF');
    hi.setAttribute('opacity', '.4');
    layer.appendChild(hi);
  }

  function addStitch(x, y) {
    if (!insideCloth(x, y)) return;

    if (stitch === 'seed') {
      addSeedStitch(x, y);
    } else {
      addFlatStitch(x, y);
    }

    lastX = x;
    lastY = y;
    hasLast = true;

    count++;
    updateCount();
    requestPreview();
  }

  function updateCount() {
    if (countEl) countEl.textContent = '已绣 ' + count + ' 针';
  }

  /* ======================================================================
     三、右栏实时预览：把绣绷和已绣针迹等比缩略过去
     ====================================================================== */
  var previewPending = false;

  function requestPreview() {
    if (previewPending) return;
    previewPending = true;
    window.requestAnimationFrame(function () {
      previewPending = false;
      drawPreview();
    });
  }

  function drawPreview() {
    var pctx = window.Studio && window.Studio.getPreviewCtx
      ? window.Studio.getPreviewCtx() : null;
    if (!pctx) return;

    var w = pctx.canvas.width;
    var h = pctx.canvas.height;
    pctx.clearRect(0, 0, w, h);

    var cx = w / 2;
    var cy = h / 2;
    var r = Math.min(w, h) * .43;

    // 木绷圈
    pctx.fillStyle = '#6B4A2E';
    pctx.beginPath();
    pctx.arc(cx, cy, r, 0, Math.PI * 2);
    pctx.fill();

    // 坯布
    pctx.fillStyle = '#F3EEDF';
    pctx.beginPath();
    pctx.arc(cx, cy, r * .93, 0, Math.PI * 2);
    pctx.fill();

    // 背扇轮廓（缩略）
    var scale = (r * .93 * 2) / 600;
    var ox = cx - 300 * scale;
    var oy = cy - 300 * scale;

    pctx.strokeStyle = 'rgba(107, 74, 46, .4)';
    pctx.lineWidth = Math.max(.8, 2 * scale);
    pctx.beginPath();
    pctx.ellipse(cx, cy, 126 * scale, 150 * scale, 0, 0, Math.PI * 2);
    pctx.stroke();

    // 已绣针迹
    pctx.lineCap = 'round';
    Array.prototype.forEach.call(layer.children, function (el) {
      var tag = el.tagName.toLowerCase();
      if (tag === 'line') {
        pctx.strokeStyle = el.getAttribute('stroke') || color;
        pctx.lineWidth = Math.max(1, parseFloat(el.getAttribute('stroke-width') || 2) * scale);
        pctx.beginPath();
        pctx.moveTo(ox + parseFloat(el.getAttribute('x1')) * scale,
                    oy + parseFloat(el.getAttribute('y1')) * scale);
        pctx.lineTo(ox + parseFloat(el.getAttribute('x2')) * scale,
                    oy + parseFloat(el.getAttribute('y2')) * scale);
        pctx.stroke();
      } else if (tag === 'circle') {
        pctx.fillStyle = el.getAttribute('fill') || color;
        pctx.beginPath();
        pctx.arc(ox + parseFloat(el.getAttribute('cx')) * scale,
                 oy + parseFloat(el.getAttribute('cy')) * scale,
                 Math.max(.6, parseFloat(el.getAttribute('r')) * scale),
                 0, Math.PI * 2);
        pctx.fill();
      }
    });
  }

  /* ======================================================================
     三、绣绷指针交互
     ====================================================================== */
  function handleMove(e) {
    if (!active) return;
    if (e.pointerType === 'touch' && e.buttons === 0) return;

    // 节流 30ms
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - lastTime < THROTTLE) return;
    lastTime = now;

    var p = toSvgCoord(e.clientX, e.clientY);
    addStitch(p.x, p.y);
  }

  function bindHoop() {
    if (!hoop) return;

    hoop.addEventListener('pointerenter', function () {
      active = true;
      hasLast = false;
      hideHint();
    });

    hoop.addEventListener('pointerleave', function () {
      active = false;
      hasLast = false;
    });

    hoop.addEventListener('pointerdown', function (e) {
      active = true;
      hasLast = false;
      if (hoop.setPointerCapture) {
        try { hoop.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      }
      handleMove(e);
    });

    hoop.addEventListener('pointermove', handleMove);

    hoop.addEventListener('pointerup', function (e) {
      hasLast = false;
      if (hoop.releasePointerCapture && e.pointerId !== undefined) {
        try { hoop.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      }
    });

    hoop.addEventListener('pointercancel', function () {
      active = false;
      hasLast = false;
    });
  }

  function hideHint() {
    if (hintEl) hintEl.classList.add('is-gone');
  }

  function showHint() {
    if (hintEl) hintEl.classList.remove('is-gone');
  }

  /* ======================================================================
     四、控件：针法 / 丝线颜色 / 清空
     ====================================================================== */
  function bindControls() {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-stitch]'),
      function (btn) {
        btn.addEventListener('click', function () {
          stitch = btn.getAttribute('data-stitch');
          Array.prototype.forEach.call(
            document.querySelectorAll('[data-stitch]'),
            function (b) {
              b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            }
          );
          hasLast = false;
        });
      }
    );

    Array.prototype.forEach.call(
      document.querySelectorAll('#threadSwatches [data-color]'),
      function (btn) {
        btn.addEventListener('click', function () {
          color = btn.getAttribute('data-color');
          Array.prototype.forEach.call(
            document.querySelectorAll('#threadSwatches [data-color]'),
            function (b) {
              b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            }
          );
        });
      }
    );

    if (btnClear) {
      btnClear.addEventListener('click', function () {
        while (layer.firstChild) layer.removeChild(layer.firstChild);
        count = 0;
        hasLast = false;
        updateCount();
        showHint();
        drawPreview();
      });
    }

    // 切到苗绣模式时接管预览框（蜡染那边会画素布，这里换成绣绷缩略）
    if (window.Studio) {
      window.Studio.on('studio:mode', function (e) {
        if (e.detail && e.detail.mode === 'embroidery') {
          window.setTimeout(drawPreview, 40);
          if (window.Studio.setPreviewLabel) window.Studio.setPreviewLabel('绣绷');
        }
      });
    }
  }

  /* ======================================================================
     五、针法演示小动画
     ====================================================================== */
  function buildDemo() {
    if (!demoEl) return;

    // 平绣：一排平行斜针，从右往左依次亮起
    var flatLines = '';
    for (var i = 0; i < 9; i++) {
      var x = 12 + i * 15;
      flatLines += '<line x1="' + (x) + '" y1="26" x2="' + (x + 9) + '" y2="8" ' +
        'style="--d:' + (i * 0.22).toFixed(2) + 's" />';
    }

    // 打籽绣：一串小籽，依序鼓起
    var seeds = '';
    for (var j = 0; j < 9; j++) {
      seeds += '<circle cx="' + (16 + j * 15) + '" cy="17" r="3.1" ' +
        'style="--d:' + (j * 0.22).toFixed(2) + 's" />';
    }

    demoEl.innerHTML =
      '<div class="stitch-demo__row">' +
        '<span class="stitch-demo__name">平绣</span>' +
        '<svg viewBox="0 0 152 34" preserveAspectRatio="xMinYMid meet" aria-hidden="true">' +
          '<rect class="demo-cloth" x="0" y="0" width="152" height="34" rx="3" />' +
          '<g class="demo-flat">' + flatLines + '</g>' +
        '</svg>' +
      '</div>' +
      '<div class="stitch-demo__row">' +
        '<span class="stitch-demo__name">打籽绣</span>' +
        '<svg viewBox="0 0 152 34" preserveAspectRatio="xMinYMid meet" aria-hidden="true">' +
          '<rect class="demo-cloth" x="0" y="0" width="152" height="34" rx="3" />' +
          '<g class="demo-seed">' + seeds + '</g>' +
        '</svg>' +
      '</div>';
  }

  /* ======================================================================
     六、启动
     ====================================================================== */
  function start() {
    hoop = document.getElementById('embroideryHoop');
    svg = document.getElementById('hoopSvg');
    layer = document.getElementById('stitchLayer');
    hintEl = document.getElementById('hoopHint');
    countEl = document.getElementById('stitchCount');
    demoEl = document.getElementById('stitchDemo');
    btnClear = document.getElementById('btnStitchClear');

    if (!hoop || !svg || !layer) return;

    bindHoop();
    bindControls();
    buildDemo();
    updateCount();
    fitHoop();

    window.addEventListener('resize', fitHoop);

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(fitHoop);
      ro.observe(hoop);
    }

    // 从蜡染切到苗绣时，容器刚从隐藏状态恢复，需要重新量一次
    if (window.Studio) {
      window.Studio.on('studio:mode', function (e) {
        if (e.detail && e.detail.mode === 'embroidery') {
          window.setTimeout(fitHoop, 40);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
