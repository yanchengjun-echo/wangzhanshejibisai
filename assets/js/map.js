/* ==========================================================================
   银绣山河 · 首页第二屏「苗疆万里」苗族非遗分布地图
   --------------------------------------------------------------------------
   与原稿（单页 Demo）的差别，逐条列明便于回溯：

   1. 依赖全部本地化
      echarts → assets/js/vendor/echarts.min.js
      底图    → assets/geo/miao-map.json（DataV 标准行政区划，只取用到的 19 个要素）
      原稿走 CDN + 在线 fetch，断网即白屏；这里改为本地，且**懒加载**：
      滚动到离本屏 400px 才开始下载，不拖累首屏。

   2. 布局嵌入滚动页
      原稿是 html/body overflow:hidden 的单屏，这里整屏高度由 CSS 给，
      质感层从 fixed 改 absolute，只作用于本屏。

   3. 详情浮层的定位与路由
      原稿 position:fixed + location.hash 路由。滚动页里 fixed 会盖住顶栏、
      hash 会破坏滚动位置，故改为本屏内 absolute 覆盖，状态只用 class 管。

   4. 无障碍
      引线标注 div → button（可 Tab 聚焦、可回车触发）；
      详情加 role=dialog + aria-modal，开时移焦到返回键、关时归还给触发元素；
      本屏其余元素打开详情时置 inert，Tab 不会跑到浮层后面。

   5. 交互事件
      点击系列 0 / 1 都走 openDetail；hover 高亮改用 class 切换（原稿用 active）。
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 0. 资源路径 ---------- */
  var ECHARTS_SRC = 'assets/js/vendor/echarts.min.js';
  var GEO_SRC = 'assets/geo/miao-map.json';

  /* ---------- 1. 数据：苗族分布省份 + 聚居地代表性非遗 ---------- */
  var REGIONS = {
    '贵州省': {
      id: 'guizhou',
      tag: '黔东南 · 黔南 · 安顺 | 苗族人口最集中的省份',
      intro: "贵州是中国苗族人口最多、苗族文化保存最完整的省份。黔东南苗族侗族自治州被誉为'苗族文化中心'，苗绣、银饰、古歌、芦笙舞在此世代相传，'一山不同族，十里不同风'。",
      items: [
        { name: '苗族古歌', cat: '民间文学', level: '国家级', desc: "苗族口传史诗，以盘歌形式演唱创世、迁徙与英雄叙事，被称为'苗族的百科全书'。" },
        { name: '苗绣', cat: '传统美术', level: '国家级', desc: '以针为笔、以线为墨，平绣、辫绣、打籽绣等技法繁复，纹样记录民族迁徙历史。' },
        { name: '苗族银饰锻制技艺', cat: '传统技艺', level: '国家级', desc: '铸炼、锤打、编结、镶嵌、擦洗等三十余道工序，盛装上银冠、银角熠熠生辉。' },
        { name: '苗族蜡染技艺', cat: '传统技艺', level: '国家级', desc: '以铜刀蘸蜂蜡绘花，靛蓝浸染，冰纹自然天成，是靛蓝色谱的来源之一。' },
        { name: '苗族芦笙舞（锦鸡舞）', cat: '传统舞蹈', level: '国家级', desc: '丹寨锦鸡舞模仿锦鸡觅食嬉戏，芦笙伴奏，银饰随舞步叮当作响。' },
        { name: '苗族姊妹节', cat: '民俗', level: '国家级', desc: '台江苗族最古老的情人节，姑娘们互赠五彩姊妹饭，对歌游方。' },
        { name: '苗族独木龙舟节', cat: '民俗', level: '国家级', desc: '清水江畔苗族以整木凿成龙舟竞渡，祈雨求丰，仪式古拙雄浑。' },
        { name: '苗族医药', cat: '传统医药', level: '国家级', desc: "'千年苗医，万年苗药'，以鲜药入药、内外兼治形成独特医药体系。" }
      ]
    },
    '湖南省': {
      id: 'hunan',
      tag: '湘西土家族苗族自治州 | 武陵山区苗族聚居地',
      intro: "湖南苗族主要聚居湘西州。凤凰、花垣、吉首、保靖等地苗族鼓舞气势磅礴，银饰锻造与苗画技艺精美，'赶秋'立秋日荡秋千、对苗歌，是武陵山间的盛会。",
      items: [
        { name: '苗族鼓舞', cat: '传统舞蹈', level: '国家级', desc: '湘西苗族鼓舞分花鼓、团圆鼓等，击鼓而舞，刚柔并济，节庆必备。' },
        { name: '苗画', cat: '传统美术', level: '国家级', desc: '保靖苗画由刺绣稿样发展而来，以矿物颜料绘于布帛，色彩浓烈饱满。' },
        { name: '苗族银饰锻制技艺', cat: '传统技艺', level: '国家级', desc: '凤凰苗族银饰以拉丝、掐花见长，凤冠银帽工艺精湛。' },
        { name: '苗族赶秋', cat: '民俗', level: '国家级', desc: '花垣苗族立秋之日荡八人秋千、舞狮对歌，庆丰收、迎秋社。' },
        { name: '苗族挑花', cat: '传统美术', level: '国家级', desc: '泸溪苗族挑花数纱而绣，几何纹样严整如织，用于头帕、围裙。' }
      ]
    },
    '云南省': {
      id: 'yunnan',
      tag: '文山 · 红河 · 昭通 | 山地苗族多彩支系',
      intro: "云南苗族支系众多，服饰差异极大，'花苗''青苗''白苗'各有色谱。文山芦笙舞雄浑，屏边花山节万人空巷，大关芦笙制作技艺闻名滇东北。",
      items: [
        { name: '苗族芦笙舞', cat: '传统舞蹈', level: '国家级', desc: '文山苗族芦笙舞舞步矫健，芦笙曲调高亢，祭祀与节庆中皆可起舞。' },
        { name: '苗族服饰', cat: '民俗', level: '国家级', desc: '昌宁等地苗族服饰以蜡染、挑花、织锦拼合，一套盛装需数年制成。' },
        { name: '芦笙制作技艺', cat: '传统技艺', level: '国家级', desc: '大关苗族芦笙以苦竹、杉木、响铜制成，六管六音，音色清亮。' },
        { name: '苗族花山节', cat: '民俗', level: '国家级', desc: "屏边等地正月初'踩花山'，立花杆、赛芦笙、对情歌，青年盛会。" }
      ]
    },
    '广西壮族自治区': {
      id: 'guangxi',
      tag: '融水 · 隆林 · 三江 | 大苗山芦笙之乡',
      intro: "广西苗族聚居于桂北大苗山。融水苗族系列坡会贯穿正月，芦笙踩堂、斗马、芒篙表演连绵不断，被誉为'百节之乡'。",
      items: [
        { name: '苗族系列坡会', cat: '民俗', level: '国家级', desc: "融水正月各村轮流'赶坡'，芦笙踩堂、斗马、抢花炮，坡坡相连。" },
        { name: '苗族芦笙斗马节', cat: '民俗', level: '国家级', desc: '融水苗族传统节庆，芦笙比响与骏马相斗轮番上演，场面热烈。' },
        { name: '苗族织锦技艺', cat: '传统技艺', level: '自治区级', desc: '隆林苗族织锦以腰机织造，几何纹样细密，用于背带与盛装。' },
        { name: '苗族银饰锻造技艺', cat: '传统技艺', level: '自治区级', desc: '融水苗族银饰重在錾花与编丝，头饰银雀翎羽摇曳。' }
      ]
    },
    '重庆市': {
      id: 'chongqing',
      tag: '彭水 · 酉阳 | 渝东南苗乡',
      intro: '重庆苗族聚居渝东南武陵山区。彭水为重庆唯一以苗族为主的自治县，苗绣雅致，踩山节歌舞欢腾，苗家歌谣在山谷间世代回响。',
      items: [
        { name: '苗绣（彭水苗绣）', cat: '传统美术', level: '国家级', desc: '彭水苗绣针法细腻，喜用蝶、鸟、鱼纹样，靛蓝底上绣彩线。' },
        { name: '苗族踩山节', cat: '民俗', level: '市级', desc: '彭水苗族节庆，立花杆、吹芦笙、跳踩山舞，祈福纳吉。' },
        { name: '苗族民歌（鞍子苗歌）', cat: '传统音乐', level: '市级', desc: '彭水鞍子苗歌高腔婉转，田间地头即兴编唱，情歌尤为动人。' }
      ]
    },
    '四川省': {
      id: 'sichuan',
      tag: '宜宾珙县 · 泸州叙永 | 川南苗族聚居区',
      intro: '四川苗族主要分布在川南。珙县苗族蜡染古朴典雅，叙永、古蔺苗族古歌苍凉悠远，兴文苗族花山节是川南苗乡一年一度的大盛会。',
      items: [
        { name: '苗族蜡染技艺', cat: '传统技艺', level: '国家级', desc: '珙县苗族蜡染以点蜡绘出螺旋纹、铜鼓纹，蓝白相间如夜空繁星。' },
        { name: '苗族古歌', cat: '民间文学', level: '国家级', desc: '川南苗族古歌吟唱祖先翻越乌蒙的迁徙历程，曲调低回绵长。' },
        { name: '苗族花山节', cat: '民俗', level: '省级', desc: '兴文苗族花山节祭花杆、赛芦笙，苗家儿女盛装云集。' },
        { name: '苗族服饰制作技艺', cat: '传统技艺', level: '省级', desc: '川南苗族服饰以红、蓝对比强烈著称，百褶裙褶数十至上百。' }
      ]
    },
    '湖北省': {
      id: 'hubei',
      tag: '恩施等地 | 武陵山余脉苗乡',
      intro: '湖北苗族散居鄂西武陵山区，与土家、汉等民族交错杂居，其节庆、服饰、歌舞在交融中保持着苗文化底色。',
      items: [
        { name: '苗族四月八', cat: '民俗', level: '省级', desc: '鄂西苗族农历四月初八祭祖聚会，吹笙对歌，纪念先祖。' },
        { name: '苗族刺绣', cat: '传统美术', level: '省级', desc: '鄂西苗绣融合武陵山区多民族纹样，多用于衣襟、袖边装饰。' },
        { name: '苗族民歌', cat: '传统音乐', level: '省级', desc: '鄂西苗歌多五声音阶，高腔山歌回荡于武陵群山之间。' }
      ]
    },
    '海南省': {
      id: 'hainan',
      tag: '琼中 · 五指山 | 海岛苗乡（附图）',
      intro: '海南苗族主要聚居琼中、五指山等中部山区，明代迁居海岛后形成独特支系，盘皇舞、苗族民歌与三色饭承载着海岛苗乡的记忆。',
      items: [
        { name: '海南苗族盘皇舞', cat: '传统舞蹈', level: '省级', desc: '祭祀盘皇的仪式舞蹈，锣鼓伴奏，舞步庄重古朴。' },
        { name: '海南苗族民歌', cat: '传统音乐', level: '省级', desc: '琼中苗族民歌分情歌、酒歌、古歌，多声部吟唱别具韵味。' },
        { name: '苗族三色饭', cat: '民俗', level: '省级', desc: '以山兰米配植物染料蒸制红黄绿三色饭，节庆待客必备。' }
      ]
    },

    /* ----- 具体聚居地（自治州 / 自治县） ----- */
    '黔东南苗族侗族自治州': {
      id: 'qiandongnan',
      tag: '贵州 · 凯里 | 苗族文化中心',
      intro: "黔东南是全国苗族人口最集中的自治州，'百节之乡'。台江姊妹节、施洞独木龙舟、丹寨锦鸡舞、雷山银饰与苗绣，构成苗族文化最完整的核心地带。",
      items: [
        { name: '苗族古歌', cat: '民间文学', level: '国家级', desc: '台江、黄平苗族古歌以盘歌问答传唱创世史诗，歌师可连唱数日不绝。' },
        { name: '苗绣（雷山苗绣）', cat: '传统美术', level: '国家级', desc: '雷山苗绣以双针锁绣、绉绣闻名，纹样中的蝴蝶妈妈是苗族始祖图腾。' },
        { name: '苗族银饰锻制技艺', cat: '传统技艺', level: '国家级', desc: '雷山控拜、麻料银匠村世代锻银，一件银冠需数月锤揲錾刻。' },
        { name: '苗族姊妹节', cat: '民俗', level: '国家级', desc: '台江施洞、老屯农历三月十五，姑娘蒸五彩姊妹饭赠予意中人。' },
        { name: '苗族独木龙舟节', cat: '民俗', level: '国家级', desc: '施秉、台江清水江畔，三根整木凿成的子母龙舟竞渡祈雨。' },
        { name: '苗族芦笙舞（锦鸡舞）', cat: '传统舞蹈', level: '国家级', desc: '丹寨锦鸡舞源于对锦鸡的图腾崇拜，舞步轻灵，银铃脆响。' },
        { name: '苗族蜡染技艺', cat: '传统技艺', level: '国家级', desc: '丹寨、黄平蜡染以铜刀点蜡，靛染冰纹如瓷器开片，蓝白相生。' },
        { name: '苗年', cat: '民俗', level: '国家级', desc: '雷山、台江苗年祭祖庆收，杀年猪、打糍粑、跳芦笙，历时数日。' }
      ]
    },
    '黔南布依族苗族自治州': {
      id: 'qiannan',
      tag: '贵州 · 都匀 | 苗岭东南苗乡',
      intro: '黔南苗族与布依族等民族交错而居，贵定苗族芦笙舞雄健，惠水、龙里一带苗族古歌与服饰保存完好。',
      items: [
        { name: '苗族芦笙舞', cat: '传统舞蹈', level: '国家级', desc: '贵定苗族芦笙舞（鼓龙鼓虎·长衫龙）以长衫起舞，气势如龙行虎步。' },
        { name: '苗族古歌', cat: '民间文学', level: '省级', desc: '龙里、惠水苗族古歌承续苗岭歌脉，婚丧嫁娶皆有歌。' },
        { name: '苗族服饰', cat: '民俗', level: '省级', desc: '黔南苗族服饰支系多样，貘尾纹、江河纹记录迁徙路线。' },
        { name: '苗族蜡染技艺', cat: '传统技艺', level: '省级', desc: '黔南蜡染与刺绣并用，背扇、被面纹样饱满繁复。' }
      ]
    },
    '黔西南布依族苗族自治州': {
      id: 'qianxinan',
      tag: '贵州 · 兴义 | 南北盘江苗乡',
      intro: '黔西南苗族散居南北盘江流域，芦笙舞与跳花节是苗家最重要的社交与祭祀场合，服饰以蜡染百褶裙为特色。',
      items: [
        { name: '苗族芦笙舞', cat: '传统舞蹈', level: '省级', desc: '黔西南苗族芦笙舞融滚、翻、旋等技巧，芦笙手边吹边舞。' },
        { name: '苗族跳花节', cat: '民俗', level: '省级', desc: '正月跳花坡，立花树、祭花神，青年男女盛装会歌。' },
        { name: '苗族服饰', cat: '民俗', level: '省级', desc: '以青黑为底、红绿挑花，百褶裙配蜡染围腰为典型装束。' }
      ]
    },
    '松桃苗族自治县': {
      id: 'songtao',
      tag: '贵州 · 铜仁 | 黔东苗疆边城',
      intro: "松桃地处黔湘渝交界，是贵州苗族文化东部门户。苗绣雅致、苗族绝技惊险，'四月八'纪念苗族英雄亚努。",
      items: [
        { name: '松桃苗绣', cat: '传统美术', level: '省级', desc: '松桃苗绣以平绣为主，纹样秀丽，鸽子花、牡丹纹寓意吉祥。' },
        { name: '苗族绝技', cat: '传统体育游艺与杂技', level: '省级', desc: '上刀山、下火海、捞油锅等苗族傩技绝技，惊心动魄。' },
        { name: '苗族四月八', cat: '民俗', level: '省级', desc: '农历四月初八聚会吹笙跳舞，纪念苗族英雄亚努。' }
      ]
    },
    '湘西土家族苗族自治州': {
      id: 'xiangxi',
      tag: '湖南 · 吉首 | 武陵山苗族核心聚居区',
      intro: '湘西是湖南苗族的心脏。凤凰银饰、花垣赶秋、保靖苗画、吉首鼓舞——沈从文笔下的边城山水间，苗文化生生不息。',
      items: [
        { name: '苗族鼓舞', cat: '传统舞蹈', level: '国家级', desc: '湘西苗族鼓舞击鼓起舞，猴儿鼓灵巧、花鼓热烈，庆年节必备。' },
        { name: '苗族民歌（湘西苗族民歌）', cat: '传统音乐', level: '国家级', desc: '湘西苗歌分高腔、平腔，飞歌隔山相答，情歌缠绵。' },
        { name: '苗族银饰锻制技艺', cat: '传统技艺', level: '国家级', desc: '凤凰山江银饰以细如发丝的银丝编掐见长，凤冠流光溢彩。' },
        { name: '苗族赶秋', cat: '民俗', level: '国家级', desc: '花垣立秋赶秋，八人秋千飞旋，舞狮对歌庆丰收。' },
        { name: '苗画', cat: '传统美术', level: '国家级', desc: '保靖苗画源自绣样，设色浓烈，龙凤花鸟皆有苗家解释。' },
        { name: '苗族挑花', cat: '传统美术', level: '国家级', desc: '泸溪踏虎挑花数纱行针，蓝白纹样严整，用于头帕围裙。' }
      ]
    },
    '城步苗族自治县': {
      id: 'chengbu',
      tag: '湖南 · 邵阳 | 湘西南山歌之乡',
      intro: "城步地处湘桂交界越城岭下，苗族与侗、瑶杂居，'六月六'山歌节歌声漫山，苗绣古朴。",
      items: [
        { name: '城步苗族六月六山歌节', cat: '民俗', level: '省级', desc: '农历六月六对歌赛歌，拦门酒迎四方客，山歌数日不散。' },
        { name: '苗绣', cat: '传统美术', level: '省级', desc: '城步苗绣纹样多龙凤与花草，常用于背带、帐檐。' },
        { name: '苗族吊龙舞', cat: '传统舞蹈', level: '省级', desc: '城步吊龙以竹篾扎制，节内燃烛舞动，为祈雨迎祥之舞。' }
      ]
    },
    '恩施土家族苗族自治州': {
      id: 'enshi',
      tag: '湖北 · 恩施 | 鄂西武陵苗乡',
      intro: '恩施州是湖北苗族主要家园，苗族与土家族文化在武陵深山交融，四月八、苗歌、刺绣保有鲜明苗文化底色。',
      items: [
        { name: '苗族四月八', cat: '民俗', level: '省级', desc: '鄂西苗族四月初八祭祖集会，吹芦笙、跳鼓舞、唱苗歌。' },
        { name: '苗族刺绣', cat: '传统美术', level: '省级', desc: '鄂西苗绣融合武陵多民族纹样，衣襟袖边挑花细密。' },
        { name: '苗族民歌', cat: '传统音乐', level: '省级', desc: '鄂西苗歌五声音阶，高腔山歌回荡武陵群山之间。' }
      ]
    },
    '文山壮族苗族自治州': {
      id: 'wenshan',
      tag: '云南 · 文山 | 滇东南苗岭芦笙之乡',
      intro: '文山苗族支系繁多，芦笙舞雄浑刚健，花山节、踩花山是滇东南苗族最盛大的节日，蜡染刺绣五彩斑斓。',
      items: [
        { name: '苗族芦笙舞', cat: '传统舞蹈', level: '国家级', desc: '文山苗族芦笙舞套路众多，祭祀舞庄重、自娱舞奔放。' },
        { name: '苗族花山节', cat: '民俗', level: '省级', desc: '正月踩花山，竖花杆、吹芦笙、爬花杆比赛热闹非凡。' },
        { name: '苗族蜡染刺绣', cat: '传统技艺', level: '省级', desc: '文山苗家百褶裙蜡染点线细密，裙褶如扇，绣片斑斓。' },
        { name: '苗族服饰', cat: '民俗', level: '省级', desc: '花苗、青苗、白苗服饰色谱各异，银泡绣片满头满身。' }
      ]
    },
    '红河哈尼族彝族自治州': {
      id: 'honghe',
      tag: '云南 · 屏边 | 滇南花山节之乡',
      intro: '红河州屏边苗族自治县的花山节已列入国家级非遗，大围山深处苗家芦笙悠扬，是滇南苗族文化的代表。',
      items: [
        { name: '苗族花山节', cat: '民俗', level: '国家级', desc: '屏边苗族花山节正月初举行，祭花杆、对情歌、赛芦笙。' },
        { name: '苗族芦笙舞', cat: '传统舞蹈', level: '省级', desc: '屏边苗族芦笙舞步随曲变，围杆而舞，通宵达旦。' },
        { name: '苗族服饰制作技艺', cat: '传统技艺', level: '省级', desc: '红河苗族服饰以蜡染为底、挑花为饰，制作需经年累月。' }
      ]
    },
    '融水苗族自治县': {
      id: 'rongshui',
      tag: '广西 · 柳州 | 大苗山百节之乡',
      intro: '融水是广西唯一的苗族自治县，贝江绕大苗山而过。正月系列坡会坡坡相连，芦笙斗马节万人空巷。',
      items: [
        { name: '苗族系列坡会', cat: '民俗', level: '国家级', desc: '融水正月十余坡会接力，芦笙踩堂、斗马、芒篙舞连绵不断。' },
        { name: '苗族芦笙斗马节', cat: '民俗', level: '国家级', desc: '芦笙比响与骏马相斗轮番上演，是大苗山最热烈的节庆。' },
        { name: '苗族银饰锻造技艺', cat: '传统技艺', level: '自治区级', desc: '融水苗族银饰重錾花编丝，银雀头饰翎羽摇曳生姿。' },
        { name: '苗族织锦技艺', cat: '传统技艺', level: '自治区级', desc: '大苗山腰机织锦，几何纹样细密，背带心纹样寄寓祝福。' }
      ]
    },
    '彭水苗族土家族自治县': {
      id: 'pengshui',
      tag: '重庆 · 彭水 | 渝东南苗乡门户',
      intro: '彭水是重庆唯一以苗族为主的自治县，乌江画廊之间苗绣雅致、苗歌婉转，踩山节上万人同跳踩花山。',
      items: [
        { name: '苗绣（彭水苗绣）', cat: '传统美术', level: '国家级', desc: '彭水苗绣针法细腻，蝶鸟鱼纹样灵动，靛蓝底上彩线生辉。' },
        { name: '苗族踩山节', cat: '民俗', level: '市级', desc: '立花杆、吹芦笙、跳踩山舞，苗家儿女盛装祈福纳吉。' },
        { name: '苗族民歌（鞍子苗歌）', cat: '传统音乐', level: '市级', desc: '鞍子苗歌高腔婉转，田间地头即兴编唱，情歌尤为动人。' }
      ]
    }
  };

  /* ---------- 2. 引线标注（side：L 左列 / R 右列）
     每条控制在 3 个短词以内：标注栏宽 252px，加上「（国家级）」这类
     括注会换行，短句排出来更整齐 ---------- */
  var CALLOUTS = [
    { region: '恩施土家族苗族自治州',   anchor: [109.49, 30.27], side: 'R', items: ['苗族四月八', '苗绣', '苗族民歌'] },
    { region: '彭水苗族土家族自治县',   anchor: [108.17, 29.29], side: 'R', items: ['彭水苗绣', '踩山节', '鞍子苗歌'] },
    { region: '松桃苗族自治县',           anchor: [109.20, 28.17], side: 'R', items: ['松桃苗绣', '苗族绝技', '四月八'] },
    { region: '湘西土家族苗族自治州',   anchor: [109.74, 28.31], side: 'R', items: ['苗族鼓舞', '赶秋 · 苗画', '银饰 · 挑花'] },
    { region: '黔东南苗族侗族自治州',   anchor: [107.98, 26.58], side: 'R', items: ['姊妹节 · 苗年', '银饰 · 苗绣', '古歌 · 蜡染'] },
    { region: '黔南布依族苗族自治州',   anchor: [107.52, 26.26], side: 'R', items: ['长衫龙芦笙舞', '苗族古歌', '蜡染技艺'] },
    { region: '城步苗族自治县',           anchor: [110.32, 26.39], side: 'R', items: ['六月六山歌节', '苗绣', '吊龙舞'] },
    { region: '融水苗族自治县',           anchor: [109.25, 25.07], side: 'R', items: ['系列坡会', '芦笙斗马节', '织锦 · 银饰'] },
    { region: '四川省',                   anchor: [104.71, 28.45], side: 'L', label: '四川 · 珙县', items: ['苗族蜡染技艺', '苗族古歌'] },
    { region: '黔西南布依族苗族自治州', anchor: [104.90, 25.09], side: 'L', items: ['苗族芦笙舞', '跳花节', '苗族服饰'] },
    { region: '文山壮族苗族自治州',     anchor: [104.22, 23.40], side: 'L', items: ['苗族芦笙舞', '花山节', '蜡染刺绣'] },
    { region: '红河哈尼族彝族自治州',   anchor: [103.68, 22.98], side: 'L', items: ['苗族花山节', '芦笙舞', '服饰技艺'] }
  ];

  /* 省份名单：省级要素单独着色，聚居地用另一种（虚线边） */
  var PROVINCE_NAMES = ['贵州省', '湖南省', '云南省', '广西壮族自治区', '重庆市', '四川省', '湖北省'];
  var SETTLEMENT_NAMES = Object.keys(REGIONS).filter(function (n) {
    return PROVINCE_NAMES.indexOf(n) === -1 && n !== '海南省';
  });

  /* ---------- 3. DOM ---------- */
  var sec = document.getElementById('map-sec');
  if (!sec) return;

  var stageEl = sec.querySelector('.map-stage');
  var mapEl = document.getElementById('map');
  var svgEl = document.getElementById('leader-lines');
  var layerEl = document.getElementById('callout-layer');
  var hainanEl = document.getElementById('hainan-note');
  var loadingEl = document.getElementById('map-loading');
  var errorEl = document.getElementById('map-error');
  var retryEl = document.getElementById('retry-btn');

  var detailEl = document.getElementById('detail');
  var backEl = document.getElementById('back-btn');
  var backWrap = sec.querySelector('.detail__back');
  var dTitle = document.getElementById('detail-title');
  var dTag = document.getElementById('detail-tag');
  var dIntro = document.getElementById('detail-intro');
  var dCards = document.getElementById('detail-cards');
  var dBody = sec.querySelector('.detail__body');

  if (!mapEl || !svgEl || !layerEl || !detailEl) return;

  /* ---------- 4. 状态 ---------- */
  var chart = null;
  var started = false;
  var calloutEls = {};      // region → { el, g, c }
  var lastTrigger = null;

  /* ---------- 5. 工具 ---------- */
  function shortName(n) {
    return n
      .replace(/省|市|壮族自治区|自治区/g, '')
      .replace(/苗族侗族自治州|布依族苗族自治州|土家族苗族自治州|哈尼族彝族自治州|壮族苗族自治州/g, '')
      .replace(/苗族土家族自治县|苗族自治县/g, '');
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function showLoading() {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (errorEl) errorEl.classList.remove('is-open');
  }

  function hideLoading() {
    if (loadingEl) loadingEl.style.display = 'none';
  }

  function showError() {
    if (errorEl) errorEl.classList.add('is-open');
  }

  /* ---------- 6. 资源加载 ---------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('脚本加载失败：' + src)); };
      document.head.appendChild(s);
    });
  }

  function loadEcharts() {
    if (window.echarts) return Promise.resolve(window.echarts);
    return loadScript(ECHARTS_SRC).then(function () {
      if (!window.echarts) throw new Error('echarts 未就绪');
      return window.echarts;
    });
  }

  function loadGeo() {
    return fetch(GEO_SRC, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error('底图加载失败：HTTP ' + res.status);
      return res.json();
    });
  }

  /* ---------- 7. 主流程 ---------- */
  function start() {
    if (started) return;
    started = true;

    showLoading();

    Promise.all([loadEcharts(), loadGeo()])
      .then(function (res) { render(res[1]); })
      .catch(function (err) {
        // 失败后允许用户点「重新加载」再来一次
        started = false;
        hideLoading();
        showError();
        if (window.console) console.error('[map]', err);
      });
  }

  function render(geo) {
    var ec = window.echarts;

    ec.registerMap('miao', geo.miao);
    ec.registerMap('hainan', geo.hainan);

    hideLoading();
    buildChart();
    buildCallouts();

    // 首屏若已经滚到本屏，立刻对齐一次引线，避免等到下一次 resize
    requestAnimationFrame(layoutCallouts);
  }

  function buildChart() {
    var ec = window.echarts;
    var W = mapEl.clientWidth;
    var H = mapEl.clientHeight;
    if (!W || !H) {
      // 容器还没量出尺寸（极少见），下一帧再试
      requestAnimationFrame(buildChart);
      return;
    }

    if (chart) { chart.dispose(); chart = null; }

    chart = ec.init(mapEl, null, { renderer: 'canvas' });

    /* 窄屏（竖屏手机/平板）和矮屏（13 寸笔记本）都算「紧凑档」：
       引线标注不出现，地图可以放大占满，省名用简称。
       本档位与 map.css 的 (max-width:900px), (max-height:700px) 同条件 */
    var narrow = W < 900 || H < 700;
    var layoutSize = narrow ? '94%' : (W >= 1600 ? '90%' : '87%');
    var center = narrow ? ['50%', '50%'] : ['50%', '50.5%'];

    /* 地块配色：省级暗酒红（wine），聚居地亮砖红（brick）+ 虚线边，形成核心区层次。
       底色很深，所以用「暗酒红 + 高一点的不透明度」而不是亮砖红，
       否则整幅图会糊成一大片红，压掉靛蓝的底子 */
    var provinceStyle = {
      areaColor: 'rgba(120, 48, 62, 0.62)',
      borderColor: 'rgba(201, 180, 137, 0.9)',
      borderWidth: 1.2,
      shadowColor: 'rgba(200, 80, 58, 0.32)',
      shadowBlur: 12,
      shadowOffsetY: 6
    };

    var settlementStyle = {
      areaColor: 'rgba(176, 58, 46, 0.72)',
      borderColor: 'rgba(240, 226, 210, 0.85)',
      borderWidth: 1.4,
      borderType: [6, 3],
      shadowColor: 'rgba(220, 100, 70, 0.55)',
      shadowBlur: 14,
      shadowOffsetY: 5
    };

    /* series 绑定 geoIndex 后，区域样式以 geo 组件为准（series.data 里的
       itemStyle 不会覆盖 geo），所以逐区域配色要写进 geo.regions。 */
    var geoRegions = PROVINCE_NAMES.map(function (name) {
      return { name: name, itemStyle: provinceStyle };
    }).concat(SETTLEMENT_NAMES.map(function (name) {
      return { name: name, itemStyle: settlementStyle };
    }));

    /* series 的数据只用于事件与高亮联动，样式交给 geo.regions */
    var mapData = PROVINCE_NAMES.map(function (name) {
      return { name: name, value: 1 };
    }).concat(SETTLEMENT_NAMES.map(function (name) {
      return { name: name, value: 2 };
    }));

    var emphasisStyle = {
      label: { color: '#f6faff', fontSize: 14, fontWeight: 'bold' },
      itemStyle: {
        areaColor: 'rgba(200, 80, 58, 0.82)',
        borderColor: '#f0e2d2',
        borderWidth: 1.8,
        shadowColor: 'rgba(200, 80, 58, 0.9)',
        shadowBlur: 28,
        shadowOffsetY: 4
      }
    };

    chart.setOption({
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: '"Songti SC", "Noto Serif SC", "SimSun", "STSong", serif'
      },
      geo: [
        { /* 下层：偏移投影，做出立体感 */
          map: 'miao',
          roam: false,
          silent: true,
          layoutCenter: [center[0], narrow ? '52.5%' : '53.5%'],
          layoutSize: layoutSize,
          itemStyle: {
            areaColor: 'rgba(4, 12, 24, 0.55)',
            borderColor: 'rgba(4, 12, 24, 0.9)',
            borderWidth: 1,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowBlur: 26,
            shadowOffsetY: 18
          },
          label: { show: false },
          emphasis: { disabled: true },
          z: 1
        },
        { /* 上层：主地图 */
          map: 'miao',
          roam: false,
          silent: false,
          layoutCenter: center,
          layoutSize: layoutSize,
          itemStyle: {
            areaColor: 'rgba(22, 35, 63, 0.62)',
            borderColor: 'rgba(217, 178, 106, 0.85)',
            borderWidth: 1.1,
            shadowColor: 'rgba(0, 0, 0, 0.45)',
            shadowBlur: 16,
            shadowOffsetY: 9
          },
          regions: geoRegions,
          label: {
            show: true,
            color: 'rgba(240, 232, 214, 0.92)',
            fontSize: 11,
            /* series 绑到 geoIndex 时，geo 的 label 优先级高于 series.data.label，
               所以聚居地的名字必须在这里过滤掉，否则十几个州县名会在地图中间叠成一团。
               聚居地名称统一由左右两侧的引线标注呈现。
               窄屏地图小，「广西壮族自治区」这种长名会溢出色块，缩成简称。 */
            formatter: function (p) {
              if (SETTLEMENT_NAMES.indexOf(p.name) !== -1) return '';
              return narrow ? shortName(p.name) : p.name;
            }
          },
          emphasis: emphasisStyle,
          select: { disabled: true },
          z: 2
        }
      ],
      series: [
        {
          type: 'map',
          map: 'miao',
          geoIndex: 1,
          data: mapData,
          z: 2,
          labelLayout: { hideOverlap: true }
        },
        { /* 海南省 · 附图。
             位置压在「引线标注列」的左内侧：标注列从 W-270 起，附图落在
             这条线左边就不会和小字打架；竖直方向贴底，避开左侧来源注记 */
          type: 'map',
          map: 'hainan',
          layoutCenter: ['76%', '88%'],
          layoutSize: narrow ? '11%' : '8%',
          itemStyle: Object.assign({}, provinceStyle, {
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            shadowBlur: 14,
            shadowOffsetY: 8
          }),
          emphasis: emphasisStyle,
          label: { show: false },
          data: [{ name: '海南省', value: 1 }],
          z: 2
        }
      ]
    });

    /* 悬停：地图 ↔ 引线标注 双向联动 */
    chart.on('mouseover', function (p) { if (p.name) setCalloutActive(p.name, true); });
    chart.on('mouseout', function (p) { if (p.name) setCalloutActive(p.name, false); });
    /* 点击 → 打开详情（省级与聚居地同名都在 REGIONS 里） */
    chart.on('click', function (p) {
      if (p.name && REGIONS[p.name]) openDetail(p.name, null);
    });

    observeResize();
  }

  /* ---------- 8. 引线 + 标注 ---------- */
  function buildCallouts() {
    if (!layerEl || !svgEl) return;

    layerEl.innerHTML = '';
    svgEl.innerHTML = '';
    calloutEls = {};

    CALLOUTS.forEach(function (c) {
      var name = c.label || shortName(c.region);

      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'callout co-' + c.side;
      el.setAttribute('aria-label', name + '：' + c.items.join('、') + '，查看非遗条目');
      el.innerHTML =
        '<span class="co-name"><span class="dm"></span>' + esc(name) + '</span>' +
        '<span class="co-items">' + esc(c.items.join(' · ')) + '</span>';

      el.addEventListener('mouseenter', function () {
        setCalloutActive(c.region, true);
        if (chart) chart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: c.region });
      });
      el.addEventListener('mouseleave', function () {
        setCalloutActive(c.region, false);
        if (chart) chart.dispatchAction({ type: 'downplay', seriesIndex: 0, name: c.region });
      });
      el.addEventListener('focus', function () { setCalloutActive(c.region, true); });
      el.addEventListener('blur', function () { setCalloutActive(c.region, false); });
      el.addEventListener('click', function () { openDetail(c.region, el); });

      layerEl.appendChild(el);

      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '3.5');
      g.appendChild(path);
      g.appendChild(dot);
      svgEl.appendChild(g);

      calloutEls[c.region] = { el: el, g: g, c: c };
    });

    layoutCallouts();
  }

  function setCalloutActive(region, on) {
    var rec = calloutEls[region];
    if (!rec) return;
    rec.el.classList.toggle('is-active', on);
    rec.g.classList.toggle('is-active', on);
  }

  function layoutCallouts() {
    if (!chart || !svgEl) return;

    var W = mapEl.clientWidth;
    var H = mapEl.clientHeight;
    if (!W || !H) return;

    svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    /* 窄屏 / 矮屏标注整体隐藏（CSS 里同一条件也隐藏了），不必算坐标。
       阈值必须和 map.css 的媒体查询一致 */
    if (W < 900 || H < 700) return;

    var LABEL_W = 252;
    var MARGIN = 18;
    var STUB = 16;
    var groups = { L: [], R: [] };

    Object.keys(calloutEls).forEach(function (key) {
      var rec = calloutEls[key];
      var p = chart.convertToPixel({ geoIndex: 1 }, rec.c.anchor);
      var ok = p && isFinite(p[0]) && isFinite(p[1]);

      rec.el.style.display = ok ? '' : 'none';
      rec.g.style.display = ok ? '' : 'none';
      if (ok) groups[rec.c.side].push({ rec: rec, ax: p[0], ay: p[1] });
    });

    ['L', 'R'].forEach(function (side) {
      var arr = groups[side].sort(function (a, b) { return a.ay - b.ay; });
      var n = arr.length;
      if (!n) return;

      /* 底部要给来源注记（左下）和海南附图说明（右下）让出位置，
         否则最下面一两个标注会压在它们身上 */
      var top = 30;
      var bottom = H - 112;

      arr.forEach(function (g, i) {
        /* 沿侧边均匀分布，并保持与锚点相同的上下顺序 */
        var ly = n === 1 ? g.ay : top + (bottom - top) * i / (n - 1);
        var lx = side === 'L' ? MARGIN : W - MARGIN - LABEL_W;

        g.rec.el.style.left = lx + 'px';
        g.rec.el.style.top = ly + 'px';

        /* 引线：标注边缘 → 短横线 → 锚点 */
        var cx = side === 'L' ? lx + LABEL_W : lx;
        var bendX = side === 'L' ? cx + STUB : cx - STUB;
        g.rec.g.querySelector('path').setAttribute(
          'd', 'M ' + cx + ' ' + ly + ' L ' + bendX + ' ' + ly + ' L ' + g.ax + ' ' + g.ay
        );
        var dot = g.rec.g.querySelector('circle');
        dot.setAttribute('cx', g.ax);
        dot.setAttribute('cy', g.ay);
      });
    });
  }

  /* ---------- 9. 尺寸变化 ---------- */
  var resizeTimer = 0;
  function onResize() {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(function () {
      resizeTimer = 0;
      if (!chart) return;
      chart.resize();
      layoutCallouts();
    });
  }

  var observed = false;
  function observeResize() {
    if (observed) return;
    observed = true;

    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(onResize).observe(mapEl);
    } else {
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
    }
  }

  /* ---------- 10. 详情浮层 ---------- */
  /* 详情层在 .map-stage 之外，所以直接把整个舞台置 inert 就够了，
     Tab 键不会跑到浮层后面的地图与标注上 */
  function setStageInert(on) {
    if (!stageEl) return;
    if (on) stageEl.setAttribute('inert', '');
    else stageEl.removeAttribute('inert');
  }

  function openDetail(regionName, trigger) {
    var r = REGIONS[regionName];
    if (!r) return;

    lastTrigger = trigger || null;

    dTitle.textContent = regionName;
    dTag.textContent = r.tag;
    dIntro.textContent = r.intro;
    dCards.innerHTML = r.items.map(function (it) {
      return '<article class="m-card">' +
          '<h4>' + esc(it.name) + '</h4>' +
          '<div class="m-tags">' +
            '<span class="m-tag m-tag--level">' + esc(it.level) + '</span>' +
            '<span class="m-tag">' + esc(it.cat) + '</span>' +
          '</div>' +
          '<p>' + esc(it.desc) + '</p>' +
        '</article>';
    }).join('');

    detailEl.classList.add('is-open');
    detailEl.setAttribute('aria-hidden', 'false');
    setStageInert(true);
    if (dBody) dBody.scrollTop = 0;

    // 焦点交给返回键：键盘用户按回车即可退出，Esc 亦可
    if (backWrap && backWrap.focus) backWrap.focus({ preventScroll: true });
  }

  function closeDetail() {
    if (!detailEl.classList.contains('is-open')) return;

    detailEl.classList.remove('is-open');
    detailEl.setAttribute('aria-hidden', 'true');
    setStageInert(false);

    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }

  if (backEl || backWrap) {
    (backWrap || backEl).addEventListener('click', closeDetail);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') closeDetail();
  });

  if (hainanEl) {
    hainanEl.addEventListener('click', function () { openDetail('海南省', hainanEl); });
  }

  if (retryEl) {
    retryEl.addEventListener('click', function () {
      // 先释放旧实例再清空容器，否则 echarts 会在同一 DOM 上重复初始化并告警
      if (chart) { chart.dispose(); chart = null; }
      mapEl.innerHTML = '';
      started = false;
      start();
    });
  }

  /* ---------- 11. 懒加载：滚到附近才下载 echarts 与底图 ---------- */
  if (typeof IntersectionObserver === 'function') {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          io.disconnect();
          start();
          return;
        }
      }
    }, { rootMargin: '400px 0px' });
    io.observe(sec);
  } else {
    start();
  }
})();
