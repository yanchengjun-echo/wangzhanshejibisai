/* ==========================================================================
   匠心传承 · 节庆日历（翻页 + 悬浮展开 + 农历标注）
   --------------------------------------------------------------------------
   生成未来 12 个月的单月日历，左右箭头翻页切换月份。苗族主要节日的公历
   日期以金色高亮，并在日期格下方标注农历日子；鼠标悬浮（或键盘聚焦）高亮
   日时，自动在上方展开一个详情浮层，展示该节日的图片与文字介绍。
   节日日期取自苗族传统农历节日，经万年历换算为公历；素材出自官方名录与
   公开报道，页面内不标注来源，出处记录在交付说明文档。
   ========================================================================== */
(function () {
  'use strict';

  /* 节日数据：
     date   高亮的公历日期（年-月-日）
     lunar  该节日对应的农历日子（用于日期格下方小字标注）
   */
  var FESTIVALS = [
    {
      id: 'miao-new-year',
      date: '2026-11-25',
      lunarDay: '十七',
      name: '苗年',
      lunar: '农历十月十七',
      where: '贵州黔东南 · 雷山',
      level: '国家级非遗',
      img: 'assets/festival/gallery-1.jpg',
      imgAlt: '雷山苗年万人芦笙踩鼓',
      lead: '苗族一年一度最盛大的年节，比春节还热闹。',
      text: '苗年，苗语称「Nongx Niangx」，意为「过年」，是苗族同胞一年里最为隆重的传统节日，通常在秋收结束之际、农历十月至十一月间举行，2008 年列入国家级非物质文化遗产名录。节日里，苗族男女身着全套银饰盛装，吹芦笙、踩歌堂、走亲访友；村寨中杀年猪、打糍粑、酿米酒，摆起长桌宴，以「高山流水」的最高礼仪敬酒迎客。雷山苗年最负盛名，被誉为「中国最具特色民族节庆」，一年一度为期月余，其中万人非遗巡游与万人芦笙展演场面尤为壮观，被称作「银饰的海洋」。',
      note: '大节三六九 · 小节天天有'
    },
    {
      id: 'lusheng-festival',
      date: '2027-02-23',
      lunarDay: '十八',
      name: '甘囊香芦笙节',
      lunar: '农历正月十八至二十',
      where: '贵州黔东南 · 凯里舟溪',
      level: '国家级非遗',
      img: 'assets/festival/gallery-2.jpg',
      imgAlt: '苗族芦笙手吹奏长芦笙',
      lead: '千年芦笙会，如今已成万人齐聚的国际性节日。',
      text: '每年农历正月十八至二十，凯里市舟溪镇甘囊香一带的苗族同胞齐聚一堂，过一年一度的芦笙节。男女老少身着盛装，吹芦笙、跳芦笙舞，周边村寨的群众纷纷赶来，场面热闹非凡。芦笙是苗族最具代表性的乐器，芦笙节也因此成为苗族最重要的歌舞盛会之一。如今，甘囊香芦笙节已逐渐发展为国际性的大节日，观看人数数以万计；节日期间除吹芦笙、跳芦笙舞外，还增添了赛马、斗牛、斗鸟等丰富多彩的娱乐活动，让古老的传统在新时代愈发红火。',
      note: '芦笙一响 · 脚板就痒'
    },
    {
      id: 'sisters-festival',
      date: '2027-04-21',
      lunarDay: '十五',
      name: '苗族姊妹节',
      lunar: '农历三月十五至十七',
      where: '贵州黔东南 · 台江施洞',
      level: '国家级非遗',
      img: 'assets/activity/news-taijiang.jpg',
      imgAlt: '台江苗族姊妹节盛装游演',
      lead: '藏在花蕊里的节日，也是苗家人含蓄的情人节。',
      text: '姊妹节，又称「吃姊妹饭节」，是贵州清水江中游沿岸苗族青年特有的集会，被誉为「藏在花蕊里的节日」，2006 年列入第一批国家级非物质文化遗产名录。农历三月十五至十七，出嫁的妇女回到娘家团聚，青年男女相亲、对歌，人人穿上最隆重的盛装、戴上最华丽的首饰。节日里，姑娘们用山上采集的野花野叶把糯米染成五颜六色，蒸成「姊妹饭」相互馈赠，还在饭里藏下松针、竹钩等信物，含蓄地传情达意。万人盛装游演是姊妹节最具代表性的环节，万名苗族同胞头戴银冠银角、颈挂银项圈，随木鼓节拍踏歌而行，绵延数公里，蔚为壮观。',
      note: '姊妹饭里藏情意'
    },
    {
      id: 'april-eighth',
      date: '2027-05-13',
      lunarDay: '初八',
      name: '苗族「四月八」',
      lunar: '农历四月初八',
      where: '贵州贵阳 · 黄平飞云崖',
      level: '国家级非遗',
      img: 'assets/activity/news-april8.jpg',
      imgAlt: '苗族四月八英雄亚努节',
      lead: '纪念苗族英雄亚努的节日，苗家儿女共同的记忆。',
      text: '「四月八」又称「亚努节」，是贵州、湘西、桂北等地苗族同胞的传统节日，为纪念苗族民族英雄亚努的殉难日而兴起，2011 年列入第三批国家级非物质文化遗产名录。每年农历四月初八，苗族同胞举行吹芦笙、箫笛、唱山歌、跳苗家舞蹈、荡秋千、上刀梯、玩龙灯、耍狮子等庆祝活动。各地节日内容不尽相同，其中规模最宏大、场面最隆重、影响最深远者，首推贵阳市苗族的「四月八」庆祝活动；黄平县飞云崖一带则以赛马、芦笙舞、斗鸟见长，盛况延续数日。',
      note: '英雄远去 · 歌声不歇'
    },
    {
      id: 'dragon-boat',
      date: '2027-06-28',
      lunarDay: '廿四',
      name: '苗族独木龙舟节',
      lunar: '农历五月二十四至二十七',
      where: '贵州黔东南 · 台江施洞',
      level: '国家级非遗',
      img: 'assets/festival/gallery-6.jpg',
      imgAlt: '苗族节庆盛装起舞',
      lead: '清水江上的独木龙舟，划出的是一脉相承的古风。',
      text: '独木龙舟节是贵州台江县施洞镇一带苗族同胞独有的传统节日，也是国家级非物质文化遗产。每年农历五月二十四至二十七，清水江沿岸的苗族村寨把珍藏了一年的独木龙舟请下水，举行盛大的龙舟竞渡。独木龙舟由整根巨木挖凿而成，形制古朴，龙舟下水前有请龙、祭祀等庄重仪式。节日期间，清水江上千帆竞发、鼓声震天，两岸苗家儿女身着盛装观赛助威，并与龙舟竞渡相伴开展踩鼓、对歌等活动，热闹非凡。',
      note: '千帆竞发 · 古风犹存'
    },
    {
      id: 'climb-hill',
      date: '2027-07-22',
      lunarDay: '十九',
      name: '苗族爬坡节',
      lunar: '农历六月十九至二十一',
      where: '贵州黔东南 · 凯里香炉山',
      level: '地方传统节庆',
      img: 'assets/festival/gallery-4.jpg',
      imgAlt: '苗家节庆拦门敬酒',
      lead: '登高对歌、游方寻偶，山野间的青春盛会。',
      text: '爬坡节是贵州苗族青年男女的传统节日，多在农历六月十九至二十一日举行，以凯里市香炉山一带最为热闹。节日期间，苗族青年男女身着盛装，从四面八方赶来，沿山间小径一路登高。山顶上，人们跳芦笙、对山歌、斗鸟、游方，以歌传情、以舞会友；未找到对象的青年男女可借此时机相识相恋，长辈们则在一旁鼓劲祝福。爬坡节既是苗族青年谈情说爱的青春盛会，也是山野间一场充满生机的民俗大集。',
      note: '登高一歌 · 情定山间'
    },
    {
      id: 'guzang',
      date: '',
      name: '苗族鼓藏节',
      lunar: '每十二年一度',
      where: '贵州黔东南 · 雷山',
      level: '国家级非遗',
      img: 'assets/festival/gallery-5.jpg',
      imgAlt: '苗族节庆巡游队伍',
      lead: '十二年一度的祭祖大典，苗族最盛大的祭祀活动。',
      text: '鼓藏节是苗族以宗族（鼓社）为单位举行的祭祖大典，是苗族最古老、最隆重的祭祀性节日，2006 年列入第一批国家级非物质文化遗产名录。鼓藏节以「鼓」为核心，苗家人视木鼓为祖先灵魂所栖，每逢十二生肖一轮（十二年）方举行一次，故又称「鼓社节」。节日期间要举行庄重的请鼓、祭鼓、跳鼓仪式，随后跳芦笙、踩铜鼓、斗牛、吹芦笙，全寨欢庆数日。因十二年才得一见，鼓藏节既是苗族慎终追远的祭祀，也是凝聚宗族、传承文化的盛大聚会。',
      note: '十二载一轮 · 鼓声传古今'
    }
  ];

  var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  /* 未来 12 个月的起点：当前月份 */
  var now = new Date();
  var startYear = now.getFullYear();
  var startMonth = now.getMonth(); // 0-11

  /* 当前显示的月份索引（0-11） */
  var currentIndex = 0;

  var calendar = document.getElementById('festival-calendar');
  var monthLabel = document.getElementById('cal-month-label');
  var legend = document.getElementById('cal-legend');
  var prevBtn = document.getElementById('cal-prev');
  var nextBtn = document.getElementById('cal-next');

  if (!calendar || !monthLabel || !legend || !prevBtn || !nextBtn) { return; }

  /* 命中某天的节日（date 有效且匹配） */
  function festOnDay(year, month, day) {
    for (var i = 0; i < FESTIVALS.length; i++) {
      var f = FESTIVALS[i];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) { continue; }
      var d = new Date(f.date + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return f;
      }
    }
    return null;
  }

  /* 该月命中的节日列表 */
  function festsInMonth(year, month) {
    return FESTIVALS.filter(function (f) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) { return false; }
      var d = new Date(f.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  /* 渲染第 index 个月（0-11） */
  function render(index) {
    currentIndex = index;
    var y = startYear + Math.floor((startMonth + index) / 12);
    var mo = (startMonth + index) % 12;

    monthLabel.textContent = y + ' 年 ' + (mo + 1) + ' 月';

    /* 清空并重建日历网格 */
    calendar.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'month__grid';

    WEEKDAYS.forEach(function (w) {
      var dow = document.createElement('span');
      dow.className = 'dow';
      dow.textContent = w;
      grid.appendChild(dow);
    });

    var first = new Date(y, mo, 1);
    var firstDow = first.getDay();
    var daysInMonth = new Date(y, mo + 1, 0).getDate();

    for (var b = 0; b < firstDow; b++) {
      var blank = document.createElement('span');
      blank.className = 'day day--blank';
      blank.setAttribute('aria-hidden', 'true');
      grid.appendChild(blank);
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var cell = document.createElement('span');
      var fest = festOnDay(y, mo, day);
      if (fest) {
        cell.className = 'day day--fest';
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-haspopup', 'dialog');
        cell.setAttribute('aria-label', fest.name + '（' + (mo + 1) + ' 月 ' + day + ' 日）');
        cell.setAttribute('data-fest', fest.id);

        /* 公历数字 */
        var num = document.createElement('span');
        num.className = 'day__num';
        num.textContent = String(day);
        cell.appendChild(num);

        /* 农历小字 */
        var lunar = document.createElement('span');
        lunar.className = 'day__lunar';
        lunar.textContent = '农历' + fest.lunarDay;
        cell.appendChild(lunar);

        /* hover 详情浮层 */
        cell.appendChild(buildPop(fest));

        cell.addEventListener('click', function () { openDialog(this.getAttribute('data-fest')); });
        cell.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDialog(this.getAttribute('data-fest'));
          }
        });
      } else {
        cell.className = 'day';
        var n2 = document.createElement('span');
        n2.className = 'day__num';
        n2.textContent = String(day);
        cell.appendChild(n2);
      }
      grid.appendChild(cell);
    }
    calendar.appendChild(grid);

    /* 图例 */
    legend.innerHTML = '';
    var fests = festsInMonth(y, mo);
    fests.forEach(function (f) {
      var item = document.createElement('span');
      item.className = 'legend__item';
      var dot = document.createElement('span');
      dot.className = 'legend__dot';
      dot.setAttribute('aria-hidden', 'true');
      item.appendChild(dot);
      item.appendChild(document.createTextNode(f.name + ' · ' + f.lunar));
      legend.appendChild(item);
    });

    /* 翻页按钮状态 */
    prevBtn.disabled = (index === 0);
    nextBtn.disabled = (index === 11);
  }

  /* 构建 hover 浮层 */
  function buildPop(f) {
    var pop = document.createElement('div');
    pop.className = 'festival-pop';
    pop.setAttribute('aria-hidden', 'true');

    var head = document.createElement('div');
    head.className = 'festival-pop__head';
    var name = document.createElement('span');
    name.className = 'festival-pop__name';
    name.textContent = f.name;
    var meta = document.createElement('span');
    meta.className = 'festival-pop__meta';
    meta.textContent = f.lunar + ' · ' + f.where;
    head.appendChild(name);
    head.appendChild(meta);
    pop.appendChild(head);

    var imgWrap = document.createElement('div');
    imgWrap.className = 'festival-pop__img';
    var img = document.createElement('img');
    img.src = f.img;
    img.alt = f.imgAlt;
    img.loading = 'lazy';
    imgWrap.appendChild(img);
    pop.appendChild(imgWrap);

    var lead = document.createElement('p');
    lead.className = 'festival-pop__lead';
    lead.textContent = f.lead;
    pop.appendChild(lead);

    var text = document.createElement('p');
    text.className = 'festival-pop__text';
    text.textContent = f.text;
    pop.appendChild(text);

    return pop;
  }

  /* ---- 详情弹层（点击高亮日或鼓藏节按钮弹出） ---- */
  var overlay = document.getElementById('festival-overlay');
  var dialog = document.getElementById('festival-dialog');
  var closeBtn = dialog.querySelector('.festival-dialog__close');
  var lastFocus = null;

  function getFest(id) {
    for (var i = 0; i < FESTIVALS.length; i++) {
      if (FESTIVALS[i].id === id) { return FESTIVALS[i]; }
    }
    return null;
  }

  function openDialog(id) {
    var f = getFest(id);
    if (!f) { return; }
    lastFocus = document.activeElement;
    dialog.querySelector('#festival-dialog-date').textContent = f.lunar + ' · ' + f.where;
    dialog.querySelector('#festival-dialog-name').textContent = f.name + '（' + f.level + '）';
    var img = dialog.querySelector('#festival-dialog-img');
    img.src = f.img;
    img.alt = f.imgAlt;
    dialog.querySelector('#festival-dialog-lead').textContent = f.lead;
    dialog.querySelector('#festival-dialog-text').textContent = f.text;
    dialog.querySelector('#festival-dialog-note').textContent = f.note;

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

  /* 鼓藏节按钮：挂在 legend 图例里（无公历日的月份不显示，改用全局入口） */
  function renderGuzangEntry() {
    /* 在 legend 区域始终追加一个鼓藏节入口按钮 */
    var guzangBtn = document.createElement('button');
    guzangBtn.type = 'button';
    guzangBtn.className = 'month__view';
    guzangBtn.setAttribute('data-fest', 'guzang');
    guzangBtn.setAttribute('aria-haspopup', 'dialog');
    guzangBtn.textContent = '查看鼓藏节（十二年一度）';
    guzangBtn.addEventListener('click', function () { openDialog('guzang'); });
    legend.appendChild(guzangBtn);
  }

  /* 翻页 */
  prevBtn.addEventListener('click', function () {
    if (currentIndex > 0) { render(currentIndex - 1); }
  });
  nextBtn.addEventListener('click', function () {
    if (currentIndex < 11) { render(currentIndex + 1); }
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

  /* 初始渲染 */
  render(0);
  renderGuzangEntry();
})();
