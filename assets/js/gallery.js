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
      html += '<li><button class="cat-btn" type="button" data-cat="' + c + '"' + cur + '>' +
              c + '<span class="cnt">' + n + '</span></button></li>';
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

  function renderGrid() {
    var list = activeCat === '全部' ? items : items.filter(function (it) { return it.cat === activeCat; });
    curCat.textContent = activeCat;
    curCount.textContent = '共 ' + list.length + ' 件';

    if (!list.length) {
      grid.innerHTML = '<div class="empty">该分类暂无藏品</div>';
      return;
    }

    // 「全部」视图下打散类别；单个分类视图保持原顺序（本就同类）
    var ordered = activeCat === '全部' ? shuffle(list) : list;

    // 首图固定为内容最丰富的精品（织金苗族少女缠绣背扇，id=463），
    // 若打散后它不在首位，则把它提到最前作为首图
    var FEATURE_ID = '463';
    var featureIdx = -1;
    for (var k = 0; k < ordered.length; k++) {
      if (ordered[k].id === FEATURE_ID) { featureIdx = k; break; }
    }
    if (featureIdx > 0) {
      var feat = ordered.splice(featureIdx, 1)[0];
      ordered.unshift(feat);
    }

    var html = '';
    ordered.forEach(function (it, idx) {
      var author = it.author ? '<span class="author">· ' + it.author + '</span>' : '';
      var isFeature = idx === 0;
      var cls = 'card' + (isFeature ? ' card--feature' : '');
      var featureHint = isFeature
        ? '<span class="feature-hint">本类精选 · 点击查看详情</span>'
        : '';
      var featureDesc = (isFeature && it.desc)
        ? '<span class="feature-desc">' + it.desc + '</span>'
        : '';
      html +=
        '<article class="' + cls + '" tabindex="0" role="button" ' +
          'data-id="' + it.id + '" ' +
          'aria-label="查看藏品：' + it.name + '">' +
          '<div class="thumb"><img src="' + (isFeature ? it.big : it.small) + '" alt="' + it.name + '" loading="' + (isFeature ? 'eager' : 'lazy') + '" decoding="async"></div>' +
          '<div class="meta">' +
            '<span class="nm">' + it.name + '</span>' +
            '<span class="cat-tag">' + it.cat + author + '</span>' +
            featureDesc +
            featureHint +
          '</div>' +
        '</article>';
    });
    grid.innerHTML = html;
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
