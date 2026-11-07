/* 银绣山河 · 背景音乐控制器（全站复用）
   曲目：《天地开辟》苗族古歌（西部方言 / Hmong）· Suno AI 谱曲

   音源说明
   - 原始音轨前 53.9 秒是一段满音量的长吟（哼声），已裁掉；保留的正片 192.9 秒
   - 首 0.08 秒淡入 —— 只够削掉起手的爆音，正片那记重音（落在 0.06 秒）完整保留；
     一开始做过 0.3 秒，结果重音被压到十分之一，点开第一声发闷，改回来了
   - 尾 0.20 秒淡出
   - 原文件解码峰值 1.50（自带削波），已对超过 0.92 的 0.1% 样点做软限幅，主体电平不动
   - 容器改为 faststart（moov 前置），浏览器拿到文件头即可起播，不必下完 1.5MB

   行为
   1. 浏览器禁止无手势自动播放，故默认静音；点按钮才开始。
   2. 站内切页时播放进度写入 sessionStorage，新页面接着上次的位置播，不从头再来。
      同一标签页内有效，关掉标签页即清空。
   3. 按钮可拖动，位置记在 localStorage；拖动与点击用位移阈值区分（6px）。
*/
(function () {
  'use strict';

  var SRC     = 'assets/audio/tiandi-kaipi.m4a?v=2';
  var K_STATE = 'yxs-bgm-state';   // 'on' | 'off'
  var K_VOL   = 'yxs-bgm-vol';     // 0..1
  var K_POS   = 'yxs-bgm-pos';     // 'left,top'
  var K_TIME  = 'yxs-bgm-time';    // 秒（sessionStorage）
  var K_AUTH  = 'yxs-bgm-authed';  // 本次会话是否点过播放

  var DRAG_SLOP = 6;   // 位移小于此值视为点击

  function read(store, k) {
    try { return store.getItem(k); } catch (e) { return null; }
  }
  function write(store, k, v) {
    try { store.setItem(k, v); } catch (e) {}
  }

  /* ---------------- 1. 音频：脚本执行即创建，尽早开始下载 ---------------- */

  var audio = document.createElement('audio');
  audio.id = 'bgm-audio';
  audio.loop = true;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  audio.src = SRC;

  var volume = 0.5;
  var savedVol = parseFloat(read(localStorage, K_VOL));
  if (!isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) volume = savedVol;
  audio.volume = 0;   // 真正起播时再淡入

  /* ---------------- 2. 播放进度：切页续播 ---------------- */

  function saveTime() {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    write(sessionStorage, K_TIME, audio.currentTime.toFixed(2));
  }

  var lastSave = 0;
  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (now - lastSave < 900) return;
    lastSave = now;
    saveTime();
  });
  window.addEventListener('pagehide', saveTime);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) saveTime();
  });

  function seekSaved() {
    var t = parseFloat(read(sessionStorage, K_TIME) || '0');
    if (!isFinite(t) || t <= 0.5) return;
    /* 已经接近曲尾就从头来，别刚接上就循环 */
    if (isFinite(audio.duration) && audio.duration > 0 && t > audio.duration - 2) t = 0;
    try { audio.currentTime = t; } catch (e) {}
  }

  /* ---------------- 3. 淡入 ---------------- */

  var fadeSeq = 0;

  function fadeIn() {
    var target = volume;
    var seq = ++fadeSeq;
    var DUR = 420;
    var t0 = 0;
    audio.volume = 0;

    function step(ts) {
      if (seq !== fadeSeq) return;
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      audio.volume = target * (p * p * (3 - 2 * p));   // smoothstep
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    /* 兜底：后台标签页 rAF 会暂停，别让音量卡在中间值 */
    setTimeout(function () {
      if (seq === fadeSeq && audio.volume < target) audio.volume = target;
    }, DUR + 160);
  }

  /* ---------------- 4. 播放 / 暂停 ---------------- */

  var btn = null;

  function mark(on) {
    if (!btn) return;
    btn.classList.toggle('is-on', on);
    btn.classList.toggle('is-off', !on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? '暂停背景音乐' : '播放背景音乐');
  }

  /* 等元数据就绪再播；resume=true 时先跳到上次的位置 */
  function playWhenReady(resume, done) {
    function go() {
      if (resume) seekSaved();
      var p;
      try { p = audio.play(); } catch (e) { done(false); return; }
      if (!p || !p.then) { done(true); return; }
      p.then(function () { done(true); }, function () { done(false); });
    }

    if (audio.readyState >= 1) { go(); return; }

    var settled = false;
    function once() {
      if (settled) return;
      settled = true;
      audio.removeEventListener('loadedmetadata', once);
      go();
    }
    audio.addEventListener('loadedmetadata', once);
    setTimeout(function () {
      if (!settled) { settled = true; audio.removeEventListener('loadedmetadata', once); go(); }
    }, 3000);
  }

  /* 真正开始出声才更新界面：不依赖 play() 返回的 Promise，
     某些环境下那个 Promise 迟迟不 resolve，按钮就会一直停在「关」 */
  audio.addEventListener('playing', function () {
    if (audio.volume === 0) fadeIn();
    mark(true);
    write(localStorage, K_STATE, 'on');
  });

  function toggle() {
    write(sessionStorage, K_AUTH, '1');

    if (!audio.paused) {
      saveTime();                       // 记住停在哪一秒
      audio.pause();
      audio.volume = volume;
      mark(false);
      write(localStorage, K_STATE, 'off');
      return;
    }

    /* 新页面进来的 audio 停在 0，需要接上次的位置；暂停后继续则不需要 */
    var needResume = audio.currentTime < 0.5;
    playWhenReady(needResume, function (ok) {
      if (!ok) {
        /* 播放被浏览器拒绝：视觉回到「关」，但不动记忆状态，下次切页再试 */
        audio.volume = volume;
        mark(false);
      }
      /* 成功的情况交给 playing 事件收尾 */
    });
  }

  /* ---------------- 5. 位置：拖动 + 记忆 ---------------- */

  var lastDragEnd = 0;

  function clampPos(left, top) {
    if (!btn) return;
    var w = btn.offsetWidth || 56;
    var h = btn.offsetHeight || 56;
    var edge = 4;
    var maxL = Math.max(edge, window.innerWidth - w - edge);
    var maxT = Math.max(edge, window.innerHeight - h - edge);
    var l = Math.min(Math.max(left, edge), maxL);
    var t = Math.min(Math.max(top, edge), maxT);
    btn.style.left = l + 'px';
    btn.style.top = t + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    return { l: l, t: t };
  }

  function savePos() {
    if (!btn) return;
    /* 拖动中按钮处于 scale(1.1)，getBoundingClientRect 会把缩放算进去，
       记下来的位置会偏几个像素，所以优先读布局值 */
    var l = parseFloat(btn.style.left);
    var t = parseFloat(btn.style.top);
    if (isFinite(l) && isFinite(t)) {
      write(localStorage, K_POS, Math.round(l) + ',' + Math.round(t));
      return;
    }
    var r = btn.getBoundingClientRect();
    write(localStorage, K_POS, Math.round(r.left) + ',' + Math.round(r.top));
  }

  function restorePos() {
    var raw = read(localStorage, K_POS);
    if (!raw) return false;
    var parts = raw.split(',');
    var l = parseFloat(parts[0]);
    var t = parseFloat(parts[1]);
    if (!isFinite(l) || !isFinite(t)) return false;
    clampPos(l, t);
    return true;
  }

  var drag = null;

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var r = btn.getBoundingClientRect();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, l0: r.left, t0: r.top, moved: false };
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    btn.classList.add('is-holding');
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0;
    var dy = e.clientY - drag.y0;

    if (!drag.moved) {
      if (dx * dx + dy * dy < DRAG_SLOP * DRAG_SLOP) return;
      drag.moved = true;
      btn.classList.add('is-dragging');   // 关掉过渡，拖动才跟手
    }
    if (e.cancelable) e.preventDefault();
    clampPos(drag.l0 + dx, drag.t0 + dy);
  }

  function onPointerUp(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var moved = drag.moved;
    drag = null;
    btn.classList.remove('is-holding', 'is-dragging');
    try { btn.releasePointerCapture(e.pointerId); } catch (err) {}
    if (moved) {
      savePos();
      lastDragEnd = Date.now();
    }
  }

  /* ---------------- 6. 挂载 ---------------- */

  var ICON =
    '<span class="bgm-disc" aria-hidden="true">' +
      '<svg viewBox="0 0 56 56" focusable="false">' +
        '<defs>' +
          '<radialGradient id="bgm-silver" cx="32%" cy="24%" r="82%">' +
            '<stop offset="0%" stop-color="#f6fafe"/>' +
            '<stop offset="30%" stop-color="#e2ebf7"/>' +
            '<stop offset="58%" stop-color="#bccde2"/>' +
            '<stop offset="82%" stop-color="#93a9c3"/>' +
            '<stop offset="100%" stop-color="#748dab"/>' +
          '</radialGradient>' +
          '<linearGradient id="bgm-core" x1="10%" y1="10%" x2="90%" y2="90%">' +
            '<stop offset="0%" stop-color="#15395c"/>' +
            '<stop offset="100%" stop-color="#08182b"/>' +
          '</linearGradient>' +
        '</defs>' +

        /* 银盘本体：偏心径向渐变模拟银的球面反光。
           外缘压一道深环 —— 展馆页的文物图、体验页的团花都是浅色，
           没有这圈暗边银盘会跟背景糊在一起 */
        '<circle cx="28" cy="28" r="27" fill="url(#bgm-silver)"/>' +
        '<circle cx="28" cy="28" r="26.5" fill="none" stroke="#0b1e33" stroke-width="1.3" opacity="0.42"/>' +

        /* 银泡圈：苗族银饰上成圈排列的小银点，12 颗 */
        '<circle class="bgm-beads" cx="28" cy="28" r="24.2" fill="none" stroke="#fbfdff" ' +
          'stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.01 12.67"/>' +

        /* 花丝环：苗银錾刻的断续细边，播放时缓慢自转 */
        '<circle class="bgm-filigree" cx="28" cy="28" r="20.4" fill="none" stroke="#7b93b0" ' +
          'stroke-width="1.15" stroke-linecap="round" stroke-dasharray="3.3 2.36"/>' +

        /* 内圈凹槽 + 深靛蓝芯 */
        '<circle cx="28" cy="28" r="17.4" fill="none" stroke="#8099b6" stroke-width="0.8" opacity="0.8"/>' +
        '<circle cx="28" cy="28" r="14.6" fill="url(#bgm-core)"/>' +
        '<circle cx="28" cy="28" r="14.6" fill="none" stroke="#e8f1fd" stroke-width="0.7" opacity="0.3"/>' +

        /* 音符：双八分音符，缩到 52px 也一眼认得出 */
        '<g class="bgm-note" fill="#eef5ff">' +
          '<path d="M23.8 18.9 L38.3 16.3 L38.3 18.2 L23.8 20.8 Z"/>' +
          '<rect x="23.8" y="18.9" width="1.7" height="13.7" rx="0.85"/>' +
          '<rect x="36.6" y="16.3" width="1.7" height="13.8" rx="0.85"/>' +
          '<ellipse cx="21.3" cy="32.6" rx="3.6" ry="2.7" transform="rotate(-20 21.3 32.6)"/>' +
          '<ellipse cx="34.1" cy="30.1" rx="3.6" ry="2.7" transform="rotate(-20 34.1 30.1)"/>' +
        '</g>' +

        /* 静音斜线：先垫一道深色再压朱红，压在音符上也看得清 */
        '<line class="bgm-mute" x1="19.8" y1="36.2" x2="36.2" y2="19.8" ' +
          'stroke="#0b1e33" stroke-width="4" stroke-linecap="round" opacity="0.5"/>' +
        '<line class="bgm-mute" x1="19.8" y1="36.2" x2="36.2" y2="19.8" ' +
          'stroke="#b0452f" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
    '</span>' +
    '<span class="bgm-glow" aria-hidden="true"></span>';

  function mount() {
    if (document.getElementById('bgm-toggle')) return;

    btn = document.createElement('button');
    btn.id = 'bgm-toggle';
    btn.type = 'button';
    btn.className = 'bgm-toggle is-off';
    btn.setAttribute('aria-label', '播放背景音乐');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = '背景音乐：播放 / 暂停 · 可拖动';
    btn.innerHTML = ICON;

    document.body.appendChild(btn);
    document.body.appendChild(audio);

    /* 有记忆位置就恢复，否则沿用 CSS 的右下角默认位 */
    restorePos();

    btn.addEventListener('pointerdown', onPointerDown);
    btn.addEventListener('pointermove', onPointerMove);
    btn.addEventListener('pointerup', onPointerUp);
    btn.addEventListener('pointercancel', onPointerUp);

    btn.addEventListener('click', function (e) {
      /* 刚拖完的那一下不算点击 */
      if (Date.now() - lastDragEnd < 250) {
        e.preventDefault();
        return;
      }
      toggle();
    });

    /* 窗口变小后把按钮拉回视口内 */
    window.addEventListener('resize', function () {
      var l = parseFloat(btn.style.left);
      var t = parseFloat(btn.style.top);
      if (!isFinite(l) || !isFinite(t)) {
        var r = btn.getBoundingClientRect();
        l = r.left;
        t = r.top;
      }
      clampPos(l, t);
    });

    /* 本次会话点过播放、且上次是开着的，就接着上次的位置继续 */
    var wantOn = read(localStorage, K_STATE) === 'on';
    var authed = read(sessionStorage, K_AUTH) === '1';
    if (wantOn && authed) {
      playWhenReady(true, function (ok) {
        if (!ok) {
          audio.volume = volume;
          mark(false);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
