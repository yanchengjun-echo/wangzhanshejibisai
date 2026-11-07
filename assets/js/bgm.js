/* 银绣山河 · 背景音乐控制器（全站复用）
   曲目：《天地开辟》苗族古歌（西部方言/Hmong）· Suno AI 谱曲
   来源：用户自有的 mp4 视频，用 ffmpeg -acodec copy 无损提取音轨（未改动音乐）
   行为：浏览器禁止自动播放，故默认静音；用户点击悬浮按钮后才开始循环播放，
        状态写入 localStorage/sessionStorage，切页时尽量延续播放。 */
(function () {
  'use strict';

  var AUDIO_SRC = 'assets/audio/tiandi-kaipi.m4a';
  var STORAGE_KEY = 'yxs-bgm-state'; // 'on' | 'off'
  var STORAGE_VOL = 'yxs-bgm-vol';

  // 等 DOM 就绪后再挂载按钮
  function boot() {
    // 若页面已加载完毕，直接挂载
    if (document.readyState !== 'loading') {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount);
    }
  }

  function mount() {
    // 避免重复挂载
    if (document.getElementById('bgm-toggle')) return;

    var audio = document.createElement('audio');
    audio.id = 'bgm-audio';
    audio.src = AUDIO_SRC;
    audio.loop = true;          // 循环播放
    audio.preload = 'auto';
    audio.crossOrigin = null;   // 同源，无需跨域

    // 音量：从上次记忆读取，默认 0.5（背景音乐不宜过响）
    var vol = parseFloat(localStorage.getItem(STORAGE_VOL));
    if (isNaN(vol) || vol < 0 || vol > 1) vol = 0.5;
    audio.volume = vol;

    // 悬浮开关按钮
    var btn = document.createElement('button');
    btn.id = 'bgm-toggle';
    btn.type = 'button';
    btn.className = 'bgm-toggle is-off';
    btn.setAttribute('aria-label', '播放背景音乐');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = '背景音乐：播放 / 暂停';
    // 内联 SVG 图标（音符 + 斜线静音态由 CSS 控制）
    btn.innerHTML =
      '<span class="bgm-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path class="i-note" d="M9 18V6l10-2v11"/>' +
          '<circle class="i-note" cx="6" cy="18" r="3"/>' +
          '<circle class="i-note" cx="16" cy="15" r="3"/>' +
          '<line class="i-mute" x1="3" y1="3" x2="21" y2="21"/>' +
        '</svg>' +
      '</span>' +
      '<span class="bgm-ring" aria-hidden="true"></span>';

    document.body.appendChild(btn);
    document.body.appendChild(audio);

    var isOn = localStorage.getItem(STORAGE_KEY) === 'on';

    function setOn(on) {
      isOn = on;
      if (on) {
        // 用户手势内调用 play，规避自动播放限制
        var p = audio.play();
        if (p && p.then) {
          p.then(function () {
            btn.classList.remove('is-off');
            btn.classList.add('is-on');
            btn.setAttribute('aria-pressed', 'true');
            btn.setAttribute('aria-label', '暂停背景音乐');
          }).catch(function () {
            // 播放被拒（罕见），回退为关
            isOn = false;
            localStorage.setItem(STORAGE_KEY, 'off');
          });
        } else {
          btn.classList.remove('is-off');
          btn.classList.add('is-on');
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', '暂停背景音乐');
        }
      } else {
        audio.pause();
        btn.classList.remove('is-on');
        btn.classList.add('is-off');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', '播放背景音乐');
      }
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    }

    btn.addEventListener('click', function () {
      // 首次点击即视为「用户已授权音频」，本次会话内允许跨页静默恢复
      sessionStorage.setItem('yxs-bgm-authed', '1');
      setOn(!isOn);
    });

    // 切页延续：若本次会话已授权过、且上次状态是「开」，尝试静默恢复播放。
    // 多数浏览器允许在「已授权过音频的页面/会话」里继续播放，无需再次点击。
    var authed = sessionStorage.getItem('yxs-bgm-authed') === '1';
    if (authed && isOn) {
      var p2 = audio.play();
      if (p2 && p2.then) {
        p2.then(function () {
          btn.classList.remove('is-off');
          btn.classList.add('is-on');
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', '暂停背景音乐');
        }).catch(function () { /* 静默失败：等待用户再次点击 */ });
      }
    }

    // 音量持久化：记录当前音量（默认 0.5，后续可扩展 UI 调节）
    audio.addEventListener('volumechange', function () {
      localStorage.setItem(STORAGE_VOL, String(audio.volume));
    });
  }

  boot();
})();
