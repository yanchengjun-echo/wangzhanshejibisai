/* ==========================================================================
   匠心传承 · 近期动态（活动资讯）
   --------------------------------------------------------------------------
   对角交叉布局里，左下 + 右上各放两张资讯卡。点开卡片弹出详情层，
   详情内的元素（日期 / 标题 / 图片 / 引言 / 正文 / 落款）分别从
   上下左右四个方向依次滑入，节奏轻缓，尊重系统的"减少动态效果"。

   数据来源为公开权威报道（页面内不标注来源，出处记录在交付说明）：
   0  第五届丹寨非遗周（央广网 / 丹寨融媒体 2026-09）
   1  苗族四月八·英雄亚努节（文化和旅游部官网 2026-06）
   2  台江苗族姊妹节苗绣技能大赛（央视网 2025-04）
   3  融水"苗山美"民族服饰大赛（广西日报 2026-06）
   ========================================================================== */
(function () {
  'use strict';

  var DATA = [
    {
      date: '2026 · 09 · 贵州丹寨',
      title: '第五届丹寨非遗周 · 苗乡秀非遗美',
      img: 'assets/activity/news-danzhai.jpg',
      imgAlt: '丹寨非遗周服饰走秀',
      lead: '蜡染、银饰、香云纱与手工刺绣同台，古老手艺与潮流设计在苗年广场碰撞。',
      text: '近日，位于贵州省黔东南苗族侗族自治州的丹寨万达小镇苗年广场热闹非凡，第五届丹寨非遗周在这里精彩上演。模特们身着融入蜡染、银饰、香云纱、手工刺绣等元素的特色服饰优雅走秀，本土非遗传承人同台展示风采，将传统民族工艺与现代潮流设计有机融合。一针一线皆匠心，一衣一景皆文化。本届非遗周还开展了传承人对话、新品发布、品牌推介等系列活动，通过展演、交流、展销一体化模式，推动传统非遗创新发展。',
      note: '苗族盛装 · 银饰蜡染同台生辉'
    },
    {
      date: '2026 · 06 · 贵州松桃',
      title: '苗族「四月八 · 英雄亚努节」',
      img: 'assets/activity/news-april8.jpg',
      imgAlt: '四月八银冠盛装',
      lead: '千人银冠盛装巡游、花鼓苗歌、上刀山下火海，非遗市集人气爆棚。',
      text: '近日，贵州省铜仁市松桃苗族自治县苗王城景区彩旗飘扬、游人如织，以「英雄亚努魂 · 醉美苗王城」为主题的苗族「四月八 · 英雄亚努节」启幕。雄浑的牛角号划破苗岭晨雾，四张牛皮大鼓同时擂响，千人银冠盛装巡游随即掀起高潮——千余名苗乡群众头戴缀满银花银鸟的璀璨银冠，身披银饰披肩，银铃随步伐叮咚作响。接龙广场变身为非遗舞台，苗族花鼓铿锵豪迈、原生态苗歌婉转悠扬，「上刀山」「下火海」等绝技惊心动魄。匠心·亚努非遗市集数十个摊位集中展示苗族银饰、苗绣、蜡染等手作，让游客沉浸式感受苗乡烟火气。',
      note: '千年民俗 · 沉浸式体验苗乡风情'
    },
    {
      date: '2025 · 04 · 贵州台江',
      title: '台江苗族姊妹节 · 苗绣技能大赛',
      img: 'assets/activity/news-taijiang.jpg',
      imgAlt: '台江苗绣技能大赛现场',
      lead: '以针为笔、以线为墨，绣娘老幼同台，姊妹 T 台秀出千年苗绣新姿。',
      text: '4 月 13 日，贵州黔东南州台江县民族团结广场化作一片流动的「非遗工坊」。在苗族古歌的悠扬旋律中，苗族姊妹节苗绣技能大赛暨「姊妹 T 台秀」拉开帷幕，以「针尖对话未来」为主题，通过竞技、展演、走秀三大维度，让千年苗绣与当代审美碰撞。成人组绣娘身着传统服饰，以针为笔、以线为墨，在绣布上勾勒出蝴蝶、鱼纹等苗族图腾；少儿组的「小扎染」选手一扎一染间，蓝与白悄然晕开。压轴的「姊妹 T 台秀」上，年轻姑娘身着各苗族支系传统盛装与时尚改良服饰，从施洞银饰刺绣到百鸟衣，生动诠释苗族文化的包容与创新。',
      note: '针尖对话未来 · 非遗走进当下'
    },
    {
      date: '2026 · 06 · 广西融水',
      title: '融水「苗山美」民族服饰大赛',
      img: 'assets/activity/news-rongshui.jpg',
      imgAlt: '苗山美民族服饰大赛',
      lead: '芦笙悠悠、霓裳流转，一针一线皆是匠心，非遗穿搭走近日常。',
      text: '芦笙悠悠，霓裳流转。6 月 28 日，广西柳州市融水苗族自治县「苗山美」民族服饰大赛火热上演，壮、瑶、苗、侗等各族群众身着传统盛装同台走秀。舞台上，苗族服装银饰熠熠生辉，精美苗绣、古朴蜡染纹样栩栩如生。本次展演创新融合芦笙踩堂、民族舞蹈、农耕文化、山歌演唱等元素，不仅有原汁原味的传统盛装，更有年轻传承人设计的改良民族服饰，传统纹样搭配现代剪裁，让非遗穿搭更贴近日常。当天还设立非遗大集市，苗族服饰、银饰、文创产品、打油茶等多个展区，让游客沉浸式体验非遗魅力。',
      note: '民族服饰为媒 · 非遗赋能乡村振兴'
    },
    {
      date: '2026 · 05 · 湖南绥宁',
      title: '绥宁苗族「四月八姑娘节」',
      img: 'assets/activity/news-suining.jpg',
      imgAlt: '绥宁苗族四月八姑娘节盛装巡游',
      lead: '拦门酒迎宾、乌饭飘香，国家级非遗在巫水河畔焕发「她力量」。',
      text: '每年农历四月初八，是湖南绥宁苗族同胞的传统节日「姑娘节」，又称「黑饭节」或「跳花跳月节」，2008 年被列入国家级非物质文化遗产名录。2026 年，以「又见四月八·归来是姑娘」为主题的姑娘节在巫水河畔启幕，苗家姑娘身着盛装，以拦门酒、苗鼓表演迎接八方宾客。「她智兴乡」姑娘大会、「苗韵滑潮」滑板文化嘉年华把蜡染苗绣与潮流运动结合，「姑娘的市集」集美食文创互动于一体，无人机表演秀点亮夜空。花园阁「喜回娘家」行浸式非遗游串联多重拦门礼，让游客亲历千年苗家「姑娘回娘家」的礼俗。',
      note: '国家级非遗 · 湘桂黔边界的「黑饭节」'
    },
    {
      date: '2026 · 03 · 四川古蔺',
      title: '古蔺大寨「宝佤踩山节」',
      img: 'assets/activity/news-gulin.jpg',
      imgAlt: '古蔺宝佤踩山节立花杆仪式',
      lead: '芦笙悠悠、立花杆祈福，苗汉同胞齐聚宝佤山，共赴春日非遗之约。',
      text: '3 月 2 日，四川泸州古蔺县大寨苗族乡「蝶飞宝佤·踩山迎福」宝佤踩山节在向阳村宝佤山开幕。作为苗族同胞最重要的传统节日之一，省级非遗「宝佤踩山」承载着深厚文化底蕴。身着精美盛装的苗族儿女吹起悠扬芦笙、端上醇香米酒，以苗家最高礼仪迎接四方宾朋。开幕式上，原生态歌舞演绎苗族迁徙史诗与农耕喜悦；手工艺展示区苗绣、银饰头饰琳琅满目，传承人现场展示技艺。活动持续四天，立花杆、篝火晚会、民歌会轮番上演，以「文旅商」深度融合激活乡村活力。',
      note: '省级非遗 · 踩山迎福祈丰年'
    }
  ];

  var cards = Array.prototype.slice.call(document.querySelectorAll('.news'));
  var overlay = document.getElementById('news-overlay');
  var dialog = document.getElementById('news-dialog');
  var closeBtn = dialog.querySelector('.news-dialog__close');
  var lastFocus = null;
  var activeIndex = -1;

  function setDialog(index) {
    var d = DATA[index];
    dialog.querySelector('#news-dialog-date').textContent = d.date;
    dialog.querySelector('#news-dialog-title').textContent = d.title;
    var img = dialog.querySelector('#news-dialog-img');
    img.src = d.img;
    img.alt = d.imgAlt;
    dialog.querySelector('#news-dialog-lead').textContent = d.lead;
    dialog.querySelector('#news-dialog-text').textContent = d.text;
    dialog.querySelector('#news-dialog-note').textContent = d.note;
  }

  function open(index) {
    activeIndex = index;
    lastFocus = document.activeElement;
    setDialog(index);
    overlay.hidden = false;
    dialog.hidden = false;
    document.body.classList.add('no-scroll');
    // 触发四周滑入：先重置再下一帧加 .is-open
    dialog.classList.remove('is-open');
    void dialog.offsetWidth; /* 强制重排，让动画从头播 */
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
    // 尊重减少动效：直接收，不等待动画
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done();
    } else {
      setTimeout(done, 420);
    }
  }

  cards.forEach(function (card) {
    var btn = card.querySelector('.news__card');
    btn.addEventListener('click', function () {
      open(parseInt(card.getAttribute('data-index'), 10));
    });
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (dialog.hidden) { return; }
    if (e.key === 'Escape') { close(); }
    if (e.key === 'Tab') {
      // 简单的焦点圈定（详情层内只有关闭按钮与内容）
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
