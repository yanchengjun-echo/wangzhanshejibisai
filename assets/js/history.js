/* ==========================================================================
   枫启长歌 — 交互脚本
   职责：
   1. 时间轴：滚轮上下 = 内容左右（仅指针在时间轴内生效），右侧箭头提示
   2. 节点：悬停 / 键盘聚焦时展开枫叶卡片，内容取自节点数据
   3. 检索：按节点名称与年代过滤，覆盖输入 / 有结果 / 无结果三种状态
   4. 未制作的页面：给出简短提示，不留无响应的控件
   所有内容均来自 HTML 里的节点数据，本文件不写死任何史实文案。
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var tlScroll = document.getElementById('tlScroll');
  var tlArrow = document.getElementById('tlArrow');
  var nodes = Array.prototype.slice.call(document.querySelectorAll('.node'));
  var maple = document.getElementById('maple');
  var cardLayer = document.getElementById('cardLayer');
  var mKicker = document.getElementById('mKicker');
  var mTitle = document.getElementById('mTitle');
  var mDesc = document.getElementById('mDesc');
  var mKw = document.getElementById('mKw');
  var toastEl = document.getElementById('toast');
  var pinForm = document.getElementById('pinSearch');
  var pinInput = document.getElementById('pinInput');
  var searchStatus = document.getElementById('searchStatus');

  /* ---------------------------------------------------------------------
     轻提示
     --------------------------------------------------------------------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.setAttribute('data-show', '1');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.removeAttribute('data-show');
    }, 2600);
  }

  /* ---------------------------------------------------------------------
     1. 时间轴滚轮横向浏览
     --------------------------------------------------------------------- */
  function maxScroll() {
    return Math.max(0, tlScroll.scrollWidth - tlScroll.clientWidth);
  }

  function syncArrow() {
    if (!tlArrow) return;
    tlArrow.setAttribute('data-done', tlScroll.scrollLeft >= maxScroll() - 2 ? '1' : '0');
  }

  if (tlScroll) {
    // 只有指针位于时间轴区域时才拦截滚轮；页面本身仍然可以正常上下滚动
    tlScroll.addEventListener('wheel', function (e) {
      if (maxScroll() <= 0) return;
      // 触控板的横向手势交给浏览器原生处理
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      var before = tlScroll.scrollLeft;
      var next = before + e.deltaY;
      tlScroll.scrollLeft = next;

      // 已经滚到头，就把滚动权交回页面
      if (tlScroll.scrollLeft !== before) {
        e.preventDefault();
        syncArrow();
      }
    }, { passive: false });

    tlScroll.addEventListener('scroll', function () {
      syncArrow();
      if (openNode) positionCard(openNode);
    }, { passive: true });

    // 方向键 / Home / End 也能驱动横向浏览
    tlScroll.addEventListener('keydown', function (e) {
      var step = tlScroll.clientWidth * 0.7;
      if (e.key === 'ArrowRight') { tlScroll.scrollBy({ left: step, behavior: reduceMotion ? 'auto' : 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { tlScroll.scrollBy({ left: -step, behavior: reduceMotion ? 'auto' : 'smooth' }); e.preventDefault(); }
      if (e.key === 'Home') { tlScroll.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); e.preventDefault(); }
      if (e.key === 'End') { tlScroll.scrollTo({ left: maxScroll(), behavior: reduceMotion ? 'auto' : 'smooth' }); e.preventDefault(); }
    });
  }

  if (tlArrow) {
    tlArrow.addEventListener('click', function () {
      tlScroll.scrollBy({
        left: tlScroll.clientWidth * 0.7,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    });
  }

  /* ---------------------------------------------------------------------
     2. 枫叶卡片
     --------------------------------------------------------------------- */
  var openNode = null;
  var closeTimer = null;

  function readData(node) {
    var btn = node.querySelector('.node-btn');
    var nm = btn.querySelector('.nm');
    var era = btn.querySelector('.era');
    return {
      line: node.getAttribute('data-line') === 'legend' ? '传说线' : '信史线',
      name: (nm && nm.textContent.trim()) || '事件名称待补',
      era: (era && era.textContent.trim()) || '年代待补',
      summary: node.getAttribute('data-summary') || '',
      keywords: (node.getAttribute('data-keywords') || '').split(/[、,，]/).filter(Boolean),
      href: node.getAttribute('data-href') || '',
      empty: node.classList.contains('is-empty')
    };
  }

  function fillCard(node) {
    var d = readData(node);
    var index = Array.prototype.indexOf.call(node.parentNode.children, node) + 1;

    mKicker.textContent = d.line + ' · 第 ' + index + ' 节';
    mTitle.textContent = d.empty ? '事件名称待补' : d.name;

    if (d.empty) {
      // 占位态给出填写指引，读起来是提示而不是正文
      mDesc.textContent = '此处填写：事件名称、起止年代、起因经过结果、对后世的影响。';
      maple.setAttribute('data-empty', '1');
    } else {
      mDesc.textContent = d.summary || (d.era + '　' + d.name);
      maple.removeAttribute('data-empty');
    }

    mKw.innerHTML = '';
    var kws = d.keywords.length ? d.keywords : ['人物', '非遗', '习俗'];
    kws.forEach(function (k) {
      var li = document.createElement('li');
      li.textContent = k;
      mKw.appendChild(li);
    });

    document.getElementById('mLink').textContent = d.href ? '查看详情 →' : '详情页待制作 →';
  }

  function cardSize() {
    // 先显示出来再量，否则拿到的是 0
    return { w: maple.offsetWidth, h: maple.offsetHeight };
  }

  function positionCard(node) {
    var r = node.getBoundingClientRect();
    var size = cardSize();
    var gap = 18;
    var isLegend = node.getAttribute('data-line') === 'legend';
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // 页头（标题 + 标语）底部，卡片不许盖到它
    var head = document.querySelector('.head');
    var safeTop = head ? head.getBoundingClientRect().bottom + 6 : 12;

    // 默认：传说线卡片向上、信史线向下
    var above = isLegend;
    var top = above ? r.top - size.h - gap : r.bottom + gap;

    // 上方放不下（会压到标题）就翻到节点下方；下方也放不下就翻回上方
    if (above && top < safeTop) {
      var belowTop = r.bottom + gap;
      if (belowTop + size.h < vh - 10) {
        top = belowTop;
      } else {
        top = Math.max(safeTop, r.top - size.h - gap);
      }
    } else if (!above && top + size.h > vh - 10) {
      top = r.top - size.h - gap;
    }

    var left = r.left + r.width / 2 - size.w / 2;
    left = Math.max(10, Math.min(left, vw - size.w - 10));
    top = Math.max(safeTop, Math.min(top, vh - size.h - 10));

    maple.style.left = Math.round(left) + 'px';
    maple.style.top = Math.round(top) + 'px';
  }

  function openCard(node) {
    window.clearTimeout(closeTimer);
    if (openNode && openNode !== node) openNode.classList.remove('is-active');

    openNode = node;
    node.classList.add('is-active');
    fillCard(node);
    positionCard(node);
    maple.setAttribute('data-open', '1');
  }

  function closeCard() {
    if (openNode) openNode.classList.remove('is-active');
    openNode = null;
    maple.setAttribute('data-open', '0');
  }

  function scheduleClose() {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(closeCard, 180);
  }

  nodes.forEach(function (node) {
    var btn = node.querySelector('.node-btn');

    node.addEventListener('mouseenter', function () { openCard(node); });
    node.addEventListener('mouseleave', scheduleClose);

    // 键盘聚焦同样能展开卡片
    btn.addEventListener('focus', function () { openCard(node); });
    btn.addEventListener('blur', function () { scheduleClose(); });

    // 回车 = 打开详情；详情页未制作时给出提示而不是无响应
    btn.addEventListener('click', function () {
      var d = readData(node);
      if (d.href) {
        window.location.href = d.href;
      } else {
        toast('「' + (d.empty ? '该节点' : d.name) + '」详情页尚未制作，等待内容补充');
      }
    });
  });

  if (maple) {
    maple.addEventListener('mouseenter', function () { window.clearTimeout(closeTimer); });
    maple.addEventListener('mouseleave', scheduleClose);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openNode) closeCard();
  });

  window.addEventListener('resize', function () {
    if (openNode) positionCard(openNode);
    syncArrow();
  });

  /* ---------------------------------------------------------------------
     3. 检索
     --------------------------------------------------------------------- */
  function runSearch(query) {
    var q = query.trim().toLowerCase();

    if (!q) {
      nodes.forEach(function (n) { n.classList.remove('is-hidden'); });
      searchStatus.textContent = '';
      searchStatus.removeAttribute('data-tone');
      closeCard();
      return;
    }

    var hits = 0;
    nodes.forEach(function (node) {
      var btn = node.querySelector('.node-btn');
      var text = btn.textContent.toLowerCase() + ' ' +
                 (node.getAttribute('data-keywords') || '').toLowerCase() + ' ' +
                 (node.getAttribute('data-summary') || '').toLowerCase();
      var hit = text.indexOf(q) !== -1;
      node.classList.toggle('is-hidden', !hit);
      if (hit) hits++;
    });

    if (hits > 0) {
      searchStatus.textContent = '检索「' + query.trim() + '」· 命中 ' + hits + ' 个节点';
      searchStatus.removeAttribute('data-tone');
    } else {
      searchStatus.textContent = '暂未匹配到「' + query.trim() + '」· 内容尚在补充，可先沿时间轴浏览';
      searchStatus.setAttribute('data-tone', 'none');
    }
    syncArrow();
  }

  if (pinForm) {
    pinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      runSearch(pinInput.value);
    });
    pinInput.addEventListener('input', function () {
      // 输入即筛选；清空时恢复全部节点
      if (pinInput.value === '') runSearch('');
    });
    pinInput.addEventListener('search', function () { runSearch(pinInput.value); });
  }

  /* ---------------------------------------------------------------------
     4. 未制作页面 / 目录的占位响应
     --------------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-todo]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      toast('「' + el.getAttribute('data-todo') + '」页面尚未制作，将在内容补齐后开放');
    });
  });

  // 首屏同步一次箭头状态
  syncArrow();
})();
