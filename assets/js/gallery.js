/* 银绣珍藏 · 线上展馆（02 板块）交互脚本
   数据源：assets/js/museum-data.js（window.MUSEUM）
   功能：分类索引 + 藏品网格渲染 + 详情浮层 + 键盘无障碍 */
(function () {
  'use strict';

  var M = window.MUSEUM;
  if (!M || !M.items || !M.items.length) {
    var g = document.getElementById('grid');
    if (g) g.innerHTML = '<div class="empty">藏品数据加载失败，请检查 museum-data.js</div>';
    return;
  }

  var items = M.items;
  var cats = M.categories;

  var catList = document.getElementById('catList');
  var grid = document.getElementById('grid');
  var curCat = document.getElementById('curCat');
  var curCount = document.getElementById('curCount');

  var modalLayer = document.getElementById('modalLayer');
  var modalImg = document.getElementById('modalImg');
  var modalTitle = document.getElementById('modalTitle');
  var modalCat = document.getElementById('modalCat');
  var modalDesc = document.getElementById('modalDesc');

  var activeCat = '全部'; // 当前选中分类

  /* ---------- 分类索引 ---------- */
  function renderCats() {
    // 「全部」+ 各分类
    var all = ['全部'].concat(cats);
    var html = '';
    all.forEach(function (c) {
      var n = c === '全部' ? items.length : countBy(c);
      var cur = c === activeCat ? ' aria-current="true"' : '';
      html += '<button class="cat-btn" type="button" data-cat="' + c + '"' + cur + '>' +
              c + '<span class="cnt">' + n + '</span></button>';
    });
    catList.innerHTML = html;
  }

  function countBy(cat) {
    var n = 0;
    items.forEach(function (it) { if (it.cat === cat) n++; });
    return n;
  }

  /* ---------- 藏品网格 ---------- */
  // Fisher-Yates 洗牌：打散类别，避免同类别连续扎堆
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // 图片懒加载：改用 data-src + IntersectionObserver，替代原生 loading="lazy"。
  // 原因：CSS column-count 多列布局会重排元素，原生 lazy 的「视口判定」与实际
  // 视觉位置错位，导致大量图片不触发加载、只剩文字（.thumb 高度塌缩为 0）。
  var io = null;
  function initLazyObserver() {
    if (!('IntersectionObserver' in window)) {
      // 兜底：不支持 IntersectionObserver 时直接全量加载
      var imgs = grid.querySelectorAll('img[data-src]');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].src = imgs[i].getAttribute('data-src');
        imgs[i].removeAttribute('data-src');
      }
      return;
    }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
          img.classList.add('loaded');
          io.unobserve(img);
        }
      });
    }, {
      rootMargin: '200px 0px', // 提前 200px 预加载，滚动时无感知
      threshold: 0.01
    });
    var imgs = grid.querySelectorAll('img[data-src]');
    for (var j = 0; j < imgs.length; j++) {
      io.observe(imgs[j]);
    }
  }

  function cardHTML(it, isFeature) {
    var author = it.author ? '<span class="author">· ' + it.author + '</span>' : '';
    var cls = 'card' + (isFeature ? ' card--feature' : '') + ' anim-card';
    // 普通卡片用 data-src 延迟加载
    var imgTag = '<img data-src="' + it.small + '" alt="' + it.name + '" decoding="async">';
    return '<article class="' + cls + '" tabindex="0" role="button" ' +
        'data-reveal ' +
        'data-id="' + it.id + '" ' +
        'aria-label="查看藏品：' + it.name + '">' +
        '<div class="thumb">' + imgTag + '</div>' +
        '<div class="meta">' +
          '<span class="nm">' + it.name + '</span>' +
          '<span class="cat-tag">' + it.cat + author + '</span>' +
        '</div>' +
      '</article>';
  }

  /* ---------- 精选轮播 ---------- */
  // 生成轮播 DOM：图片轨道 + 文字介绍 + 左右箭头 + 指示点 + 进度条
  function carouselHTML(list) {
    var slides = '';
    var dots = '';
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var author = it.author ? ' · ' + it.author : '';
      var desc = it.desc || '（暂无文字介绍，图片待后续完善）';
      slides +=
        '<div class="caro-slide" data-id="' + it.id + '" role="group" aria-label="第 ' + (i + 1) + ' 件，共 ' + list.length + ' 件">' +
          '<div class="caro-img"><img src="' + it.big + '" alt="' + it.name + '" decoding="async"></div>' +
          '<div class="caro-info">' +
            '<span class="caro-cat">' + it.cat + author + '</span>' +
            '<h3 class="caro-name">' + it.name + '</h3>' +
            '<p class="caro-desc">' + desc + '</p>' +
            '<button class="caro-more" type="button" data-id="' + it.id + '">查看详情</button>' +
          '</div>' +
        '</div>';
      dots += '<button class="caro-dot" type="button" data-index="' + i + '" aria-label="切换到第 ' + (i + 1) + ' 件展品"></button>';
    }

    var arrows = list.length > 1
      ? '<button class="caro-arrow caro-prev" type="button" aria-label="上一件展品">‹</button>' +
        '<button class="caro-arrow caro-next" type="button" aria-label="下一件展品">›</button>'
      : '';

    return '<section class="carousel" data-reveal aria-roledescription="carousel" aria-label="精选展品轮播">' +
        '<div class="caro-track">' + slides + '</div>' +
        arrows +
        '<div class="caro-dots">' + dots + '</div>' +
        '<div class="caro-progress" aria-hidden="true"><span></span></div>' +
      '</section>';
  }

  /* 轮播状态 */
  var caroTimer = null;
  var caroIndex = 0;
  var caroCount = 0;
  var caroEl = null;
  var caroTrack = null;
  var caroDots = null;
  var caroProgressBar = null;
  var CARO_INTERVAL = 5000; // 自动切换间隔（毫秒）
  var caroPaused = false;

  function initCarousel(list) {
    stopCarousel();
    caroEl = grid.querySelector('.carousel');
    if (!caroEl) return;
    caroTrack = caroEl.querySelector('.caro-track');
    caroDots = caroEl.querySelector('.caro-dots');
    caroProgressBar = caroEl.querySelector('.caro-progress span');
    caroIndex = 0;
    caroCount = list.length;
    caroPaused = false;

    goTo(0, true);
    // 尊重「减少动态效果」偏好：不自动播放，仅手动切换
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) startCarousel();
  }

  function goTo(idx, instant) {
    if (!caroEl || !caroTrack) return;
    if (idx < 0) idx = caroCount - 1;
    if (idx >= caroCount) idx = 0;
    caroIndex = idx;

    // 位移轨道
    if (instant) {
      caroTrack.classList.add('no-anim');
    } else {
      caroTrack.classList.remove('no-anim');
    }
    caroTrack.style.transform = 'translateX(' + (-100 * caroIndex) + '%)';

    // 指示点
    var dots = caroDots ? caroDots.children : null;
    if (dots) {
      for (var i = 0; i < dots.length; i++) {
        if (i === caroIndex) dots[i].classList.add('is-active');
        else dots[i].classList.remove('is-active');
      }
    }

    // 进度条重置
    if (caroProgressBar) {
      caroProgressBar.style.transition = 'none';
      caroProgressBar.style.transform = 'scaleX(0)';
    }
  }

  function startCarousel() {
    // 注意：这里不能调 stopCarousel()——那会把刚初始化好的 caroEl/caroTrack
    // 等引用清成 null，导致后续点击箭头时 goTo 提前 return、切换失效。
    clearInterval(caroTimer);
    caroTimer = null;
    caroPaused = false;
    restartTimer();
    restartProgress();
  }

  function restartTimer() {
    clearInterval(caroTimer);
    caroTimer = setInterval(function () {
      if (caroPaused || !caroEl) return;
      goTo(caroIndex + 1, false);
      restartProgress();
    }, CARO_INTERVAL);
  }

  function restartProgress() {
    if (!caroProgressBar) return;
    // 先复位到 0 再过渡到满，形成「倒计时」进度条
    caroProgressBar.style.transition = 'none';
    caroProgressBar.style.transform = 'scaleX(0)';
    // 强制重排，确保复位生效后再开始过渡
    void caroProgressBar.offsetWidth;
    caroProgressBar.style.transition = 'transform ' + CARO_INTERVAL + 'ms linear';
    caroProgressBar.style.transform = 'scaleX(1)';
  }

  function stopCarousel() {
    clearInterval(caroTimer);
    caroTimer = null;
    caroEl = null;
    caroTrack = null;
    caroDots = null;
    caroProgressBar = null;
  }

  function pauseCarousel() {
    caroPaused = true;
  }
  function resumeCarousel() {
    if (!caroEl) return;
    caroPaused = false;
    restartTimer();
    restartProgress();
  }

  function bindCarouselEvents() {
    // 复用 grid 的事件委托：箭头 / 指示点 / 「查看详情」按钮
    grid.addEventListener('click', function (e) {
      var arrow = e.target.closest('.caro-arrow');
      if (arrow) {
        var dir = arrow.classList.contains('caro-next') ? 1 : -1;
        goTo(caroIndex + dir, false);
        restartProgress();
        return;
      }
      var dot = e.target.closest('.caro-dot');
      if (dot) {
        goTo(parseInt(dot.getAttribute('data-index'), 10), false);
        restartProgress();
        return;
      }
      var more = e.target.closest('.caro-more');
      if (more) {
        openModal(more.getAttribute('data-id'));
        return;
      }
    });

    // 悬停 / 聚焦暂停，移出恢复（事件委托到 grid，避免切分类后失效）
    grid.addEventListener('mouseover', function (e) {
      if (e.target.closest('.carousel')) pauseCarousel();
    });
    grid.addEventListener('mouseout', function (e) {
      if (e.target.closest('.carousel') && !e.relatedTarget.closest('.carousel')) resumeCarousel();
    });
    grid.addEventListener('focusin', function (e) {
      if (e.target.closest('.carousel')) pauseCarousel();
    });
    grid.addEventListener('focusout', function (e) {
      if (e.target.closest('.carousel') && !e.relatedTarget.closest('.carousel')) resumeCarousel();
    });
  }

  function renderGrid() {
    var list = activeCat === '全部' ? items : items.filter(function (it) { return it.cat === activeCat; });
    curCat.textContent = activeCat;
    curCount.textContent = '共 ' + list.length + ' 件';

    if (!list.length) {
      grid.innerHTML = '<div class="empty">该分类暂无藏品</div>';
      stopCarousel();
      return;
    }

    // 「全部」视图下打散类别；单个分类视图保持原顺序（本就同类）
    var ordered = activeCat === '全部' ? shuffle(list) : list;

    // 轮播取前 N 件「有完整大图 + 介绍」的展品；不足则用列表里的凑数
    var CAROUSEL_MAX = 6;
    var carouselItems = [];
    for (var i = 0; i < ordered.length && carouselItems.length < CAROUSEL_MAX; i++) {
      if (ordered[i].desc && ordered[i].big) carouselItems.push(ordered[i]);
    }
    // 若凑不满，再用缺介绍的补齐（轮播里介绍为空时显示占位文案）
    if (carouselItems.length < 2) {
      for (var j = 0; j < ordered.length && carouselItems.length < CAROUSEL_MAX; j++) {
        if (carouselItems.indexOf(ordered[j]) === -1) carouselItems.push(ordered[j]);
      }
    }

    var html = '';
    if (carouselItems.length) {
      html += carouselHTML(carouselItems);
    }
    html += '<div class="masonry">';
    for (var k = 0; k < ordered.length; k++) {
      html += cardHTML(ordered[k], false);
    }
    html += '</div>';

    grid.innerHTML = html;
    initLazyObserver();
    initCarousel(carouselItems);
  }

  /* ---------- 详情浮层 ---------- */
  function openModal(id) {
    var it = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) { it = items[i]; break; }
    }
    if (!it) return;

    modalImg.src = it.big;
    modalImg.alt = it.name;
    modalTitle.textContent = it.name;
    modalCat.textContent = it.cat + (it.author ? ' · ' + it.author : '');
    modalDesc.textContent = it.desc || '（暂无文字介绍，图片待后续完善）';

    modalLayer.classList.add('open');
    modalLayer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // 焦点移到关闭按钮，便于键盘操作
    var closeBtn = modalLayer.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    modalLayer.classList.remove('open');
    modalLayer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ---------- 事件绑定 ---------- */
  catList.addEventListener('click', function (e) {
    var btn = e.target.closest('.cat-btn');
    if (!btn) return;
    activeCat = btn.getAttribute('data-cat');
    renderCats();
    renderGrid();
  });

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (card) openModal(card.getAttribute('data-id'));
  });

  grid.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var card = e.target.closest('.card');
      if (card) {
        e.preventDefault();
        openModal(card.getAttribute('data-id'));
      }
    }
  });

  bindCarouselEvents();

  // 关闭：点击遮罩、关闭按钮
  modalLayer.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalLayer.classList.contains('open')) {
      closeModal();
    }
  });

  /* ---------- 初始化 ---------- */
  renderCats();
  renderGrid();
})();
