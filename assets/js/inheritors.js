/* ==========================================================================
   匠心传承 · 人物交互（左大图 + 右卡片列表）
   --------------------------------------------------------------------------
   左侧人物大图与右侧六张卡片联动：鼠标悬停（或键盘聚焦）卡片时，
   左侧切换为对应人物照片；点击卡片弹出详细介绍层，内部元素从四周滑入。
   数据来源为中国非物质文化遗产网（ihchina.cn）等官方名录与公开报道，
   页面内不标注来源，出处记录在交付说明文档。

   六位均为苗族非遗相关国家级代表性传承人，技艺各占一门：
   0 杨光宾  · 苗族银饰锻制技艺
   1 王启萍  · 苗绣（花溪苗绣）
   2 杨芳    · 苗族蜡染技艺
   3 莫厌学  · 苗族芦笙制作技艺
   4 姜文英  · 剪纸（苗族剪纸）
   5 王景才  · 苗族芦笙舞（滚山珠）
   ========================================================================== */
(function () {
  'use strict';

  var DATA = [
    {
      name: '杨光宾',
      craft: '银饰锻制',
      role: '苗族银饰锻制技艺国家级传承人',
      img: 'assets/portraits/yang-guangbin.jpg',
      note: '一锤一錾 · 银花开在蝴蝶上',
      text: '贵州雷山西江控拜银匠世家第五代传人，十三岁随父学艺，十五岁出师游艺。熔炼、铸型、锻制、拉丝、焊接、錾刻、编结、洗涤三十余道工序皆能手握，能把一块银锭反复锤成细如发丝，再编作振翅欲飞的蝴蝶。如今带徒授艺，把家传的手艺往外传。'
    },
    {
      name: '王启萍',
      craft: '花溪苗绣',
      role: '苗绣（花溪苗绣）国家级传承人',
      img: 'assets/portraits/wang-qiping.jpg',
      note: '一针一线 · 反面挑来正面看',
      text: '七岁起随母亲与长辈学绣，十二岁便掌住苗绣的基本技艺，后拜刺绣艺人王朝珍为师，习传统苗族挑花绣。以十字为基本针法，不用底稿、数纱而绣，先挑出轮廓再填细部，练就「反面挑、正面看」的绝活。代表作有《苗族妇女盛装》《娃娃肚兜》等。'
    },
    {
      name: '杨芳',
      craft: '蜡染',
      role: '苗族蜡染技艺国家级传承人',
      img: 'assets/portraits/yang-fang.jpg',
      note: '一布一蜡 · 蓝靛里开出花来',
      text: '贵州丹寨人，自幼学习苗族蜡染，能独立复现老一辈传下来的古老图案，也挖出了带本地文化内涵的新纹样。作品里存着本民族本支系的历史文化，既是日常可用之物，又具收藏价值。在乡里办起蜡染专业合作社，四百余名社员，带当地妇女一道把手艺换成生计。'
    },
    {
      name: '莫厌学',
      craft: '芦笙制作',
      role: '苗族芦笙制作技艺国家级传承人',
      img: 'assets/portraits/mo-yanxue.jpg',
      note: '一管一簧 · 让芦笙开口说话',
      text: '贵州雷山人，苗族芦笙制作技艺第一批国家级代表性传承人，出生在五代相传的芦笙世家，十几岁便随父学艺，一做就是五十余年。他坚持纯手工制作，一支芦笙要经六十多道工序、上百个小时方能完成；又把传统的六管一步步发展到十五至二十四管，大芦笙整体长度可达六七米，远销海内外。他制作的红木笙脚十五管芦笙被贵州省文联作为十大民间工艺精品收藏。在雷山，苗家人说「芦笙是会说话的」，他这一辈子，就是在让这件乐器把苗寨的心声传得更远。'
    },
    {
      name: '姜文英',
      craft: '苗族剪纸',
      role: '剪纸（苗族剪纸）国家级传承人',
      img: 'assets/portraits/jiang-wenying.jpg',
      note: '一剪一刻 · 纸上是苗族史诗',
      text: '贵州剑河人，剪纸（苗族剪纸）第五批国家级代表性传承人。九岁起随母亲学习剪纸，十三岁便掌握苗族剪纸技艺。苗族剪纸不是贴在窗上的窗花，而是苗绣的底样，是「绣花纸」。她的作品多取材苗族神话传说，《姜央射日》《蝴蝶妈妈》《螺丝媳妇》等在传统基础上大胆出新，构图饱满、造型古朴。2013 年她牵头成立剑河县苗族剪纸艺术苑，先后收徒三百余名，带领一千余名妇女靠一把剪刀走出脱贫致富的路。'
    },
    {
      name: '王景才',
      craft: '滚山珠',
      role: '苗族芦笙舞（滚山珠）国家级传承人',
      img: 'assets/portraits/wang-jingcai.jpg',
      note: '一笙一舞 · 荆棘丛里滚出路来',
      text: '贵州纳雍人，苗族芦笙舞（滚山珠）第二批国家级代表性传承人。滚山珠原名「地龙滚荆」，融芦笙吹奏、舞蹈与杂技技巧为一体。他十二岁起学习芦笙舞，后又把杂技、武术动作融入传统舞步，创编出「滚山珠」「双飞燕」「倒栽桩」「叠罗汉」等高难度动作，让这一支从田埂里走出的舞蹈更具观赏性。1989 年，「地龙滚荆」更名为《滚山珠》，此后随团队赴广州、北京，并远赴荷兰、法国、加拿大等地演出，把苗族先民披荆斩棘的迁徙记忆带上了世界舞台。'
    }
  ];

  var cards = Array.prototype.slice.call(document.querySelectorAll('.person__card'));
  var stageImg = document.getElementById('stage-img');
  var stageName = document.getElementById('stage-name');
  var stageCraft = document.getElementById('stage-craft');
  var stage = document.getElementById('stage');

  var overlay = document.getElementById('person-overlay');
  var dialog = document.getElementById('person-dialog');
  var closeBtn = dialog.querySelector('.person-dialog__close');
  var lastFocus = null;
  var activeIndex = 0;

  /* 切换左侧大图（带淡出-淡入） */
  function switchStage(index) {
    if (activeIndex === index) { return; }
    activeIndex = index;
    var d = DATA[index];
    stage.classList.add('is-switching');
    // 淡出完成后换图再淡入
    setTimeout(function () {
      stageImg.src = d.img;
      stageImg.alt = d.name + ' · ' + d.role;
      stageName.textContent = d.name;
      stageCraft.textContent = d.craft;
      stageImg.classList.add('is-on');
      stage.classList.remove('is-switching');
    }, 420);
  }

  /* 弹层：填数据 */
  function setDialog(index) {
    var d = DATA[index];
    dialog.querySelector('#person-dialog-name').textContent = d.name;
    dialog.querySelector('#person-dialog-role').textContent = d.role;
    var av = dialog.querySelector('#person-dialog-avatar');
    av.src = d.img;
    av.alt = d.name;
    dialog.querySelector('#person-dialog-text').textContent = d.text;
    dialog.querySelector('#person-dialog-note').textContent = d.note;
  }

  function open(index) {
    lastFocus = document.activeElement;
    setDialog(index);
    overlay.hidden = false;
    dialog.hidden = false;
    document.body.classList.add('no-scroll');
    dialog.classList.remove('is-open');
    void dialog.offsetWidth;
    dialog.classList.add('is-open');
    closeBtn.focus();
  }

  function close() {
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    var done = function () {
      overlay.hidden = true;
      dialog.hidden = true;
      dialog.classList.remove('is-closing');
      document.body.classList.remove('no-scroll');
      if (lastFocus) { lastFocus.focus(); }
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done();
    } else {
      setTimeout(done, 380);
    }
  }

  /* 卡片：hover/focus 切换大图，click 弹详情 */
  cards.forEach(function (card) {
    var index = parseInt(card.getAttribute('data-index'), 10);

    card.addEventListener('mouseenter', function () {
      switchStage(index);
      card.classList.add('is-active');
    });
    card.addEventListener('mouseleave', function () {
      card.classList.remove('is-active');
    });
    card.addEventListener('focus', function () {
      switchStage(index);
      card.classList.add('is-active');
    });
    card.addEventListener('blur', function () {
      card.classList.remove('is-active');
    });
    card.addEventListener('click', function () {
      open(index);
    });
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (dialog.hidden) { return; }
    if (e.key === 'Escape') { close(); }
    if (e.key === 'Tab') {
      var focusables = dialog.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) { return; }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });
})();
