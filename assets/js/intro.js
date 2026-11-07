/* ==========================================================================
   银绣山河 · 03 板块「巧手成纹」——入口屏滚动联动
   --------------------------------------------------------------------------
   职责：
     1. 把 .intro 的滚动行程映射为进度 p ∈ [0,1]，写入 <html> 的 --exp-p
     2. 用 p 驱动 SVG 朱红丝线的 stroke-dashoffset（模拟针脚一点点游走）
     3. 用 getPointAtLength 让针尖实时贴住丝线末端，并按路径切向旋转
     4. 两个入口按钮点击后广播 exp:enter 事件，供蜡染 / 苗绣模块接管
   --------------------------------------------------------------------------
   性能约定：
     - scroll 用 passive 监听 + requestAnimationFrame 合帧，一帧只算一次
     - 不在 intro 区间内时不做几何计算
     - 只读不写布局属性（offsetHeight / getBoundingClientRect 各取一次）
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  var intro = document.getElementById('intro');
  var thread = document.getElementById('threadPath');
  var needle = document.getElementById('threadNeedle');

  var pathLen = 0;
  var ticking = false;

  /* ---------- 丝线初始化 ---------- */
  function initThread() {
    if (!thread) return false;
    pathLen = thread.getTotalLength();
    if (!pathLen) return false;
    thread.style.strokeDasharray = pathLen + ' ' + pathLen;
    thread.style.strokeDashoffset = String(pathLen);
    return true;
  }

  /* ---------- 针的视口补偿 ----------
     针是随布面等比缩放的，窄屏布面小了针会缩成一粒。
     这里按视口给一个放大系数，缩放原点正好是针尖（0,0），不影响贴合 */
  function needleScale() {
    return window.innerWidth <= 860 ? 2.2 : 1;
  }

  /* ---------- 把针移到丝线 length = l 处 ---------- */
  function placeNeedle(l) {
    if (!needle || !pathLen) return;

    var l1 = Math.max(0, Math.min(pathLen, l));
    var l0 = Math.max(0, l1 - 8);
    var p1 = thread.getPointAtLength(l1);
    var p0 = thread.getPointAtLength(l0);

    // 路径切向角（度）。针身默认朝上（-y），转到切向反方向需减 90°
    var deg = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;

    needle.setAttribute(
      'transform',
      'translate(' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2) + ') rotate(' +
        (deg - 90).toFixed(1) + ') scale(' + needleScale() + ')'
    );
  }

  /* ---------- 进度 → 视觉 ---------- */
  function render(p) {
    root.style.setProperty('--exp-p', p.toFixed(4));
    if (!pathLen || !thread) return;
    thread.style.strokeDashoffset = (pathLen * (1 - p)).toFixed(2);
    placeNeedle(pathLen * p);
  }

  /* ---------- 读取滚动位置并换算进度 ---------- */
  function measure() {
    ticking = false;
    if (!intro) return;

    var travel = intro.offsetHeight - window.innerHeight;
    if (travel <= 0) {
      render(0);
      return;
    }

    var passed = -intro.getBoundingClientRect().top;
    var p = passed / travel;
    render(p < 0 ? 0 : p > 1 ? 1 : p);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(measure);
  }

  /* ---------- 入口按钮：广播模式，交给后续模块处理 ---------- */
  function initEnter() {
    var links = document.querySelectorAll('[data-enter]');
    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener('click', function () {
        var mode = link.getAttribute('data-enter');
        try {
          document.dispatchEvent(new CustomEvent('exp:enter', { detail: { mode: mode } }));
        } catch (err) {
          /* CustomEvent 不可用时静默降级，锚点跳转本身仍然有效 */
        }
      });
    });
  }

  /* ---------- 启动 ---------- */
  function start() {
    initEnter();
    if (!intro) return;

    if (reduceMotion) {
      // 减少动效：丝线一次画完，不做滚动联动
      render(1);
      return;
    }

    initThread();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    measure();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
