/* ==========================================================================
   银绣山河 · 03 板块「巧手成纹」——入口屏交互
   --------------------------------------------------------------------------
   入口屏是左右分屏的两块门户（数字蜡染 / 数字苗绣），没有滚动联动。
   本文件只做三件事：
     1. 点击门户时广播 exp:enter（studio.js 接住自动切到对应模式）
     2. 平滑滚到工作台，并让出粘性顶栏的高度
     3. 尊重 prefers-reduced-motion：不做平滑滚动
   --------------------------------------------------------------------------
   降级约定：
     - portal 本身是 href="#workbench" 的锚点链接，脚本没跑起来也能跳过去
     - CustomEvent 不可用时静默跳过，不影响锚点跳转
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  var workbench = document.getElementById('workbench');

  /* ---------- 进工作台：先广播模式，再滚动 ---------- */
  function enter(mode) {
    try {
      document.dispatchEvent(new CustomEvent('exp:enter', { detail: { mode: mode } }));
    } catch (err) {
      /* CustomEvent 不可用：锚点跳转本身仍然有效 */
    }

    if (!workbench) return;

    if (workbench.scrollIntoView) {
      workbench.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    } else {
      window.location.hash = '#workbench';
    }
  }

  /* ---------- 绑定两块门户 ---------- */
  function init() {
    var links = document.querySelectorAll('[data-enter]');

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener('click', function (ev) {
        // 自己接管滚动，避免浏览器瞬时跳到锚点
        ev.preventDefault();

        enter(link.getAttribute('data-enter'));

        // 地址栏留一个可分享 / 可回退的锚点，但不触发二次滚动
        try {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '#workbench');
          }
        } catch (err) {
          /* file:// 协议下 replaceState 可能被拒，忽略即可 */
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
