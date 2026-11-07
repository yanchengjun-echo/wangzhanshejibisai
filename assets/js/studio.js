/* ==========================================================================
   银绣山河 · 03 板块「巧手成纹」——工作台公共层
   --------------------------------------------------------------------------
   职责：
     1. 蜡染 / 苗绣两条线段的模式切换（面板、画布、按钮态一起切）
     2. 右栏「实时预览」缩略画布的上下文与尺寸
     3. 入口屏 exp:enter 事件 → 自动切到对应模式
   --------------------------------------------------------------------------
   对外接口（其他模块只依赖这一层，互相不直接引用）：
     Studio.getMode()           当前模式 'dye' | 'embroidery'
     Studio.setMode(mode)
     Studio.on(evt, fn)         监听 studio:mode / exp:enter
     Studio.emit(evt, detail)
     Studio.getPreviewCtx()     预览画布 2D 上下文（不存在时为 null）
     Studio.setPreviewLabel(t)
     Studio.setPreviewVisible(v)
   ========================================================================== */
(function () {
  'use strict';

  var mode = 'dye';
  var previewCanvas = null;
  var previewCtx = null;
  var previewLabel = null;

  function qsa(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function emit(evt, detail) {
    try {
      document.dispatchEvent(new CustomEvent(evt, { detail: detail }));
    } catch (err) {
      /* 老浏览器不支持 CustomEvent 时静默降级 */
    }
  }

  /* ---------- 模式切换 ---------- */
  function setMode(next) {
    if (!next || next === mode) return;
    mode = next;

    qsa('[data-mode]').forEach(function (btn) {
      btn.setAttribute('aria-pressed',
        btn.getAttribute('data-mode') === next ? 'true' : 'false');
    });

    qsa('[data-panel]').forEach(function (el) {
      if (el.getAttribute('data-panel') === next) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
    });

    qsa('[data-canvas]').forEach(function (el) {
      if (el.getAttribute('data-canvas') === next) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
    });

    emit('studio:mode', { mode: next });
  }

  /* ---------- 预览画布 ---------- */
  function initPreview() {
    previewCanvas = document.getElementById('previewCanvas');
    previewLabel = document.getElementById('previewLabel');
    if (!previewCanvas) return;

    // 固定内部分辨率，CSS 撑满预览框，避免每次 resize 重建
    previewCanvas.width = 280;
    previewCanvas.height = 280;
    previewCtx = previewCanvas.getContext('2d');
  }

  function getPreviewCtx() {
    return previewCtx;
  }

  function setPreviewLabel(text) {
    if (previewLabel) previewLabel.textContent = text;
  }

  function setPreviewVisible(visible) {
    if (previewCanvas) previewCanvas.style.opacity = visible === false ? '0' : '1';
  }

  /* ---------- 启动 ---------- */
  function start() {
    initPreview();

    qsa('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-mode'));
      });
    });

    // 入口屏的两个按钮广播 exp:enter，这里接住自动切模式
    document.addEventListener('exp:enter', function (e) {
      var m = e.detail && e.detail.mode;
      if (m === 'dye' || m === 'embroidery') {
        // 允许重复点击同一模式（保证从入口进来一定落在正确面板）
        mode = null;
        setMode(m);
      }
    });
  }

  window.Studio = {
    getMode: function () { return mode; },
    setMode: setMode,
    on: function (evt, fn) { document.addEventListener(evt, fn); },
    emit: emit,
    getPreviewCtx: getPreviewCtx,
    setPreviewLabel: setPreviewLabel,
    setPreviewVisible: setPreviewVisible
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
