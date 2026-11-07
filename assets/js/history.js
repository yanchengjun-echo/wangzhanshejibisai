/* ==========================================================================
   银绣山河 — 枫启长歌页交互
   1) 谱系节点：12 个点严格落在手绘草图的点位上，细线连接，文字挂在点旁
   2) 点击条目：详情以浮层挂在该点卡片下方（底部三点向上弹），不撑开点阵
   3) 当前节点标记：朱红竖线跟着"你点开的那一节"，全页唯一一处刺绣色
   4) 深链：#node-xxx 直达并自动展开，URL 跟着"打开的那个节点"走
   5) 点阵随页面自然向下滚动，节点卡片随页面滚动依次渐显

   原则：
   · 脚本不承重。折叠由 html.js-tree 控制，类不加就是全展开的静态页；
     2.5 秒内本文件没执行，head 里的兜底会把 js-tree 撤掉。
   · 单开（手风琴）：同时只展开一个节点，视觉焦点唯一。
   · 点标题文字（.tnode__toggle 按钮）即可展开，无加减号图标；点位的金/银小圆由 CSS 绘制，不参与交互。
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  window.__treeReady = true;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motionOK = !reduceMotion.matches;

  var nodes = Array.prototype.slice.call(document.querySelectorAll('.tnode'));
  if (!nodes.length) return;

  if (!root.classList.contains('js-tree')) root.classList.add('js-tree');
  if (motionOK) root.classList.add('js-anim');

  /* ---------- 节点开关 ---------- */
  var items = nodes.map(function (li) {
    return {
      li: li,
      btn: li.querySelector('.tnode__toggle'),
      body: li.querySelector('.tnode__body'),
      isMyth: li.classList.contains('tnode--myth')
    };
  }).filter(function (it) { return it.btn && it.body; });

  function setOpen(item, open) {
    open = !!open;
    if (open === item.li.classList.contains('is-open')) return;
    item.li.classList.toggle('is-open', open);
    item.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setHash(id) {
    try {
      var url = window.location.pathname + window.location.search + (id ? '#' + id : '');
      window.history.replaceState(null, '', url);
    } catch (e) {
      /* file:// 下部分浏览器禁止 replaceState，深链降级为不可分享，不影响阅读 */
    }
  }

  items.forEach(function (item) {
    item.btn.addEventListener('click', function () {
      var willOpen = !item.li.classList.contains('is-open');
      items.forEach(function (other) {
        if (other !== item) setOpen(other, false);
      });
      setOpen(item, willOpen);
      if (willOpen) {
        mark(item.li);
        lastOpened = item.btn;
        setHash(item.li.id);
      } else {
        mark(null);
        setHash('');
      }
    });
  });

  /* Esc 收回全部，焦点还给最后打开的那个开关 */
  var lastOpened = null;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var any = false;
    items.forEach(function (it) {
      if (it.li.classList.contains('is-open')) { setOpen(it, false); any = true; }
    });
    if (any) {
      mark(null);
      setHash('');
      if (lastOpened) lastOpened.focus();
    }
  });

  /* ---------- 当前节点：你点开在读的那一节 ---------- */
  var current = null;

  function mark(el) {
    if (el === current) return;
    if (current) current.classList.remove('is-current');
    current = el;
    if (el) el.classList.add('is-current');
  }

  /* ---------- 卡片渐显：随页面滚动 ---------- */
  var raf = 0;

  function frame() {
    raf = 0;
    var vh = window.innerHeight;
    var revealLine = vh * 0.92;

    for (var i = 0; i < nodes.length; i++) {
      var card = nodes[i].querySelector('.tnode__card');
      if (!card) continue;
      var top = card.getBoundingClientRect().top;
      if (top < revealLine && !nodes[i].classList.contains('is-in')) {
        nodes[i].classList.add('is-in');
      }
    }
  }

  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });

  /* ---------- 首屏与深链 ---------- */
  var hash = window.location.hash.slice(1);
  var target = hash ? document.getElementById(hash) : null;
  var deep = null;

  if (target) {
    items.forEach(function (it) { if (it.li === target) deep = it; });
  }

  if (deep) {
    setOpen(deep, true);
    mark(deep.li);
    lastOpened = deep.btn;
    window.setTimeout(function () {
      /* 点阵是一整张构图：深链不再把单个点拉到视口顶端（那会推出大片空白），
         而是滚到画布上缘，让读者先看见整张点线关系，再看展开的浮层。 */
      var stage = document.getElementById('tree-stage');
      if (stage) {
        var y = stage.getBoundingClientRect().top + window.pageYOffset - 24;
        if (motionOK) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        else window.scrollTo(0, Math.max(0, y));
      }
      frame();
    }, 120);
  } else {
    frame();
  }

  /* 用户中途把系统动效关掉时，别把内容锁在隐藏态 */
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function (evt) {
      if (evt.matches) {
        root.classList.remove('js-anim');
        nodes.forEach(function (n) { n.classList.add('is-in'); });
      }
    });
  }
})();
