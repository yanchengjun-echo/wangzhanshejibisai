/* ==========================================================================
   银绣山河 · 全站统一交互动效（渐进增强）
   职责：
     1. 扫描带 [data-reveal] 的元素，加 .reveal 初始态
     2. IntersectionObserver 进入视口后加 .is-visible 触发淡入上移
     3. 卡片 hover 抬升 / 图片缩放由 CSS（.anim-card/.anim-img）承担，此处无需处理
   原则：
     - 无 JS 或 observer 失效时，元素保持可见（2.5s 兜底强制显示）
     - 尊重 prefers-reduced-motion
   ========================================================================== */
(function () {
  "use strict";

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return; // 减少动效：什么都不做，元素保持默认可见
  }

  var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  // 给带 data-reveal 的元素打上初始隐藏态（带渐显类型）
  targets.forEach(function (el) {
    var type = el.getAttribute("data-reveal") || "";
    if (type === "fade") {
      el.classList.add("reveal--fade");
    } else {
      el.classList.add("reveal");
    }
  });

  if (!targets.length) { return; }

  if (!("IntersectionObserver" in window)) {
    targets.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });

  targets.forEach(function (el) { observer.observe(el); });

  // 兜底：observer 因任何原因未触发时，2.5s 后强制显示，保证内容完整可见
  window.setTimeout(function () {
    targets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }, 2500);
})();
