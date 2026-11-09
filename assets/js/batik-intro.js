/* ==========================================================================
   银绣山河 · 蜡染介绍区交互动效
   1) 滚动渐显：给章节内的标题/卡片/图自动加 data-animate，进入视口后
      加 .is-visible 触发淡入上移（渐进增强：无 JS 时元素保持可见）
   2) 时间轴逐项交错入场
   ========================================================================== */
(function () {
  "use strict";

  var section = document.querySelector(".bi");
  if (!section) return;

  // 尊重用户减少动效偏好
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  // 给目标元素打标记（CSS 里 [data-animate] 初始 opacity:0，JS 未跑则样式也未被
  // 打到这些元素上，因为标记是 JS 加的 —— 保证无 JS 页面完整可见）
  var targets = [];
  var i;

  // 章节标题块 + 两栏/网格/画廊/案例容器 + 卡片 + 图
  var selectors = [
    ".bi-hero__eyebrow", ".bi-hero__title", ".bi-hero__subtitle",
    ".bi-hero__def", ".bi-hero__badges", ".bi-hero__fig",
    ".bi-section__eyebrow", ".bi-section__title", ".bi-section__lead",
    ".bi-two-col > *", ".bi-origin-grid > *", ".bi-steps-grid > *",
    ".bi-motif-grid > *", ".bi-gallery > *", ".bi-case-grid > *",
    ".bi-supplement", ".bi-cta > *"
  ];
  selectors.forEach(function (sel) {
    var els = section.querySelectorAll(sel);
    for (i = 0; i < els.length; i++) {
      // 跳过已包含在其他目标里的子元素（如 bi-two-col 内的图已单独标记则略过重复）
      if (els[i].dataset.animate !== undefined) continue;
      els[i].dataset.animate = "";
      targets.push(els[i]);
    }
  });

  // 时间轴：逐项交错
  var timelineItems = section.querySelectorAll(".bi-timeline__item");
  for (i = 0; i < timelineItems.length; i++) {
    if (timelineItems[i].dataset.animate !== undefined) continue;
    timelineItems[i].dataset.animate = "";
    timelineItems[i].style.transitionDelay = (i * 60) + "ms";
    targets.push(timelineItems[i]);
  }

  var reveal = function (el) { el.classList.add("is-visible"); };

  if (!("IntersectionObserver" in window)) {
    targets.forEach(reveal);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  targets.forEach(function (el) { observer.observe(el); });

  // 兜底：任何情况下（observer 未触发 / 异常），2.5s 后强制全部显示，
  // 保证「动画失败页面仍完整可见」
  setTimeout(function () {
    targets.forEach(function (el) {
      if (!el.classList.contains("is-visible")) reveal(el);
    });
  }, 2500);
})();
