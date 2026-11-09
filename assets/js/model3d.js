/* ==========================================================================
   银绣山河 · 3D 银饰查看弹窗
   --------------------------------------------------------------------------
   点击第三屏左卡「查看 3D 模型」按钮打开弹窗，three.js 渲染 GLB 模型。
   - 顶部三个标签可切换三件银饰（当前先内置第一件模型，其余切换时显示占位）。
   - three.js 已本地化（UMD 全局构建），用普通 script 加载，file:// 双击也能用。
   - 支持鼠标拖拽旋转、滚轮缩放、移动端单指旋转/双指缩放。
   模型文件已压缩：97MB → 11MB（assets/craft/silver-3d.glb）。
   ========================================================================== */
(function () {
  var modal = document.getElementById('model-modal');
  var openBtn = document.querySelector('[data-open-3d]');
  var closeBtn = document.querySelector('[data-close-3d]');
  if (!modal || !openBtn || !closeBtn) return;

  var stage = document.getElementById('model-stage');
  var loadingEl = document.getElementById('model-loading');
  var tabs = [].slice.call(document.querySelectorAll('.model-tab'));

  // 三件银饰：模型数据按需加载（base64 体积大，不在首屏同步引入）。
  // 银冠银角 = 原模型（6.5MB GLB）；银项圈压领 = 91MB 优化为 4.5MB；银手镯 = 101MB 优化为 5.5MB。
  var MODELS = [
    { name: '银冠银角',   key: '__SILVER_3D_BASE64',           src: 'assets/js/vendor/silver-3d-data.js' },
    { name: '银项圈压领', key: '__SILVER_COLLAR_3D_BASE64',    src: 'assets/js/vendor/silver-collar-3d-data.js' },
    { name: '银手镯',     key: '__SILVER_BRACELET_3D_BASE64',  src: 'assets/js/vendor/silver-bracelet-3d-data.js' }
  ];

  // 默认展示哪一件（银项圈压领为本页主推）
  var DEFAULT_TAB = 1;
  var activeTab = DEFAULT_TAB;

  // three.js 已通过 <script> 全局加载，检测是否可用
  var hasThree = typeof THREE !== 'undefined';

  var renderer = null;
  var scene = null;
  var camera = null;
  var controls = null;
  var currentGroup = null;
  var inited = false;
  var rafId = 0;

  function initScene() {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      stage.appendChild(renderer.domElement);
    }

    if (!scene) {
      scene = new THREE.Scene();

      // 灯光：主光 + 冷调补光 + 暖金轮廓光（暖色只作边缘勾光，避免银器整体泛铜）
      var key = new THREE.DirectionalLight(0xffffff, 2.8);
      key.position.set(5, 6, 6);
      scene.add(key);

      var fill = new THREE.DirectionalLight(0xcfe0ff, 1.5);
      fill.position.set(-5, 2, 4);
      scene.add(fill);

      // 正面偏下的冷调柔光：托起银器主体的白亮感
      var front = new THREE.DirectionalLight(0xeaf2ff, 1.4);
      front.position.set(0, -2, 6);
      scene.add(front);

      // 暖金轮廓光：从后上方打，只在边缘留一点金色反射
      var rim = new THREE.DirectionalLight(0xd9b26a, 1.2);
      rim.position.set(0, 4, -6);
      scene.add(rim);

      var amb = new THREE.AmbientLight(0x596e94, 1.1);
      scene.add(amb);
    }

    if (!camera) {
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0.4, 4.6);
    }

    if (!controls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 2;
      controls.maxDistance = 9;
      controls.target.set(0, 0, 0);
      controls.update();
    }

    resize();
    inited = true;
  }

  function resize() {
    if (!renderer) return;
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // base64 → ArrayBuffer（file:// 下不能用 fetch 加载本地 .glb，故内嵌 base64 后用 parse 解析）
  function base64ToArrayBuffer(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var buf = new Uint8Array(len);
    for (var i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  // 按需注入模型数据脚本（base64 体积大，首次查看某件时才加载；file:// 下 <script src> 可用）
  function ensureModelData(model, cb) {
    if (window[model.key]) { cb(null, window[model.key]); return; }

    loadingEl.style.display = 'flex';
    loadingEl.innerHTML = '<div class="model-spinner"></div><div>3D 模型加载中…</div>';

    var s = document.createElement('script');
    s.src = model.src;
    s.async = true;
    s.onload = function () {
      if (window[model.key]) cb(null, window[model.key]);
      else cb(new Error('empty'));
    };
    s.onerror = function () { cb(new Error('script load failed')); };
    document.head.appendChild(s);
  }

  // 加载并放置模型
  function loadModel(index) {
    activeTab = index;
    var meta = MODELS[index];

    // 清除上一个模型
    if (currentGroup) {
      scene.remove(currentGroup);
      currentGroup = null;
    }

    // 暂无模型的银饰：给出友好占位，而不是错误提示
    if (!meta || !meta.key) {
      loadingEl.style.display = 'flex';
      loadingEl.innerHTML = '<div class="model-empty">「' + (meta ? meta.name : '银饰') +
        '」的三维模型正在整理中<br>可先切换查看其他银饰</div>';
      return;
    }

    loadingEl.style.display = 'flex';
    loadingEl.innerHTML = '<div class="model-spinner"></div><div>3D 模型加载中…</div>';

    ensureModelData(meta, function (err, b64) {
      if (err || !b64) {
        loadingEl.style.display = 'none';
        loadingEl.innerHTML = '<div>模型数据缺失，请检查文件是否完整</div>';
        return;
      }
      var loader = new THREE.GLTFLoader();
      var arrayBuffer = base64ToArrayBuffer(b64);

    function onDone(gltf) {
      loadingEl.style.display = 'none';
      var model = gltf.scene;

      // 归一化：居中 + 缩放适配舞台
      var box = new THREE.Box3().setFromObject(model);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      var maxDim = Math.max(size.x, size.y, size.z) || 1;
      var scale = 3.2 / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));

      currentGroup = model;
      scene.add(model);

      // 重置相机视角
      controls.target.set(0, 0, 0);
      controls.update();
    }

    function onError(err) {
      loadingEl.style.display = 'none';
      loadingEl.innerHTML = '<div>模型解析失败，请刷新重试</div>';
      console.error('3D 模型解析失败：', err);
    }

    loader.parse(arrayBuffer, '', onDone, onError);
    });
  }

  function startLoop() {
    if (rafId) return;
    function loop() {
      rafId = requestAnimationFrame(loop);
      if (controls) controls.update();
      if (renderer && scene && camera) renderer.render(scene, camera);
    }
    loop();
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function open() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('model-lock');

    if (!hasThree) {
      loadingEl.style.display = 'flex';
      loadingEl.innerHTML = '<div>3D 引擎未能加载，请检查文件是否完整</div>';
      return;
    }

    if (!inited) {
      initScene();
      loadModel(activeTab);
      startLoop();
    } else {
      startLoop();
    }
  }

  function close() {
    closeInfo();          // 关 3D 界面时同步收起介绍层，避免下次打开残留
    stopLoop();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('model-lock');
  }

  function switchTab(index) {
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('is-active', i === index);
      tabs[i].setAttribute('aria-selected', i === index ? 'true' : 'false');
    }
    if (inited) loadModel(index);
  }

  /* ----------------------------------------------------------------------
     银饰介绍弹窗
     - 三件银饰各有一套文案，按当前标签渲染，切换标签后再次打开即更新。
     - 分两栏：纹与工（工艺 / 纹样 / 细节）、意与史（寓意 / 历史 / 象征）。
     - 关闭后再操作模型即可恢复拖拽旋转，控件本身未受破坏。
     ---------------------------------------------------------------------- */
  var INFO = [
    {
      name: '银冠银角',
      sub: '双角冲天 · 满饰银花 · 盛装之冠',
      craft: [
        ['工艺', '银片反复锤揲打薄至 0.2–0.3 毫米，再以錾刀在背面顶压、正面錾刻，使纹样层层起凸。通体不焊不拼，靠一块银片成形。'],
        ['纹样', '冠面满布缠枝银花与细密卷草，双角作牛角形分叉、角身錾出流水纹，冠围压一圈云雷纹收边。'],
        ['细节', '花瓣边缘起窄脊，转折处用斜錾切出棱面，光下随笔成断续亮点；凹处留灰不打磨、凸处抛至镜面，全靠明暗拉开层次。']
      ],
      culture: [
        ['寓意', '苗族古歌以牛角为祖源标记，银角即「祖先之角」，戴上便是与先祖同形，得其庇佑。'],
        ['历史', '银饰随苗族迁徙而兴：把家产锻成可穿戴的银器，流动中便于保存财富。冠为盛装之首，旧时唯鼓藏节、婚嫁等大礼方戴。'],
        ['象征', '角向上生长，象征生命力与丰产；银角越重，家道越殷实，正是「以大为美、以重为贵」。']
      ]
    },
    {
      name: '银项圈压领',
      sub: '双龙戏珠 · 长命锁形 · 多层流苏',
      craft: [
        ['工艺', '先锤揲出弧形牌身，使其贴合胸口起伏；再以高浮雕起龙身，龙鳞叠压处逐片錾出，背面则留作内凹的光素面。'],
        ['纹样', '牌面主纹为双龙戏珠，底铺细密卷草缠枝；边沿双层包边，内圈连珠、外圈回纹，上端以蝶形连接件接链。'],
        ['细节', '银链为手工编结的环扣，节节相扣；下垂多层流苏，串铜钱纹圆牌、锥形铃与球形铃，光下高光沿鳞片依次跳走。']
      ],
      culture: [
        ['寓意', '锁形压领贴胸而戴，取「锁住魂魄」之意，护孩童平安长大，故又称长命锁。'],
        ['历史', '压领由项圈演变而来，明清以降在黔东南盛行；多是母亲为女儿备下的嫁妆，一代代往下传。'],
        ['象征', '双龙戏珠主吉祥与风调雨顺；铃与钱牌取其声响，民间信其能驱邪，寓「响响亮亮、人丁兴旺」。']
      ]
    },
    {
      name: '银手镯',
      sub: '盘龙绕腕 · 满工外壁 · 光素内膛',
      craft: [
        ['工艺', '银条经锻打、退火、弯圆成镯，外壁錾刻与浮雕并用，龙首收于镯口；内壁光素不饰，贴腕舒适。'],
        ['纹样', '镯身盘绕一条完整龙纹，鳞、爪、须俱全；两侧起脊线，龙首与镯口相接处作如意云头收束。'],
        ['细节', '鳞片以斜錾逐片切出棱面，转动时高光连续闪断，如鳞甲呼吸；脊线打磨圆润，久戴不硌手。']
      ],
      culture: [
        ['寓意', '镯贴身不去，民间视为护身之物：一只自幼戴到成年，象征血脉不断、平安相随。'],
        ['历史', '苗族女性自幼佩戴银镯，开口镯可随臂腕成长调整；婚嫁时成对相赠，既是定情信物，也是嫁妆。'],
        ['象征', '环形无端无终，喻圆满与循环；龙纹主贵与守。民间亦有银能「验毒祛湿」之说，实为对银之洁净的信任。']
      ]
    }
  ];

  var infoEl = document.getElementById('silver-info');
  var infoBtn = document.getElementById('model-info-btn');
  var infoCloseBtn = infoEl ? infoEl.querySelector('[data-close-info]') : null;
  var infoTitleEl = document.getElementById('silver-info-title');
  var infoSubEl = document.getElementById('silver-info-sub');
  var infoBodyEl = document.getElementById('silver-info-body');
  var infoOpen = false;

  function buildSection(num, name, tag, items) {
    var lis = items.map(function (it) {
      return '<div class="silver-info__item"><dt>' + it[0] + '</dt><dd>' + it[1] + '</dd></div>';
    }).join('');
    return '<section class="silver-info__sec">' +
      '<h4 class="silver-info__sec-title"><em>' + num + '</em>' + name + '<i>' + tag + '</i></h4>' +
      '<dl class="silver-info__list">' + lis + '</dl>' +
      '</section>';
  }

  function renderInfo(index) {
    var d = INFO[index] || INFO[0];
    if (!d || !infoBodyEl) return;
    infoTitleEl.textContent = d.name;
    infoSubEl.textContent = d.sub;
    infoBodyEl.innerHTML =
      buildSection('壹', '纹与工', '纹理特点', d.craft) +
      buildSection('贰', '意与史', '文化内涵', d.culture);
    infoBodyEl.scrollTop = 0;
  }

  function openInfo() {
    if (!infoEl) return;
    renderInfo(activeTab);
    infoEl.classList.add('is-open');
    infoEl.setAttribute('aria-hidden', 'false');
    if (infoBtn) infoBtn.setAttribute('aria-expanded', 'true');
    infoOpen = true;
    // visibility 有过渡，立即可见性未必生效，延一帧再落焦点
    setTimeout(function () {
      if (infoCloseBtn) infoCloseBtn.focus();
    }, 30);
  }

  function closeInfo() {
    if (!infoEl || !infoOpen) return;
    infoEl.classList.remove('is-open');
    infoEl.setAttribute('aria-hidden', 'true');
    if (infoBtn) {
      infoBtn.setAttribute('aria-expanded', 'false');
      infoBtn.focus();
    }
    infoOpen = false;
  }

  // 事件绑定
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) close();
  });

  if (infoBtn) infoBtn.addEventListener('click', openInfo);
  if (infoCloseBtn) infoCloseBtn.addEventListener('click', closeInfo);
  if (infoEl) {
    // 点击空白处关闭；阻止冒泡，避免顺带触发 3D 弹窗的遮罩关闭
    infoEl.addEventListener('click', function (e) {
      if (e.target === infoEl) {
        e.stopPropagation();
        closeInfo();
      }
    });
  }

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    // Esc 分层响应：介绍层开着就先关介绍层，不连带把整个 3D 界面关掉
    if (infoOpen) { closeInfo(); return; }
    if (modal.classList.contains('is-open')) close();
  });

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { switchTab(i); });
  });

  window.addEventListener('resize', resize);
})();
