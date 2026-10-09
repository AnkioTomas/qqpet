import { aiOn, askAs } from '../pet/ai'
import { dayText } from '../pet/calendar'
import EXAM from '../pet/data/exam.json'
import { allGoods, findGood, parseGood, type Good, type GoodType } from '../pet/data/goods'
import { hasGood, listGoods, takeGood } from '../pet/goods'
import { give } from '../pet/items'
import { loot } from '../pet/loot'
import { rand } from '../pet/rand'
import { info, save, update } from '../pet/store'
import { count, type Counter } from '../pet/tasks'
import { dayStart } from '../pet/vip'
import { openBox } from './box'
import './css/island.css'
import { button, div, img } from './dom'
import { TALK } from './island-talk'
import { openShop, SOLD } from './shop'
import { openTask } from './task'

const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]
/** One line of `pool` with its {slots} filled; {pet} is the pet's name. */
const say = (pool: readonly string[], slots: Record<string, string | number> = {}): string =>
  pick(pool).replace(/\{(\w+)\}/g, (_, k: string) => String({ pet: info.name, ...slots }[k]))
const shuffle = <T>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

const PLACES: Record<number, string> = {
  3: '夏帕海岸',
  5: '粉钻雪山',
  7: '竞技场',
  8: '超级游乐场',
  13: '百货店',
  15: '小学课堂',
  16: '生日屋',
  18: '教堂',
  20: '咖啡厅',
  21: '古堡森林',
  22: '风语广场',
  23: '神秘岛',
  26: '粉钻度假村',
  27: '神秘湖',
  29: '神秘湖底',
  30: '东郊荒地',
  31: '天剑峰',
  32: '昆仑顶',
}

/**
 * Islanders whose own pages are gone, known by a piece of their URL. They get 布袋长老's
 * letters and hand out errands; `about` is what their old page and place suggest.
 */
const FOLK: Record<string, { key: string; scene: number; about: string }> = {
  莉莉: { key: 'npc_lili', scene: 3, about: '在海边长大的小姑娘，爱捡贝壳' },
  探险家琼斯: { key: 'npc_qiongsi', scene: 3, about: '走遍全岛的探险家，总在找宝藏' },
  游乐场管理员: { key: 'npc_ylcManage', scene: 3, about: '管着岛上的游乐设施，做事认真' },
  杰里: { key: 'npc_jl.html', scene: 3, about: '爱运动，天天组织接力赛' },
  亮亮: { key: 'npc_liangliang', scene: 5, about: '雪山上的滑雪高手' },
  管家苔丝: { key: 'npc_gjds', scene: 5, about: '宝贝旅店的管家，细心周到' },
  伊苏: { key: 'npc_ys.html', scene: 5, about: '住在雪山脚下，喜欢照顾别人' },
  周大饼: { key: 'npc_zhoudabing', scene: 13, about: '百货店老板，精打细算' },
  珍尼花: { key: 'petstudy', scene: 15, about: '小学课堂的老师，温柔又严格' },
  蓉蓉: { key: 'birthday_house', scene: 16, about: '生日屋的主人，最爱给大家过生日' },
  神父特里斯坦: { key: 'unmarry', scene: 18, about: '教堂的神父，慈祥和蔼' },
  凯茜: { key: 'cgi-bin/register', scene: 18, about: '在教堂负责婚礼登记' },
  梅奥: { key: 'jiaotang/3', scene: 18, about: '教堂的帮工，热心肠' },
  翠花: { key: 'Dish.html', scene: 20, about: '咖啡厅的厨师，端盘子又快又稳' },
  佐佐: { key: 'kf_index', scene: 20, about: '咖啡厅的店长，爱煮咖啡' },
  亚瑟: { key: 'ore2weapon', scene: 21, about: '古堡森林里的铁匠，会用矿石打兵器' },
  木木: { key: 'npc_mumu', scene: 22, about: '风语广场上的小吃货' },
  赛孔明: { key: 'npc_saikm', scene: 22, about: '自称能掐会算的军师' },
  露西卡: { key: 'npc_luxika', scene: 22, about: '会做魔法点心的小魔女' },
  监狱长: { key: 'npc_jianyuzhang', scene: 22, about: '管着广场的秩序，说话一板一眼' },
  精灵乐乐: { key: 'npc_jlll', scene: 22, about: '爱玩爱闹的小精灵' },
  智慧长老: { key: 'npc_xogame', scene: 22, about: '学问渊博，爱下棋出谜题' },
  多多: { key: 'newterm', scene: 22, about: '刚升了年级的小学生' },
  蒙奇: { key: 'x_zwg', scene: 3, about: '天天拉人抽乌龟，可总抽不到想要的那张牌' },
  酷迪: { key: 'qq_cl', scene: 3, about: '爱冲浪的酷小子，嫌一切都不够刺激' },
  桑尼夫人: { key: 'fzds', scene: 5, about: '自称岛上最最最富有的贵妇，粉钻俱乐部的会长，爱炫耀包包' },
  迪利: { key: 'dilidaren', scene: 22, about: '自封“达人”，什么都想比一比' },
  红冠国王: { key: 'huanjiazhanqi', scene: 22, about: '和蓝冠国王打了好多年仗的棋盘国王，嘴上从不服输' },
  杰无双: { key: 'qqxpk', scene: 22, about: '属性擂台的主持人，说话像说书，口头禅是“天下英雄”' },
  嘟嘟: { key: 'juebandiy', scene: 22, about: '会用农场渔场的材料亲手做绝版物品的手艺人' },
  唐三藏: { key: 'xyjj', scene: 22, about: '很帅很萌的唐三藏，总担心被妖怪抓去吃了' },
  兰兰: { key: 'guoqing2011', scene: 22, about: '闯关高手，爱问别人敢不敢一口气通十关' },
  闹闹: { key: 'cookies', scene: 22, about: '开曲奇店的小姑娘，烤饼干的手艺一流' },
  口袋精灵: { key: 'octhappygive', scene: 22, about: '口袋里装满礼物、到处送欢乐的小精灵' },
  贝松: { key: 'element_mill', scene: 22, about: '元素师，会分解、炼化各种东西' },
  魔幻人鱼: { key: '20111110mhdl', scene: 22, about: '从魔幻大陆游来的人鱼，想家的时候就去神秘湖' },
  丘比特: { key: 'singlesday', scene: 22, about: '背着弓箭的小爱神，专给单身的企鹅牵红线' },
  炫舞小妖: { key: 'x5/index', scene: 22, about: '爱跳舞的小妖，走到哪儿跳到哪儿' },
  洛克大使: { key: '20111124roco', scene: 22, about: '洛克王国派来的大使，嗓门大，爱搞活动' },
  恩恩: { key: '20111124td', scene: 22, about: '爱做爱心卡送人的暖心小企鹅' },
  占星师: { key: 'qq_xzmy', scene: 22, about: '神神秘秘的占星师，在找一颗“永恒之星”' },
  爽爽: { key: 'summer_shop', scene: 22, about: '开夏日冰爽店，一年四季都卖冷饮' },
  机器宝宝: { key: 'jqbb3in1', scene: 22, about: '说话一顿一顿的机器宝宝，爱算数' },
  T仔: { key: 'tnt_qianhao', scene: 22, about: '爱玩火药的爆破小子，整天喊“火力全开”' },
  克鲁尼: { key: 'qq_mffw', scene: 26, about: '度假村的服务生，管吃管洗' },
  阿梅: { key: 'fz_bbkz', scene: 26, about: '度假村的托管员，帮大家照看宠物' },
  琪琪: { key: 'qq_vipdj', scene: 26, about: '度假村服装店的店员，爱打扮' },
}
const FOLKS = Object.keys(FOLK)
const SENDERS = ['小艾', '图图', '天使坏坏', '摩西', '菜菜', '融少', '饭饭']
const LETTERS = 5

/** Where a hiding islander is, told as a riddle. */
const HINTS: Record<number, string> = {
  3: '我躲在听得见海浪、脚下全是沙子的地方',
  5: '这里冷得我直打哆嗦，四下白茫茫一片',
  7: '四周全是看台，大家都在这儿比武斗蔬菜',
  8: '我身边全是旋转木马和尖叫声',
  13: '我藏在货架后面，周围全是吃的用的',
  15: '我坐在一排排小课桌中间，黑板就在前面',
  16: '这里到处是蛋糕和彩带，天天有人许愿',
  18: '我躲在敲钟的地方，常有企鹅在这里结婚',
  20: '这里飘着咖啡香，盘子叮叮当当响',
  21: '大树把天都遮住了，林子深处有座老城堡',
  22: '我就在风最大、企鹅最多的地方',
  23: '坐船才到得了这座小岛，岛上的秘密谁也说不清',
  26: '我泡在暖暖的温泉边，抬头就是雪山',
  27: '湖水静悄悄的，听说水底住着精灵',
  29: '头顶是湖水，身边游着小鱼，我憋着气呢',
  30: '这里荒得很，风一吹全是沙土',
  31: '山尖像一把插在地上的剑，风里都是剑气',
  32: '比雪山还高还冷，脚下就是云',
}
/** Community games an islander may ask you to play, by SWF. */
const PLAYS: Record<string, string> = {
  QQ跆拳道: '跆拳道',
  Q宠搭积木: '搭积木',
  QQ端盘子: '端盘子',
  QQ好好学习: '好好学习',
  '冒险岛系列/1起航': '冒险岛',
  满天星: '满天星',
  Q宠邀你来找茬: '找茬',
  Q宠守护使: '守护使',
  QQ煎饼摊: '煎饼摊',
  QQ宠物摘星星: '摘星星',
  QQ宠物泡泡: '泡泡',
}
/** Island sights by a piece of their URL: what an errand asks there, and what the pet finds when it looks. */
const SPOTS: Record<string, { name: string; what: string; lines: string[] }> = {
  pet_carnival: {
    name: '嘉年华',
    what: '去夏帕海岸的嘉年华凑凑热闹',
    lines: [
      '嘉年华的彩车还停在沙滩上，音乐一响，大家都跳起舞来。',
      '小丑往你手里塞了一个气球，又翻着跟头跑远了。',
      '套圈摊的老板冲你招手：“三个圈，套中就送大熊！”',
      '彩带从天上飘下来，正好落在你的头顶。',
      '一群企鹅排着队跳兔子舞，你也被拉了进去。',
      '棉花糖机呼呼转着，空气里全是甜甜的味道。',
      '魔术师从帽子里掏出一只小海鸥，大家都看呆了。',
      '踩高跷的叔叔弯下腰，跟你击了个掌。',
      '烟花在海面上炸开，把沙滩照得亮堂堂的。',
      '旋转木马叮叮当当地转，一圈又一圈。',
    ],
  },
  jycat: {
    name: '监狱猫',
    what: '抓住逃出来的监狱猫，它常在夏帕海岸和粉钻雪山出没',
    lines: [
      '喵呜！被你发现了……好吧好吧，我自己走回去。',
      '监狱猫舔舔爪子：“外面的鱼干就是比牢饭香。”说完乖乖跟你走了。',
      '监狱猫正趴在沙滩上晒太阳，被你一把抱了起来。',
      '雪地里一串小梅花脚印，尽头蹲着一只瑟瑟发抖的监狱猫。',
      '监狱猫叼着一条小鱼想跑，被你堵在了墙角。',
      '“喵！我只是出来散散步！”监狱猫心虚地说。',
      '你学了一声猫叫，监狱猫好奇地从草丛里探出头来。',
      '监狱猫冻得直打喷嚏，自己钻进了你的怀里。',
      '你掏出一根逗猫棒，监狱猫立刻扑了过来。',
      '监狱猫叹了口气：“自由的日子总是这么短。”',
    ],
  },
  'treasure_map?cmd=6': {
    name: '藏宝点',
    what: '去粉钻雪山或风语广场找一个地上冒泡泡的藏宝点挖一挖',
    lines: [
      '挖呀挖，挖出一枚亮晶晶的贝壳……可惜不值钱。',
      '泡泡咕嘟一声，冒出一张纸条：“宝藏在图图那儿。”',
      '挖出一只生锈的小铁盒，里面空空的，只有一股海风味。',
      '铲子碰到了硬东西——原来是一块圆溜溜的石头。',
      '挖出一枚旧硬币，上面刻着一只企鹅的头像。',
      '泡泡越冒越多，最后冒出一只迷路的小螃蟹。',
      '挖到一个玻璃瓶，里面卷着一张写着“加油”的纸条。',
      '挖了半天只挖出一只袜子，不知道是谁埋的。',
      '土里埋着一颗闪闪发亮的玻璃珠，真好看。',
      '挖出了一张藏宝图的边角，上面画着半个红叉叉。',
    ],
  },
  'treasure_map/index': {
    name: '魔法宝箱',
    what: '去风语广场摸一摸魔法宝箱',
    lines: [
      '魔法宝箱闪了一下光，咔哒一声又锁上了。',
      '宝箱里传出小声的嘀咕：“明天再来，明天再来。”',
      '你一摸宝箱，箱盖上的星星图案就亮了起来。',
      '宝箱打了个嗝，吐出一颗水果糖。',
      '宝箱上的锁眼眨了眨，好像在对你笑。',
      '宝箱微微发烫，里面有什么东西在叮当作响。',
      '你敲了敲宝箱，里面回了一声：“谁呀？”',
      '宝箱冒出一串彩色泡泡，飘得满广场都是。',
      '宝箱的锁转了半圈，又不情愿地转了回去。',
      '宝箱上刻着一行小字：心诚则开。',
    ],
  },
  pk_wdh: {
    name: '天下第一武道会',
    what: '去竞技场给天下第一武道会报个名',
    lines: [
      '报名簿上又多了一个名字，下一届比赛就等你上场了！',
      '台上两只企鹅正打得难解难分，台下喊声一片。',
      '报名处的裁判给你发了一个号码牌：第88号。',
      '你在报名表上按了一个小脚印，算是签名啦。',
      '去年的冠军路过，拍拍你的肩膀：“加油哦！”',
      '擂台边挂满了历届冠军的照片，看得你热血沸腾。',
      '裁判吹了一声哨子，又一场比赛开始了。',
      '报名的队伍排得老长，大家都在活动手脚。',
      '有只企鹅在台上摔了个屁股墩，全场都笑了。',
      '你对着擂台比划了两下，感觉自己也能行！',
    ],
  },
  pk_zq: {
    name: 'PK世界杯',
    what: '去竞技场看一场PK世界杯',
    lines: [
      '球进啦！看台上的企鹅全都站起来欢呼。',
      '守门员一个飞扑，把球稳稳抱住了。',
      '前锋一脚射门，球打在门柱上弹了回来。',
      '看台上掀起了人浪，你也跟着举起了翅膀。',
      '裁判掏出一张黄牌，场上一片嘘声。',
      '中场休息，啦啦队跳起了企鹅舞。',
      '比分一比一，最后一分钟谁也不敢松懈。',
      '一记漂亮的倒挂金钩，全场都惊呆了！',
      '你旁边的企鹅激动得把爆米花撒了一地。',
      '点球大战开始了，大家紧张得捂住了眼睛。',
    ],
  },
  pk_scdz: {
    name: '蔬菜大作战',
    what: '去竞技场参加蔬菜大作战',
    lines: [
      '一颗番茄啪地砸过来，你一闪身躲开了！',
      '萝卜队和白菜队打成了平手，满地都是菜叶。',
      '你抓起一根黄瓜当宝剑，冲进了战场。',
      '一颗土豆骨碌碌滚到你脚边，你顺手扔了回去。',
      '茄子队派出了秘密武器：一个超大的南瓜！',
      '你被一片生菜叶糊了一脸，大家都笑了。',
      '玉米粒像下雨一样噼里啪啦落下来。',
      '你躲在一棵大白菜后面，偷偷瞄准了对面。',
      '辣椒队一出场，对面就辣得直掉眼泪。',
      '比赛结束，大家一起把蔬菜捡起来煮了一锅汤。',
    ],
  },
  x_cgdb: {
    name: '闯关夺宝',
    what: '去竞技场或超级游乐场试试闯关夺宝的机关',
    lines: [
      '机关咔咔转了一圈，一切正常。',
      '第一关的翻板有点松，记下来告诉管理员。',
      '你踩上跷跷板，另一头的沙袋一下子弹了起来。',
      '摇摆的吊桥晃得厉害，你张开翅膀才站稳。',
      '旋转的大风车差点把你扫下去，好险！',
      '第三关的弹簧床弹得你翻了两个跟头。',
      '你钻过一条长长的管道，出来时满身都是灰。',
      '滚石机关轰隆隆地滚过，你赶紧趴了下来。',
      '终点的铃铛被你一按，叮铃铃响个不停。',
      '你在滑梯上滑得太快，一头扎进了海洋球池。',
    ],
  },
  'coffee/food_index': {
    name: '咖啡厅的点心',
    what: '去咖啡厅尝一尝桌上的点心',
    lines: [
      '甜甜的，还带一点咖啡香，好吃！',
      '这块有点烤焦了，不过不能告诉翠花。',
      '奶油蛋糕软软的，一口下去满嘴都是奶香。',
      '这块饼干硬得像石头，差点硌着牙。',
      '蓝莓挞酸酸甜甜的，你忍不住又吃了一块。',
      '巧克力慕斯入口即化，好吃得眯起了眼睛。',
      '这块面包里藏着一颗整颗的栗子，惊喜！',
      '布丁晃来晃去，你追着它吃了半天。',
      '这块蛋糕咸咸的……翠花大概把盐当成糖了。',
      '抹茶卷有点苦，配上一口牛奶刚刚好。',
    ],
  },
  qq_sgbb: {
    name: '水果冰淇淋',
    what: '去粉钻雪山买一支水果冰淇淋',
    lines: [
      '冰淇淋上堆满了水果，在雪山上吃居然一点也不冷。',
      '草莓味的冰淇淋上插着一片薄荷叶，好看又好吃。',
      '你咬了一大口，冰得直跺脚。',
      '芒果冰淇淋化得太快，滴了一翅膀。',
      '老板多给你加了一勺，说是今天的第一百位客人。',
      '冰淇淋上的樱桃骨碌碌滚进了雪地里。',
      '西瓜味的冰淇淋，吃起来像在过夏天。',
      '你一边滑雪一边吃，冰淇淋全糊到了嘴巴上。',
      '蓝莓冰淇淋把你的舌头染成了紫色。',
      '雪山上的冰淇淋，连蛋筒都是脆脆凉凉的。',
    ],
  },
  phb_Top: {
    name: '名宠俱乐部',
    what: '去风语广场的名宠俱乐部看看排行榜',
    lines: [
      '排行榜上的名字一个比一个厉害，总有一天会有你的。',
      '榜首的宠物照片闪闪发光，旁边围了一圈企鹅。',
      '你踮起脚找了半天，没找到自己的名字。',
      '俱乐部的门口挂着一块牌子：名宠专用通道。',
      '一只戴墨镜的企鹅从俱乐部里走出来，酷极了。',
      '排行榜刚刚刷新，第三名和第四名换了位置。',
      '你对着排行榜默默许愿：明年我也要上榜！',
      '俱乐部里传来阵阵掌声，好像在颁奖。',
      '排行榜下面有一行小字：努力的宠物最可爱。',
      '你数了数，榜上有好多都是你认识的名字。',
    ],
  },
  qq_cjxt: {
    name: '成就树',
    what: '去风语广场给成就树浇浇水',
    lines: [
      '成就树的叶子沙沙响，好像又长高了一点。',
      '你浇完水，树枝上冒出了一个小小的嫩芽。',
      '成就树上挂满了大家的愿望卡，在风里轻轻摇。',
      '一片金色的叶子飘下来，落在你的手心里。',
      '树下有只松鼠探出头，冲你吱吱叫了两声。',
      '你给成就树唱了一首歌，树叶好像在跟着打拍子。',
      '水一浇下去，树根那儿冒出几朵小蘑菇。',
      '成就树开出了几朵白色的小花，香香的。',
      '树干上刻着好多名字，你也想把自己的刻上去。',
      '一阵风吹过，成就树像在对你点头道谢。',
    ],
  },
  tiaoshui: {
    name: '跳水台',
    what: '去风语广场的跳水台跳一次水',
    lines: [
      '扑通！水花溅得老高，围观的企鹅都鼓起掌来。',
      '你在空中转了一圈半，稳稳地扎进了水里。',
      '站在跳台上往下看，腿有点发软……还是跳了！',
      '一个漂亮的燕式跳水，裁判举起了满分牌。',
      '你肚皮先着地，啪的一声，水花溅了评委一身。',
      '水里凉丝丝的，你游了一圈才舍得上岸。',
      '跳台旁边的企鹅齐声倒数：三、二、一，跳！',
      '你抱着膝盖跳了个炸弹式，溅起的水花像喷泉。',
      '从水里钻出来，发现帽子还在跳台上。',
      '跳完一次还不过瘾，你又排到了队伍后面。',
    ],
  },
  'attribute_pk/pk.html': {
    name: '属性擂台',
    what: '去风语广场的属性擂台上站一站',
    lines: [
      '站上擂台，四周顿时安静了，大家都在看你。',
      '杰无双高喊：“天下英雄，又来一位！”',
      '擂台边的大屏幕亮了，上面显示着你的属性。',
      '台下有企鹅喊你的名字，给你加油打气。',
      '你摆了一个威风的姿势，闪光灯咔嚓咔嚓响。',
      '擂台的地板软软的，踩上去有点弹。',
      '对面的空位上写着：虚位以待，等你来战。',
      '你在擂台上转了一圈，向四面八方挥挥手。',
      '一阵风吹过，擂台的大旗呼啦啦地飘。',
      '站在擂台中央，你觉得自己高大了好多。',
    ],
  },
  qq_ggw: {
    name: '农场灌溉王',
    what: '去粉钻度假村帮农场浇浇水',
    lines: [
      '一桶水浇下去，小苗都抬起头来了。',
      '你拿着小喷壶，一垄一垄慢慢地浇。',
      '水渠被一块石头堵住了，你把它搬开，水哗哗流了过去。',
      '浇完水的菜地亮晶晶的，叶子上挂着小水珠。',
      '一只青蛙从菜叶下跳出来，吓了你一跳。',
      '你不小心踩进泥坑，溅了一身的泥点子。',
      '番茄红了好几个，农场主说等会儿摘给你吃。',
      '水管突然喷水，把你浇成了落汤企鹅。',
      '小黄瓜刚开出黄色的小花，你给它多浇了一点。',
      '浇完最后一块地，太阳正好落山。',
    ],
  },
  qq_zjps: {
    name: '杂技抛伞',
    what: '去粉钻度假村看杂技抛伞',
    lines: [
      '一把把小伞被抛上天，又稳稳落回杂技演员手里。',
      '演员用脚尖转着一把伞，伞上还站着一只小鸟。',
      '五把伞同时在空中飞，看得你眼花缭乱。',
      '一把伞没接住，落在了你的头上，大家都笑了。',
      '演员把伞抛给你，你手忙脚乱地接住了！',
      '彩色的伞在空中转成了一朵大花。',
      '演员蒙着眼睛抛伞，一把都没掉。',
      '最后一招，演员撑着伞从高台上慢慢飘了下来。',
      '你跟着节奏拍手，演员冲你眨了眨眼。',
      '演出结束，演员们撑着伞一起向大家鞠躬。',
    ],
  },
  qqbsg: {
    name: 'QQ搬水果',
    what: '去粉钻度假村帮忙搬水果',
    lines: [
      '搬完一筐苹果，果农塞给你一个最大最红的。',
      '一筐橘子太重了，你推着它一路滚了过去。',
      '西瓜圆滚滚的，抱在怀里像抱着一个大皮球。',
      '香蕉一串一串的，你挂在脖子上搬了好几趟。',
      '葡萄差点被你挤破，赶紧放轻了动作。',
      '搬着搬着，你偷偷尝了一颗草莓，好甜！',
      '果筐翻了，苹果滚了一地，大家一起帮你捡。',
      '你把水果码得整整齐齐，果农直夸你能干。',
      '菠萝扎得你翅膀痒痒的，你忍不住笑出了声。',
      '最后一筐搬完，你累得坐在了水果堆上。',
    ],
  },
}
/** The wilds' monsters by their old page's id: name, scene and what they are like. Tougher as the id grows. */
const MONSTERS: Record<string, [string, number, string]> = {
  1: ['狗妖', 30, '东郊荒地最弱的小妖，爱虚张声势，一吓就跑'],
  2: ['树精', 30, '慢吞吞的老树成精，最烦别人踩它的根'],
  3: ['狗贼', 30, '背着包袱的小毛贼，偷了东西就往荒地里藏'],
  4: ['枯藤精', 30, '浑身枯藤，爱用藤条绊人'],
  5: ['野猪精', 30, '横冲直撞的大块头，做梦都想吃唐僧肉'],
  6: ['鬼灯笼', 30, '夜里飘来飘去的灯笼妖，爱装神弄鬼吓唬人'],
  7: ['花妖', 30, '开得最艳的花成了精，自恋又小气，不许人摘花'],
  8: ['豹妖', 30, '跑得飞快的豹子精，看不起慢吞吞的企鹅'],
  9: ['虎头领', 30, '虎王手下的头领，嗓门大，爱摆架子'],
  10: ['狗仔队', 30, '一群举着相机的狗妖，到处偷拍别人的糗事'],
  11: ['虎王', 30, '东郊荒地的霸主，自称天下第一'],
  13: ['雪猿', 30, '从雪山下来的白毛猿，力气大，脾气暴'],
  14: ['云兽', 30, '腾云驾雾的怪兽，最爱遮住星星和太阳'],
  15: ['香炉精', 30, '庙里的老香炉成了精，一生气就喷香灰'],
  16: ['石狮精', 30, '守门的石狮子成了精，又硬又倔'],
  17: ['雪妖', 32, '昆仑顶上的雪妖，一口气能把人冻成冰棍'],
  18: ['冰魂', 32, '千年寒冰化成的魂魄，冷冰冰不爱说话'],
  19: ['玄猴', 31, '天剑峰上的灵猴，身手敏捷，爱捉弄人'],
  20: ['剑魂', 31, '古剑里的剑灵，只服比它更强的剑客'],
  29: ['幻境', 31, '会变出幻象迷惑人的妖境，真真假假分不清'],
  30: ['玲珑塔', 30, '一层比一层难闯的妖塔，塔顶住着最厉害的妖王'],
}
/** Ways to take a monster on: the stat each leans on, said, and what the pet does with it when there is no AI. */
const TACTICS = {
  硬拼: {
    stat: 'strong',
    said: '武力',
    moves: [
      '使出企鹅旋风踢',
      '一记肚皮撞飞了过去',
      '抡起翅膀连拍三下',
      '助跑三步，来了个飞身扑',
      '扎稳马步，一拳打了出去',
      '抱住它的腿想把它摔倒',
      '用脑门结结实实顶了过去',
      '跳起来使出一招泰山压顶',
      '连踢带踹，打出一套组合拳',
      '滑着肚皮冲过去撞它的脚',
    ],
  },
  智取: {
    stat: 'intel',
    said: '智力',
    moves: [
      '假装逃跑，绕到背后偷袭',
      '出了一道谜题把它绕晕了',
      '挖了个小坑等它掉进去',
      '指着它身后大喊“看，飞碟！”',
      '在地上撒了一把滑溜溜的豆子',
      '学它的样子说话，把它弄糊涂了',
      '用树枝和藤条做了个小陷阱',
      '躲在石头后面扔小石子引开它',
      '算准了它的步子，提前躲开',
      '借着太阳光晃它的眼睛',
    ],
  },
  说服: {
    stat: 'charm',
    said: '魅力',
    moves: [
      '递上一块小饼干套近乎',
      '眨着大眼睛讲道理',
      '唱了一首歌给它听',
      '夸它的毛色真漂亮',
      '跳了一段可爱的企鹅舞',
      '讲了一个好笑的故事',
      '拉着它的爪子说想交个朋友',
      '送上一朵刚摘的小花',
      '给它讲为什么不要欺负别人',
      '撒娇说自己只是路过',
    ],
  },
} as const
type Tactic = keyof typeof TACTICS
/** Chance to beat a monster with a tactic: at least even for the weakest one, falling with the square of its id. */
const odds = (id: string, t: Tactic): number => (info[TACTICS[t].stat] + 10) / (info[TACTICS[t].stat] + 10 + 10 * Number(id) ** 2)
const best = (id: string): number => Math.max(...(Object.keys(TACTICS) as Tactic[]).map((t) => odds(id, t)))
const BEATABLE = 0.5
/** Below these odds a win is an upset. */
const UPSET = 0.35
/** Data/Animation banners and the faces in Data/face/play. */
const FX = { win: 5, upset: 6, hundred: 4, lose: 7, fireworks: 1 }
const FACE = { happy: 2, cry: 3, sweat: 8 }
/** The tower at the top of the wilds; beating it sets off fireworks. */
const TOWER = '30'
/** Set by the community while it is open: plays a banner over the pet, shows a face on it. */
export const stage = { play: (_n: number): void => {}, face: (_n: number): void => {} }
/** A fight told without AI: what the monster says and does, and how it ends. */
/** Desktop things an islander may ask for, by the day's counter: said, and at most how many times. */
const CHORES: Partial<Record<Counter, [string, number]>> = {
  Work: ['去打工', 2],
  Study: ['去上课学习', 2],
  Travel1: ['出门旅游', 2],
  Eat: ['吃东西', 3],
  Clean: ['洗澡清洁', 3],
  Toy: ['玩玩具', 3],
  GameRound: ['玩小游戏', 3],
}
const chore = (to: string): [Counter, number] => {
  const [obj, n] = to.split(':')
  return [obj as Counter, Number(n)]
}
/** Any one of a kind of good will do. */
const GIFTS: Record<string, string> = { food: '好吃的', toy: '好玩的玩具', clean: '清洁用品' }
/** How the pet should come back: the stat at CARE of its max, as said and as named. */
const CARES = {
  hunger: ['吃得饱饱的', '饱食', 'hungerMax'],
  clean: ['洗得干干净净', '清洁', 'cleanMax'],
  mood: ['开开心心', '心情', 'moodMax'],
} as const
type Care = keyof typeof CARES
const CARE = 0.8
const hours = (to: string): number[] => to.split('-').map(Number)

type Kind = 'talk' | 'bring' | 'visit' | 'chat' | 'quiz' | 'seek' | 'play' | 'care' | 'time' | 'spot' | 'fight' | 'tour' | 'chore' | 'gift'

/**
 * What each errand kind asks. `roll` picks a random `to` for the islander giving it; kinds without one are written only.
 * `ready` is a condition checked when the giver is met, for kinds nothing has to be counted for.
 * `can` says whether the pet can do it today; written errands it can't are left out.
 */
const KINDS: Record<
  Kind,
  { what: (e: Errand) => string; roll?: (from: string) => string; ready?: (to: string) => boolean; can?: (to: string) => boolean }
> = {
  talk: {
    what: (e) => `去${PLACES[FOLK[e.to].scene]}找${e.to}传个话`,
    roll: (from) => pick(FOLKS.filter((n) => n !== from)),
  },
  bring: {
    what: (e) => `带一个${findGood(e.to).name}来`,
    roll: () => pick(wants()).id,
    can: (to) => buyable(findGood(to)),
  },
  spot: {
    what: (e) => SPOTS[e.to].what,
    roll: () => pick(Object.keys(SPOTS)),
  },
  fight: {
    what: (e) => `去${PLACES[MONSTERS[e.to][1]]}打败${MONSTERS[e.to][0]}`,
    roll: () => pick(Object.keys(MONSTERS).filter((id) => best(id) >= BEATABLE)),
    can: (to) => best(to) >= BEATABLE,
  },
  tour: {
    what: (e) => `换${e.to}个地方逛一逛`,
    roll: () => String(rand(2, 4)),
  },
  chore: {
    what: (e) => {
      const [obj, n] = chore(e.to)
      return `今天${CHORES[obj]![0]}${n}次`
    },
    roll: () => {
      const obj = pick(Object.keys(CHORES) as Counter[])
      return `${obj}:${rand(1, CHORES[obj]![1])}`
    },
    ready: (to) => {
      const [obj, n] = chore(to)
      return count(obj) >= n
    },
  },
  gift: {
    what: (e) => `随便带一样${GIFTS[e.to]}来`,
    roll: () => pick(Object.keys(GIFTS)),
  },
  visit: {
    what: (e) => `去${PLACES[Number(e.to)]}看一看`,
    roll: (from) => pick(Object.keys(PLACES).filter((s) => Number(s) !== FOLK[from].scene)),
  },
  chat: {
    what: (e) => `在岛上聊天说${e.to}句话`,
    roll: () => String(rand(2, 3)),
  },
  play: {
    what: (e) => `去玩一会儿${PLAYS[e.to]}`,
    roll: () => pick(Object.keys(PLAYS)),
  },
  quiz: { what: () => '答对一道题，只有一次机会' },
  seek: { what: (e) => `找到躲起来的${e.from}：「${HINTS[Number(e.to)]}」` },
  care: {
    what: (e) => {
      const [how, stat] = CARES[e.to as Care]
      return `${how}地去找${e.from}（${stat}到${CARE * 10}成）`
    },
    ready: (to) => info[to as Care] >= save.petComputedlInfo[CARES[to as Care][2]] * CARE,
  },
  time: {
    what: (e) => `${hours(e.to)[0]}点到${hours(e.to)[1]}点之间去找${e.from}`,
    ready: (to) => {
      const [from, until] = hours(to)
      const h = new Date().getHours()
      return h >= from && h < until
    },
  },
}
const ROLLED = (Object.keys(KINDS) as Kind[]).filter((k) => KINDS[k].roll)

/** Errands written for each islander and the place they live: giver, kind, `to`, request. */
const ERRANDS: [string, Kind, string, string][] = [
  ['佐佐', 'bring', '102010015', '店里的招牌下岛咖啡卖光啦，客人还在等，能帮我带一杯来应应急吗？'],
  ['翠花', 'talk', '周大饼', '后厨的面粉快用完了，帮我去百货店问问周大饼还有没有货。'],
  ['周大饼', 'visit', '5', '听说粉钻雪山来了好多游客，帮我去看看他们缺些什么，我好进货。'],
  ['莉莉', 'bring', '102010001', '海边太阳好晒呀，好想吃一个圈圈冰激凌~'],
  ['探险家琼斯', 'visit', '21', '我的探险笔记落在古堡森林了，帮我去那边找一找吧。'],
  ['探险家琼斯', 'talk', '亚瑟', '替我问问古堡森林的亚瑟，最近有没有在林子里见到奇怪的宝箱。'],
  ['游乐场管理员', 'visit', '8', '超级游乐场今天人多，帮我去巡逻一圈，看看设施有没有出毛病。'],
  ['杰里', 'chat', '3', '接力赛就要开始啦，帮我在岛上喊几声给大家加油！'],
  ['亮亮', 'visit', '26', '粉钻度假村的温泉开了，帮我去看看排队的人多不多。'],
  ['管家苔丝', 'bring', '102010091', '旅店的客人点了一盒蒙牛酸酸乳，库房里刚好没有了，能帮忙带一盒来吗？'],
  ['伊苏', 'talk', '亮亮', '雪山上风大，帮我去提醒亮亮滑雪时多穿点。'],
  ['珍尼花', 'talk', '智慧长老', '明天要考试，帮我去风语广场向智慧长老讨一道难题。'],
  ['蓉蓉', 'bring', '102010003', '今天有小企鹅过生日，蛋糕旁边还差一份月光饼饼。'],
  ['蓉蓉', 'chat', '3', '帮今天的寿星在岛上多说几句祝福吧！'],
  ['梅奥', 'talk', '凯茜', '下午有一场婚礼，帮我去提醒凯茜把登记簿准备好。'],
  ['神父特里斯坦', 'visit', '23', '听说神秘岛上有小企鹅迷了路，帮我去那里看看。'],
  ['亚瑟', 'talk', '监狱长', '有个小贼偷了我的矿石，帮我去风语广场问问监狱长抓到没有。'],
  ['木木', 'bring', '102010004', '在广场上逛了一上午，肚子好饿，想吃果味米米花~'],
  ['赛孔明', 'visit', '30', '我夜观天象，东郊荒地今天有异动，帮我去探一探。'],
  ['露西卡', 'talk', '精灵乐乐', '我烤了新的魔法饼干，帮我去叫精灵乐乐过来尝尝。'],
  ['监狱长', 'chat', '2', '广场上人太多了，帮我提醒大家排好队、别乱跑。'],
  ['精灵乐乐', 'visit', '27', '神秘湖里的水精灵好久没露面了，帮我去湖边看看她。'],
  ['多多', 'visit', '15', '新学期开学啦，帮我去小学课堂看看新同学来了没有。'],
  ['智慧长老', 'talk', '赛孔明', '我出了一道谜题，帮我去考考赛孔明，看他答不答得上来。'],
  ['凯茜', 'bring', '102020003', '教堂门口的花快蔫了，借我一个舒爽喷湿器浇浇水吧。'],
  ['智慧长老', 'quiz', 'dx-chinese', '老头子今天考考你，答对了有赏：'],
  ['珍尼花', 'quiz', 'xx-chinese', '上课啦！这道题请你来回答：'],
  ['多多', 'quiz', 'xx-mathematics', '这道作业题我想了一上午，你帮我看看选哪个？'],
  ['赛孔明', 'quiz', 'zx-chinese', '在下出一题，答得上来才算有缘人：'],
  ['亚瑟', 'quiz', 'xx-wushu', '想跟我学打铁，先得懂点武艺。回答我：'],
  ['神父特里斯坦', 'quiz', 'xx-manner', '孩子，我想听听你怎么看这个问题：'],
  ['精灵乐乐', 'seek', '23', '来玩捉迷藏吧！我已经藏好啦，猜猜我在哪儿？'],
  ['木木', 'seek', '13', '嘿嘿，我偷偷溜出去找好吃的了，你能找到我吗？'],
  ['莉莉', 'seek', '8', '海边玩腻了，我躲起来了，来找我呀~'],
  ['多多', 'seek', '15', '放学了我还没走，你猜我躲在哪儿？'],
  ['杰里', 'seek', '5', '我跑到一个特别冷的地方练耐力，找到我算你赢！'],
  ['杰里', 'play', 'QQ跆拳道', '光跑步不过瘾，你去竞技场打一局跆拳道给我看看！'],
  ['翠花', 'play', 'QQ端盘子', '今天客人太多了，快来帮我端端盘子！'],
  ['游乐场管理员', 'play', 'Q宠搭积木', '游乐场的积木塔倒了，帮我重新搭起来吧。'],
  ['珍尼花', 'play', 'QQ好好学习', '今天的功课还没做呢，去好好学习一会儿再来。'],
  ['探险家琼斯', 'play', '冒险岛系列/1起航', '冒险岛的船要起航了，跟我出海冒险去！'],
  ['管家苔丝', 'care', 'clean', '宝贝旅店只接待干干净净的客人，洗干净了再来吧。'],
  ['露西卡', 'care', 'hunger', '饿着肚子可学不会魔法，先吃饱了再来找我。'],
  ['蓉蓉', 'care', 'mood', '生日派对要开开心心地来，心情好了再来找我吧！'],
  ['伊苏', 'care', 'hunger', '雪山上冷，肚子空空会冻坏的，吃饱了再上山来。'],
  ['赛孔明', 'time', '20-24', '今晚星象大吉，晚上8点以后来广场找我一起观星。'],
  ['露西卡', 'time', '6-10', '清早的露水最适合做魔法点心，早上来找我吧。'],
  ['佐佐', 'time', '11-14', '午市最忙了，中午来店里帮我看看场子。'],
  ['监狱长', 'time', '18-22', '晚上要查岗，晚饭后来广场报到。'],
  ['监狱长', 'spot', 'jycat', '那只监狱猫又越狱了！有人在海边和雪山都见过它，帮我把它抓回来。'],
  ['监狱长', 'fight', '3', '东郊荒地的狗贼偷了广场的路灯，帮我去教训教训它！'],
  ['探险家琼斯', 'spot', 'treasure_map?cmd=6', '我的探宝仪滴滴直响，地上冒泡泡的地方准有东西，帮我挖一个看看。'],
  ['探险家琼斯', 'fight', '2', '东郊荒地有棵树精挡了我的探险路线，帮我把它赶走。'],
  ['游乐场管理员', 'spot', 'x_cgdb', '闯关夺宝的机关该检修了，帮我去试一遍，看哪儿卡住了。'],
  ['游乐场管理员', 'visit', '7', '竞技场借了我们几张看台，帮我去看看摆好没有。'],
  ['杰里', 'spot', 'pk_wdh', '天下第一武道会开始报名啦，你去替自己报个名，我给你当啦啦队！'],
  ['杰里', 'fight', '8', '听说东郊荒地的豹妖跑得比我还快？去跟它比划比划！'],
  ['翠花', 'spot', 'coffee/food_index', '我新做了几样点心摆在桌上，帮我挑一块尝尝，说实话哦。'],
  ['亮亮', 'spot', 'qq_sgbb', '滑完雪最想吃冰淇淋，你去尝尝雪山上那家水果冰淇淋，好吃我就去排队。'],
  ['亮亮', 'fight', '13', '东郊荒地有只雪猿，偷学我的滑雪姿势！去把它打跑。'],
  ['伊苏', 'visit', '32', '昆仑顶上长着一种雪莲，帮我去看看开了没有。'],
  ['蒙奇', 'spot', 'pet_carnival', '我抽乌龟输了一下午，帮我去嘉年华沾沾喜气，转转运！'],
  ['蒙奇', 'quiz', 'xx-mathematics', '一副牌里抽乌龟，抽到最后谁倒霉？先帮我算道题醒醒脑：'],
  ['酷迪', 'visit', '29', '冲浪没意思了，听说神秘湖底能潜水？帮我先下去探探。'],
  ['酷迪', 'play', 'QQ宠物泡泡', '雪山上有个吹泡泡的机器，你去玩一会儿，看刺不刺激。'],
  ['桑尼夫人', 'bring', '102010021', '本夫人只喝康师傅红茶，管家又忘买了，快替我带一瓶来。'],
  ['桑尼夫人', 'care', 'clean', '脏兮兮的可不许进粉钻俱乐部，洗得干干净净再来见本夫人。'],
  ['迪利', 'spot', 'phb_Top', '名宠俱乐部的排行榜换新了，帮我去看看我排第几！'],
  ['迪利', 'play', 'Q宠邀你来找茬', '比眼力我可是达人！你去玩一局找茬，看能不能赢过我。'],
  ['红冠国王', 'fight', '9', '东郊荒地的虎头领投靠了蓝冠国王，替本王去收拾它！'],
  ['红冠国王', 'talk', '杰无双', '替本王给杰无双下战书：本王要上属性擂台，谁来都不怕！'],
  ['杰无双', 'spot', 'attribute_pk/pk.html', '天下英雄，非你莫属！先去属性擂台上站一站，让大家认识认识你。'],
  ['杰无双', 'fight', '11', '虎王自称东郊荒地第一高手，英雄，去挑战它！'],
  ['嘟嘟', 'visit', '26', '做绝版需要度假村的新鲜水果，帮我去看看熟了没有。'],
  ['嘟嘟', 'spot', 'qq_ggw', '度假村农场的苗快干死了，帮我去浇浇水，材料才长得好。'],
  ['唐三藏', 'fight', '5', '有只野猪精扬言要吃唐僧肉，你快去东郊荒地保护贫僧……哦不，打败它！'],
  ['唐三藏', 'chat', '3', '阿弥陀佛，帮贫僧在岛上多说几句好话，劝大家与人为善。'],
  ['兰兰', 'spot', 'x_cgdb', '敢一口气通十关么？先去试试闯关夺宝，过了我再告诉你下一关。'],
  ['兰兰', 'visit', '31', '天剑峰才是真正的大关，你敢爬上去看一眼吗？'],
  ['闹闹', 'bring', '102010012', '我想做桃桃曲奇，就差一个桃桃布丁当馅儿了！'],
  ['闹闹', 'play', 'QQ煎饼摊', '百货店的煎饼摊老板病了，你去帮他摊一会儿煎饼吧。'],
  ['口袋精灵', 'seek', '26', '我把礼物藏好了，自己也躲起来了，找到我就送给你！'],
  ['口袋精灵', 'chat', '3', '欢乐要大家一起分享！帮我在岛上跟大家打打招呼吧。'],
  ['贝松', 'fight', '15', '我需要香炉精身上的香灰做元素材料，去东郊荒地打败它吧。'],
  ['贝松', 'quiz', 'xx-labouring', '小小元素师也要懂生活常识。回答我：'],
  ['魔幻人鱼', 'visit', '27', '我好想家……帮我去神秘湖看看，湖水还像魔幻大陆那样蓝吗？'],
  ['魔幻人鱼', 'seek', '29', '我游到一个你得憋气才能来的地方了，来找我呀~'],
  ['丘比特', 'talk', '凯茜', '我看中了一对有情人，帮我去教堂问问凯茜，下个月还能不能约婚礼。'],
  ['丘比特', 'time', '19-22', '晚上月亮出来，才是射爱神之箭的好时候，那时候再来找我。'],
  ['炫舞小妖', 'chat', '3', '跳舞要有人喝彩！帮我在岛上喊几声，叫大家来看我跳舞。'],
  ['炫舞小妖', 'care', 'mood', '跳舞最要紧的是开心！心情好好的再来跟我跳。'],
  ['洛克大使', 'visit', '8', '洛克王国想跟超级游乐场合办活动，帮我去游乐场踩踩点。'],
  ['洛克大使', 'talk', '游乐场管理员', '帮我问问游乐场管理员，借场地办活动要交多少元宝。'],
  ['恩恩', 'talk', '蓉蓉', '我做了一张爱心卡，帮我送去生日屋给蓉蓉，祝今天的寿星生日快乐。'],
  ['恩恩', 'care', 'mood', '爱心卡要开开心心地送才灵，你心情好的时候再来帮我。'],
  ['占星师', 'play', '满天星', '永恒之星就藏在满天星里，去观星台帮我找一找。'],
  ['占星师', 'fight', '14', '云兽把星星都遮住了，去东郊荒地打败它，让我看清星空。'],
  ['爽爽', 'bring', '102010020', '冰爽店的冰红茶卖断货了，帮我带一瓶来救急！'],
  ['爽爽', 'fight', '17', '昆仑顶的雪妖偷了我的冰块，帮我去讨回来！'],
  ['机器宝宝', 'quiz', 'zx-mathematics', '滴——数学模块启动——请回答：'],
  ['机器宝宝', 'play', 'Q宠守护使', '滴——防御系统需要测试——请去古堡森林玩一局守护使。'],
  ['T仔', 'fight', '6', '鬼灯笼晚上老在东郊荒地晃，吓得我火药都撒了，去把它灭掉！'],
  ['T仔', 'spot', 'tiaoshui', '我想试试从跳水台上扔个水炸弹，你先去跳一次，看看水深不深。'],
  ['克鲁尼', 'care', 'hunger', '度假村包吃包洗！先吃得饱饱的，再来找我登记。'],
  ['克鲁尼', 'spot', 'qqbsg', '水果车到了，帮我去搬一筐水果，搬完请你吃。'],
  ['阿梅', 'spot', 'qq_zjps', '托管的宝宝们吵着要看杂技，帮我先去看看今天演不演。'],
  ['阿梅', 'seek', '7', '有只托管的宝宝跑丢了……啊不，是我躲起来了，来找我！'],
  ['琪琪', 'bring', '102020019', '店里的试衣镜碎了，借我一面QQ魔镜照一照新衣服吧。'],
  ['琪琪', 'visit', '18', '听说教堂今天有婚礼，帮我去看看新娘穿的是什么款式。'],
  ['木木', 'spot', 'treasure_map/index', '听说魔法宝箱里装满了零食，帮我去摸一摸能不能打开！'],
  ['精灵乐乐', 'spot', 'qq_cjxt', '成就树好久没人浇水了，帮我去浇一浇，它会长出新叶子哦。'],
  ['赛孔明', 'fight', '20', '天剑峰的剑魂杀气太重，扰乱了星象，替在下去降服它。'],
  ['亚瑟', 'fight', '1', '我新打了一把剑，你拿去东郊荒地，找狗妖试试锋利不锋利。'],
  ['智慧长老', 'spot', 'pk_scdz', '蔬菜大作战最考验反应，去竞技场参加一场，回来讲给我听。'],
  ['周大饼', 'spot', 'pk_zq', '我押了PK世界杯的冠军，你帮我去竞技场看看比分！'],
  ['神父特里斯坦', 'fight', '16', '东郊荒地的石狮精到处吓唬小企鹅，孩子，去让它安分些。'],
  ['梅奥', 'fight', '7', '教堂的花都是从东郊荒地采的，可那里的花妖不让采，帮我去说服……打败它。'],
  ['佐佐', 'play', 'QQ宠物摘星星', '咖啡要配星星糖才好看，去古堡森林帮我摘几颗星星回来。'],
  ['蓉蓉', 'spot', 'pet_carnival', '我想把生日派对搬到嘉年华办，帮我去海边看看场地热不热闹。'],
  ['爽爽', 'visit', '3', '海边今天热不热？热的话冰爽店就搬过去摆摊。'],
  ['琪琪', 'seek', '20', '我偷偷溜去喝下午茶了，猜猜我在哪儿？'],
  ['蒙奇', 'visit', '16', '听说生日屋今天有派对，帮我去看看有没有人陪我抽乌龟。'],
  ['克鲁尼', 'visit', '22', '度假村想在风语广场贴招牌，帮我去看看哪儿人最多。'],
  ['洛克大使', 'tour', '3', '洛克王国的活动传单印好啦，帮我换3个地方发一发！'],
  ['游乐场管理员', 'tour', '4', '全岛设施大检查！帮我换4个地方转一圈，看看哪里需要修。'],
  ['口袋精灵', 'tour', '3', '我要把欢乐送到每个角落，带我换3个地方逛逛吧！'],
  ['探险家琼斯', 'tour', '4', '真正的探险家脚步不能停！今天换4个地方走走。'],
  ['周大饼', 'chore', 'Work:1', '年轻人要勤快！今天去打一次工，回来我给你算工钱。'],
  ['珍尼花', 'chore', 'Study:1', '光玩可不行，今天去上一次课再来找老师。'],
  ['探险家琼斯', 'chore', 'Travel1:1', '岛外的世界更大！今天出门旅游一次，回来讲给我听。'],
  ['翠花', 'chore', 'Eat:2', '看你瘦的！今天好好吃两顿饭再来。'],
  ['管家苔丝', 'chore', 'Clean:2', '讲卫生的宝宝最可爱，今天洗两次澡吧。'],
  ['精灵乐乐', 'chore', 'Toy:3', '玩具放着会伤心的，今天陪它们玩3次！'],
  ['迪利', 'chore', 'GameRound:2', '小游戏达人就是我！你今天先玩两局小游戏练练手。'],
  ['机器宝宝', 'chore', 'Study:2', '滴——检测到知识不足——请今天学习2次。'],
  ['木木', 'gift', 'food', '肚子咕咕叫……随便给我一样好吃的吧，什么都行！'],
  ['露西卡', 'gift', 'food', '做魔法点心缺材料了，带一样吃的来，我变个花样给你看。'],
  ['阿梅', 'gift', 'toy', '托管的宝宝们闹着要玩具，随便带一个来哄哄他们吧。'],
  ['蓉蓉', 'gift', 'toy', '寿星还缺一份礼物，随便带个玩具来就好~'],
  ['克鲁尼', 'gift', 'clean', '度假村的洗浴间缺用品了，随便带一样清洁用品来救急。'],
  ['伊苏', 'gift', 'clean', '雪山下的小宝宝们脏兮兮的，借我一样清洁用品吧。'],
]
/** Errands a day: written ones of different kinds, then made-up ones, more of them when the AI words them. */
const WRITTEN = 6
const MADE_UP = 2
const MADE_UP_AI = 4
const PIECES = 8
/** 天使坏坏 hands out a growth gift every this many levels. */
const TIER = 4
/** 小艾 asks for shop goods up to this price; her thanks are worth 100~300 元宝. */
const WANT_PRICE = 200

/** True island happenings for the daily paper; the AI only writes up the stories. */
const FACTS: News[] = [
  ['布袋长老招信使', '风语广场的布袋长老每天有5封信要送，帮他跑腿能拿元宝，一个地方的岛民都收到过信还有大礼包。'],
  ['岛民求帮忙', '风语广场的科洛那里贴着今天岛民们托人帮的忙，每天都换新的，帮完了找本人领谢礼。'],
  ['图图的宝藏图', '风语广场的图图每天发一张宝藏图碎片，集齐8张就能挖宝藏。'],
  ['天使坏坏的成长礼', '宠物每长4级，就能去风语广场找天使坏坏领成长奖励。'],
  ['小艾的爱心任务', '夏帕海岸的小艾每天都想要一样东西，帮她找来有谢礼。'],
  ['摩西邀你钓鱼', '夏帕海岸的摩西在码头摆好了鱼竿，钓上来的鱼能换元宝。'],
  ['教堂密室', '教堂里的密室藏着一道道谜题，听说解开的企鹅都有收获。'],
  ['小游戏天天玩', '竞技场的跆拳道、游乐场的搭积木、小学课堂的好好学习，随时等你来玩。'],
  ['东郊荒地闹妖怪', '东郊荒地、天剑峰和昆仑顶出现了20多只妖怪，可以硬拼、智取或者说服它们，赢了能拿元宝。'],
  ['监狱猫又越狱了', '风语广场监狱长的监狱猫又跑了，有人在夏帕海岸和粉钻雪山见过它。'],
  ['观星台寻星', '占星师在风语广场的观星台寻找永恒之星，邀请大家一起玩满天星。'],
]
const REPORTER = '你是QQ宠物企鹅岛《企鹅日报》的小记者。'

const GUIDE: News[] = [
  ['风语广场', '科洛的每日任务、布袋长老送信、图图宝藏图、天使坏坏成长奖励。'],
  [
    '岛民',
    '岛上的居民都可以点一点：有的托你跑腿带东西，有的出题考你、躲起来等你找、拉你玩小游戏、约你某个时辰见面、派你去哪儿看看或者去打妖怪，还有的会关心你今天有没有好好吃饭、打工、学习，每天早上6点换新的。',
  ],
  ['夏帕海岸', '小艾的爱心任务、摩西钓鱼、饭饭端盘子、冒险岛、嘉年华。'],
  ['竞技场 / 超级游乐场', '跆拳道、搭积木、武道会、蔬菜大作战、闯关夺宝。'],
  ['小学课堂 / 教堂', '好好学习、密室逃脱。'],
  ['更多小游戏', '风语广场观星台的满天星、找茬，百货店的煎饼摊、古堡森林的守护使和摘星星、粉钻雪山的泡泡。'],
  ['东郊荒地 / 天剑峰 / 昆仑顶', '点妖怪就能交手：硬拼看武力，智取看智力，说服看魅力，每只妖怪一天能挑战一次。'],
  ['右边的导航', '点推荐活动、休闲游戏里的名字，企鹅会自己走过去；区域导航能直接去各个地方。'],
]

/** A heading and its text. */
type News = [string, string]

/**
 * `to`: an islander (talk), a good id (bring), a scene (visit, seek), how many lines (chat), an exam topic (quiz),
 * a game SWF (play), a pet stat (care), hours "from-until" (time), a sight (spot), a monster (fight), how many places (tour),
 * a counter and times "obj:n" (chore) or a good type (gift).
 */
interface Errand {
  from: string
  kind: Kind
  to: string
  ask: string
  got: number
  took: boolean
}

const need = (e: Errand): number => (e.kind === 'chat' || e.kind === 'tour' ? Number(e.to) : 1)

/** Kept in saveJsonData.island; the daily fields restart at 06:00. */
interface State {
  day: number
  sent: number
  /** The islander the carried letter is for, or ''. */
  letter: string
  note: string
  /** Islanders that ever got a letter, and scenes whose islanders all did (gift given). */
  lit: string[]
  lamps: number[]
  /** Growth gifts claimed, in TIER levels. */
  tier: number
  pieces: number
  piece: boolean
  /** Good id 小艾 asks for today. */
  want: string
  loved: boolean
  news: News[]
  errands: Errand[]
  /** Monsters fought today, won or lost, and fights ever won. */
  fought: string[]
  wins: number
}

const state: State = {
  day: 0,
  sent: 0,
  letter: '',
  note: '',
  lit: [],
  lamps: [],
  tier: 0,
  pieces: 0,
  piece: false,
  want: '',
  loved: false,
  news: [],
  errands: [],
  fought: [],
  wins: 0,
  ...JSON.parse(save.saveJsonData.island || '{}'),
}
const store = (): void => update('saveJsonData', { island: JSON.stringify(state) })

/** The mall sells it and the pet can buy it now. */
const buyable = (g: Good): boolean => SOLD.has(g.id) && g.price! > 0 && !g.PD && !g.outOfPrint && (g.needLevel ?? 0) <= save.petComputedlInfo.level

/** Shop goods the pet can buy now, cheap enough to ask for. */
const wants = (): Good[] =>
  (['food', 'toy', 'clean'] as const)
    .flatMap((t) => allGoods(t))
    .filter((g) => buyable(g) && g.price! <= WANT_PRICE)

/** Today's errands: written ones of different kinds from different islanders, then made-up ones from others whose request the AI words. */
function roll(): Errand[] {
  const errands: Errand[] = []
  for (const [from, kind, to, ask] of shuffle(ERRANDS)) {
    if (errands.length === WRITTEN) break
    if (errands.some((e) => e.from === from || e.kind === kind) || KINDS[kind].can?.(to) === false) continue
    errands.push({ from, kind, to, ask, got: 0, took: false })
  }
  const made = shuffle(FOLKS.filter((n) => !errands.some((e) => e.from === n)))
    .slice(0, aiOn() ? MADE_UP_AI : MADE_UP)
    .map((from): Errand => {
      const kind = pick(ROLLED)
      const e: Errand = { from, kind, to: KINDS[kind].roll!(from), ask: '', got: 0, took: false }
      e.ask = say(TALK.ask, { what: KINDS[kind].what(e) })
      return e
    })
  const word = (e: Errand, prompt: string): void =>
    void voice(e.from, `你想请${info.name}帮你${KINDS[e.kind].what(e)}。${prompt}`, e.ask).then((ask) => {
      e.ask = ask
      store()
    })
  for (const e of errands) word(e, `平时你会这么说：「${e.ask}」今天换个说法、换个原因再说一遍，要做的事不能变。`)
  for (const e of made) word(e, '结合你自己和你住的地方，编一个有趣的原因，用一句话请它帮忙。')
  return [...errands, ...made]
}

function today(): State {
  if (state.day === dayStart()) return state
  Object.assign(state, { day: dayStart(), sent: 0, letter: '', note: '', piece: false, want: pick(wants()).id, loved: false, news: [], errands: roll(), fought: [] })
  store()
  return state
}

/** An islander's line; `fallback` when AI is off or fails. */
async function voice(npc: string, prompt: string, fallback: string): Promise<string> {
  const folk = FOLK[npc]
  const where = folk ? `你住在${PLACES[folk.scene]}，${folk.about}。` : ''
  const who = `你是QQ宠物企鹅岛社区里的「${npc}」，${where}正在和小企鹅「${info.name}」说话。只写你说出口的话，不写动作和旁白，不加名字前缀和引号。`
  const text = await askAs(who, [{ role: 'user', content: `${prompt}只输出这句话。` }])
  return text?.replace(/^[「“"]+|[」”"]+$/g, '') || fallback
}

/** The narrator's line about what the pet does; `fallback` when AI is off or fails. */
async function tell(prompt: string, fallback: string): Promise<string> {
  const text = await askAs('你是QQ宠物企鹅岛社区的说书人，讲小企鹅在岛上的经历，童趣、不血腥。', [{ role: 'user', content: `${prompt}只输出这句话。` }])
  return text ?? fallback
}

let closeTalk = (): void => {}

/** An islander's dialog: what they say, the goods shown and its buttons. Opening one replaces the last. */
function talk(name: string, body: (Node | string)[], goods: Good[] = [], actions: [string, () => void][] = []): void {
  closeTalk()
  const box = div('island fC', div('i_title', name), div('i_body f1', ...body.map((b) => div('i_line', b))))
  if (goods.length) box.append(div('i_goods', ...goods.map((g) => div('i_good', img('goodImg', g.url), `${g.name}*${g.num}`))))
  if (actions.length)
    box.append(
      div(
        'i_acts',
        ...actions.map(([label, run]) =>
          button(
            'but_small',
            () => {
              closeTalk()
              run()
            },
            label,
          ),
        ),
      ),
    )
  closeTalk = openBox(div('ui-island', box))
}

const rows = (list: News[]): HTMLElement[] => list.map(([h, t]) => div('i_row', div('i_head', h), t))

async function letter(): Promise<void> {
  const s = today()
  const where = (name: string): string => `${PLACES[FOLK[name].scene]}的${name}`
  if (s.letter) return talk('布袋长老', [say(TALK.notYet, { to: where(s.letter) }), `「${s.note}」`])
  if (s.sent >= LETTERS) return talk('布袋长老', [say(TALK.lettersDone)])
  const left = FOLKS.filter((n) => !s.lit.includes(n))
  const next = pick(left.length ? left : FOLKS)
  const from = pick(SENDERS)
  const note = await voice(from, `你托布袋长老给${where(next)}捎一封信，说出信里写的一句话。`, say(TALK.note, { to: next }))
  talk(
    '布袋长老',
    [`${say(TALK.letterAsk, { from, to: where(next) })}（今天第${s.sent + 1}/${LETTERS}封）`, `「${note}」`],
    [],
    [
      [
        '接下这封信',
        () => {
          s.letter = next
          s.note = note
          store()
        },
      ],
    ],
  )
}

/** Hands the carried letter to `to`. */
function deliver(to: string): void {
  const s = today()
  const note = s.note
  const scene = FOLK[to].scene
  s.letter = ''
  s.sent++
  if (!s.lit.includes(to)) s.lit.push(to)
  const lamp = !s.lamps.includes(scene) && FOLKS.every((n) => FOLK[n].scene !== scene || s.lit.includes(n))
  if (lamp) s.lamps.push(scene)
  store()
  const goods = [parseGood(`_yb*${rand(5, 20) * 10 + (lamp ? 500 : 0)}`), ...(lamp ? loot(3) : [])]
  give(goods, say(TALK.got, { did: '帮布袋长老把信送到' }))
  const lit = lamp ? say(TALK.lamp, { place: PLACES[scene] }) : `（已经给${s.lit.length}/${FOLKS.length}位岛民送过信）`
  void voice(to, `${info.name}帮布袋长老给你送来一封信，信上写着「${note}」。读完信，对它说一句话。`, say(TALK.letterThanks)).then((line) =>
    talk(to, [line, lit], goods),
  )
}

/** The errand's giver: what they asked, or their thanks and reward once it is done. */
function errand(e: Errand): void {
  const what = KINDS[e.kind].what(e)
  if (e.took) return talk(e.from, [say(e.got ? TALK.helped : TALK.failed)])
  if (e.kind === 'quiz') return quiz(e)
  if (e.kind === 'bring') {
    const g = findGood(e.to)
    if (!hasGood(g.type, g.id)) return talk(e.from, [e.ask, `（${what}，商店里能买到）`], [g], [['去商店', openShop]])
    return talk(e.from, [e.ask], [g], [[`交给${e.from}`, () => takeGood(g) && finish(e)]])
  }
  if (e.kind === 'gift') {
    const g = listGoods(e.to as GoodType, 1, 1).list[0]
    if (!g) return talk(e.from, [e.ask, `（${what}，商店里能买到）`], [], [['去商店', openShop]])
    return talk(e.from, [e.ask], [{ ...g, num: 1 }], [[`把${g.name}交给${e.from}`, () => takeGood(g) && finish(e)]])
  }
  if (e.got < need(e) && !KINDS[e.kind].ready?.(e.to)) return talk(e.from, [e.ask, `（${what}${need(e) > 1 ? `，${e.got}/${need(e)}` : ''}）`])
  finish(e)
}

/** Today's question of the errand's topic; one try. */
function quiz(e: Errand): void {
  const bank = EXAM[e.to as keyof typeof EXAM]
  const q = bank[Math.floor(state.day / 86400) % bank.length]
  const answer = (o: string) => (): void => {
    if (o === q.answer) return finish(e)
    e.took = true
    store()
    talk(e.from, [say(TALK.wrong, { answer: q.answer })])
  }
  talk(
    e.from,
    [e.ask, q.title],
    [],
    shuffle(q.options).map((o): [string, () => void] => [o, answer(o)]),
  )
}

function finish(e: Errand): void {
  e.got = need(e)
  e.took = true
  store()
  const goods = [parseGood(`_yb*${rand(5, 15) * 10}`), ...(Math.random() < 0.3 ? loot(1) : [])]
  give(goods, say(TALK.got, { did: `帮${e.from}办完事` }))
  void voice(e.from, `你之前请${info.name}帮忙：「${e.ask}」它已经替你办好了，向它道谢。`, say(TALK.thanks)).then((line) =>
    talk(e.from, [line], goods),
  )
}

/** An islander, a sight or a monster was clicked (`url` is its old page). False for anything else. */
export function meet(url: string): boolean {
  const name = FOLKS.find((n) => url.includes(FOLK[n].key))
  const spot = Object.keys(SPOTS).find((k) => url.includes(k))
  const monster = url.match(/shenqichuangshuo\.html\?id=(\d+)/)?.[1]
  if (name) islander(name)
  else if (spot) void look(spot)
  else if (monster && MONSTERS[monster]) void duel(monster)
  else return false
  return true
}

/** A sight: what the pet finds there, and the errand that sent it, if any, done. */
async function look(key: string): Promise<void> {
  const { name, lines } = SPOTS[key]
  const e = today().errands.find((e) => e.kind === 'spot' && e.to === key && !e.got)
  if (e) {
    e.got = 1
    store()
  }
  const seen = pick(lines)
  const line = await tell(`小企鹅「${info.name}」来到了「${name}」。照着这句的意思，换个说法讲它在这里碰到的事：${seen}`, seen)
  talk(name, [line, ...(e ? [say(TALK.done, { did: `${e.from}交代的事办好了`, from: e.from })] : [])])
}

/** A monster bars the way and picks a fight; the pet chooses how to take it on. One fight each a day. */
async function duel(id: string): Promise<void> {
  const [name, , about] = MONSTERS[id]
  if (today().fought.includes(id)) return talk(name, [say(TALK.fought, { name })])
  const taunt = await voice(name, `你是企鹅岛上的妖怪，${about}。小企鹅闯进了你的地盘，凶巴巴地挑衅它一句。`, say(TALK.taunt))
  const pct = (t: Tactic): number => Math.max(1, Math.round(odds(id, t) * 100))
  talk(
    name,
    [taunt, `（${info.name}武力${info.strong}、智力${info.intel}、魅力${info.charm}，每只妖怪一天只能挑战一次）`],
    [],
    (Object.keys(TACTICS) as Tactic[]).map((t): [string, () => void] => [`${t} ${pct(t)}%`, () => void fight(id, t)]),
  )
}

/** The fight itself: the outcome is rolled first, then told blow by blow, then the banner. */
async function fight(id: string, t: Tactic): Promise<void> {
  const s = today()
  const [name, , about] = MONSTERS[id]
  const chance = odds(id, t)
  const won = Math.random() < chance
  const e = won && s.errands.find((e) => e.kind === 'fight' && e.to === id && !e.got)
  if (e) e.got = 1
  if (won) s.wins++
  s.fought.push(id)
  store()

  stage.face(FACE.sweat)
  const log = div('i_log', say(TALK.decide, { t }))
  talk(name, [log])
  const fighting = `小企鹅「${info.name}」和妖怪「${name}」（${about}）交手，它选择靠${TACTICS[t].said}来${t}，比如${TACTICS[t].moves.join('、')}。`
  const story = await Promise.all([
    tell(`${fighting}用一句话讲它出的第一招，还没分出胜负。`, `${info.name}${pick(TACTICS[t].moves)}`),
    tell(`${fighting}最后${won ? `${info.name}赢了，${name}认输` : `${name}赢了，${info.name}没打过、只好逃走`}。用一句话讲最后是怎么分出胜负的，一定要讲清楚是谁赢了。`, `${name}${say(TALK.strike)}，${name}${say(won ? TALK.win : TALK.loss)}`),
  ])
  for (const line of story) {
    await new Promise((r) => setTimeout(r, 700))
    log.append(div('i_line', line))
  }
  await new Promise((r) => setTimeout(r, 700))

  if (!won) {
    stage.play(FX.lose)
    stage.face(FACE.cry)
    return talk(name, [...story, say(TALK.lost, { said: TACTICS[t].said })])
  }
  stage.play(id === TOWER ? FX.fireworks : s.wins % 100 === 0 ? FX.hundred : chance < UPSET ? FX.upset : FX.win)
  stage.face(FACE.happy)
  const goods = [parseGood(`_yb*${10 + 5 * Number(id)}`), ...(Math.random() < 0.1 ? loot(1) : [])]
  give(goods, say(TALK.got, { did: `打败了${name}` }))
  talk(name, [...story, say(TALK.beat, { name }), ...(e ? [say(TALK.done, { did: `${e.from}交代的妖怪打跑了`, from: e.from })] : [])], goods)
}

/** An islander: a letter, a message passed on, their errand, or small talk. */
function islander(name: string): void {
  const s = today()
  const asked = s.errands.find((e) => e.kind === 'talk' && e.to === name && !e.got)
  if (asked) {
    asked.got = 1
    store()
  }
  if (s.letter === name) deliver(name)
  else if (asked)
    void voice(name, `${info.name}替${asked.from}来找你，${asked.from}说：「${asked.ask}」回它一句话。`, say(TALK.reply, { from: asked.from })).then((line) =>
      talk(name, [line, say(TALK.done, { did: '话带到了', from: asked.from })]),
    )
  else {
    const mine = s.errands.find((e) => e.from === name)
    if (mine) errand(mine)
    else void voice(name, `${info.name}路过你这里，跟它随便聊一句。`, say(TALK.chat)).then((line) => talk(name, [line]))
  }
}

/** The pet entered `scene`; what it says when that finishes an errand. */
export function arrive(scene: number): string | null {
  const s = today()
  const tour = s.errands.find((e) => e.kind === 'tour' && e.got < need(e))
  if (tour) tour.got++
  const e = s.errands.find((e) => (e.kind === 'visit' || e.kind === 'seek') && Number(e.to) === scene && !e.got)
  if (e) e.got = 1
  store()
  if (!e) return tour && tour.got >= need(tour) ? say(TALK.done, { did: `逛完${need(tour)}个地方了`, from: tour.from }) : null
  if (e.kind === 'seek') return say(TALK.found, { from: e.from, place: PLACES[FOLK[e.from].scene] })
  return say(TALK.done, { did: `${PLACES[scene]}看过了`, from: e.from })
}

/** The pet played a community game `swf` for a minute or more; what it says when that finishes an errand. */
export function played(swf: string): string | null {
  const e = today().errands.find((e) => e.kind === 'play' && e.to === swf && !e.got)
  if (!e) return null
  e.got = 1
  store()
  return say(TALK.done, { did: `${PLAYS[swf]}玩过了`, from: e.from })
}

/** The pet said something in the island chat; what it says when that finishes an errand. */
export function chatted(): string | null {
  const e = today().errands.find((e) => e.kind === 'chat' && e.got < need(e))
  if (!e) return null
  e.got++
  store()
  return e.got < need(e) ? null : say(TALK.done, { did: `${e.from}交代的话都说完了`, from: e.from })
}

/** 科洛's board: today's errands and how far along they are. */
function board(): void {
  const status = (e: Errand): string => {
    if (e.took) return e.got ? '（已完成）' : '（没答对）'
    if (e.got >= need(e) || KINDS[e.kind].ready?.(e.to)) return '（现在就能去找本人领谢礼）'
    return need(e) > 1 ? `（${e.got}/${need(e)}）` : ''
  }
  talk('科洛', [
    '岛民们今天托你帮的忙，每天早上6点换新的：',
    ...rows(today().errands.map((e) => [`${e.from}（${PLACES[FOLK[e.from].scene]}）`, `${KINDS[e.kind].what(e)}${status(e)}`])),
  ])
}

async function growth(): Promise<void> {
  const s = today()
  const level = save.petComputedlInfo.level
  const tier = Math.floor(level / TIER)
  if (tier <= s.tier) return talk('天使坏坏', [say(TALK.growWait, { tier: TIER, next: (s.tier + 1) * TIER })])
  const n = tier - s.tier
  s.tier = tier
  store()
  const goods = [parseGood(`_yb*${200 * n}`), ...loot(n)]
  give(goods, say(TALK.got, { did: '收到了天使坏坏的成长奖励' }))
  talk('天使坏坏', [await voice('天使坏坏', `${info.name}长到${level}级了，夸夸它，送它成长奖励。`, say(TALK.grow, { level }))], goods)
}

async function treasure(): Promise<void> {
  const s = today()
  if (s.piece) return talk('图图', [say(TALK.pieceGiven), `（现在有${s.pieces}/${PIECES}张）`])
  s.piece = true
  s.pieces++
  const full = s.pieces >= PIECES
  if (full) s.pieces = 0
  store()
  if (!full) {
    const line = await voice('图图', `你送给${info.name}一张宝藏图碎片，说一句神秘兮兮的话。`, say(TALK.piece))
    return talk('图图', [line, `（现在有${s.pieces}/${PIECES}张，集齐${PIECES}张就能挖宝藏）`])
  }
  const goods = [parseGood('_yb*500'), ...loot(4)]
  give(goods, say(TALK.got, { did: '拼好宝藏图挖到了宝藏' }))
  talk('图图', [await voice('图图', `${info.name}集齐了${PIECES}张碎片，拼成宝藏图挖到了宝藏，替它高兴。`, say(TALK.dug, { pieces: PIECES }))], goods)
}

async function love(): Promise<void> {
  const s = today()
  if (s.loved) return talk('小艾', [say(TALK.loved)])
  const want = findGood(s.want)
  if (!hasGood(want.type, want.id))
    return talk(
      '小艾',
      [await voice('小艾', `你今天想要一个「${want.name}」，请${info.name}帮你找一个来。`, say(TALK.want, { want: want.name }))],
      [want],
      [['去商店', openShop]],
    )
  talk(
    '小艾',
    [await voice('小艾', `${info.name}带来了你今天最想要的「${want.name}」，你又惊又喜，问它可不可以把${want.name}送给你。`, say(TALK.brought, { want: want.name }))],
    [want],
    [
      [
        '送给小艾',
        () => {
          if (!takeGood(want)) return
          s.loved = true
          store()
          const goods = [parseGood(`_yb*${rand(10, 30) * 10}`), ...loot(1)]
          give(goods, say(TALK.got, { did: '完成了小艾的爱心任务' }))
          void voice('小艾', `${info.name}把「${want.name}」送给了你，向它道谢。`, say(TALK.gifted)).then((line) => talk('小艾', [line], goods))
        },
      ],
    ],
  )
}

let paper: Promise<News[]> | null = null
let paperDay = 0

const digits = (s: string): string => (s.match(/\d+/g) ?? []).join()

async function write(): Promise<News[]> {
  const now = new Date()
  const out: News[] = [['岛务公告', `今天是${now.getMonth() + 1}月${now.getDate()}日，${dayText()}。祝岛民们玩得开心！`]]
  for (const [head, fact] of shuffle(FACTS).slice(0, 4)) {
    const line = await askAs(REPORTER, [{ role: 'user', content: `把这件事写成岛报新闻的正文，一两句话，只输出正文。事情：${fact}` }])
    const body = line?.replace(/^正文[：:]/, '')
    // Small models change the numbers now and then; those keep the plain fact.
    out.push([head, body && digits(body) === digits(fact) ? body : fact])
  }
  state.news = out
  store()
  return out
}

/** Today's island paper, written once a day. */
async function openNews(): Promise<void> {
  const s = today()
  if (paperDay !== s.day) {
    paperDay = s.day
    paper = s.news.length ? Promise.resolve(s.news) : write()
  }
  if (!s.news.length) talk('今日关注', ['小记者正在赶稿，马上就好……'])
  talk('今日关注', rows(await paper!))
}

const openGuide = (): void => talk('社区向导', rows(GUIDE))

/** Island pages by a piece of their URL: the NPC errands, and the navigation bar's three buttons. */
export const ISLAND: Record<string, () => void> = {
  npc_bdzl: () => void letter(),
  npc_tshh: () => void growth(),
  npc_tutu: () => void treasure(),
  npc_xiaoai: () => void love(),
  daytask: board,
  stf_index: openGuide,
  'qqpet://news': () => void openNews(),
  'games/message.swf': () => void openNews(),
  'qqpet://guide': openGuide,
  'qqpet://task': openTask,
}
