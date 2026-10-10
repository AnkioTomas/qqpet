import type { Line } from './talk'

const LATE: Line[] = [
  { tolk: '[host]，这么晚还没睡呀？熬夜对身体不好，我陪你一会儿就去睡吧~', submitText: '马上睡' },
  { tolk: '嘘~夜深了，[host]要早点休息哦，明天才有精神！', submitText: '晚安~' },
  { tolk: '月亮都睡着了，[host]还在忙吗？辛苦啦，摸摸头~', submitText: '摸摸~' },
  { tolk: '深更半夜的，[host]是不是偷偷来看我？被我抓到啦，快去睡觉！', submitText: '嘿嘿' },
]

/** Launch greetings by time of day: the last entry whose hour has come applies. */
export const GREET: [number, Line[]][] = [
  [0, LATE],
  [
    5,
    [
      { tolk: '[host]起得好早呀！天才蒙蒙亮，我还没睡醒呢~', submitText: '早起的鸟儿' },
      { tolk: '清晨的空气最新鲜啦，[host]要不要出去走走？', submitText: '好呀' },
      { tolk: '[host]，早安！今天是不是有什么重要的事，起这么早？', submitText: '嗯嗯' },
    ],
  ],
  [
    8,
    [
      { tolk: '[host]，早上好！新的一天也要元气满满哦~', submitText: '早上好~' },
      { tolk: '早安[host]！吃早饭了没？不吃早饭可不行哦！', submitText: '吃过啦' },
      { tolk: '太阳晒屁股啦，[host]，今天也一起加油吧！', submitText: '加油！' },
    ],
  ],
  [
    11,
    [
      { tolk: '[host]，中午好~该吃午饭啦，吃饱了才有力气干活！', submitText: '这就去' },
      { tolk: '午饭时间到！[host]吃完记得眯一会儿哦~', submitText: '好的~' },
      { tolk: '肚子咕咕叫了吧？[host]今天中午吃什么好吃的呀？', submitText: '秘密~' },
    ],
  ],
  [
    13,
    [
      { tolk: '[host]，下午好！来杯下午茶提提神吧~', submitText: '好主意' },
      { tolk: '下午容易犯困，[host]起来活动活动吧！', submitText: '伸懒腰~' },
      { tolk: '[host]，下午也要加油哦，我在旁边给你打气！', submitText: '谢谢~' },
    ],
  ],
  [
    17,
    [
      { tolk: '[host]，傍晚啦，太阳要下山了，今天过得怎么样？', submitText: '还不错' },
      { tolk: '晚霞好漂亮呀！[host]快到下班时间了吧？', submitText: '快了快了' },
      { tolk: '[host]，忙了一天辛苦啦，晚饭想吃什么？', submitText: '想想看' },
    ],
  ],
  [
    19,
    [
      { tolk: '[host]，晚上好！今天辛苦啦，陪我玩一会儿吧~', submitText: '来玩吧' },
      { tolk: '晚饭吃了什么好吃的？[host]有没有给我留一口？', submitText: '给你留了' },
      { tolk: '[host]，晚上是放松的时间，别再想工作啦~', submitText: '好~' },
    ],
  ],
  [23, LATE],
]

/** Greetings for the calendar's statutory holidays, said on any day off they cover; 除夕 also on the eve of 正月初一. */
export const HOLIDAY: Record<string, string[]> = {
  元旦: ['[host]，元旦快乐！新的一年也请多多关照哦~', '新年新气象！[host]今年有什么新愿望吗？我的愿望是天天和你在一起~'],
  除夕: ['[host]，今天是除夕！年夜饭吃饱饱，一起守岁吧~', '除夕快乐！[host]，明天就是新年啦，记得给我压岁钱哦~'],
  春节: ['[host]，新年快乐！恭喜发财，红包拿来~', '过年啦！祝[host]新的一年身体健康、万事如意！'],
  清明节: ['[host]，清明时节天气转暖，踏青也要注意安全哦~', '清明假期到啦，[host]记得多陪陪家人~'],
  劳动节: ['[host]，劳动节快乐！辛苦了这么久，好好歇歇吧~', '五一假期！[host]是出去玩还是在家陪我？'],
  端午节: ['[host]，端午安康！你是甜粽派还是咸粽派？', '端午假期到啦！[host]去看赛龙舟吗？'],
  中秋节: ['[host]，中秋节快乐！一起赏月吃月饼吧~', '中秋假期到啦！[host]，月饼要分我一块哦~'],
  国庆节: ['[host]，国庆节快乐！祝祖国生日快乐~', '国庆长假！[host]准备去哪里玩呀？'],
}

/** Festivals the calendar marks no holiday for, keyed by solar MM-DD or its lunar date. */
export const FESTIVAL: Record<string, string[]> = {
  '02-14': ['[host]，今天是情人节哦~有没有收到巧克力？没有的话我分你一半！', '情人节快乐！[host]在我心里永远是第一名~'],
  '06-01': ['[host]，儿童节快乐！不管多大，在我这儿你永远是小朋友~', '今天是儿童节，[host]给我买糖吃好不好？'],
  '12-24': ['[host]，平安夜快乐！今晚记得吃个苹果，平平安安~'],
  '12-25': ['[host]，圣诞快乐！圣诞老人有没有往你袜子里塞礼物？', 'Merry Christmas！[host]，我想要一顶圣诞帽~'],
  正月十五: ['[host]，元宵节快乐！今天要吃汤圆哦，你喜欢什么馅的？', '元宵节到啦，[host]今晚去看花灯吗？带上我嘛~'],
  七月初七: ['[host]，今天是七夕哦~牛郎织女见面啦，你有没有想见的人呀？', '七夕快乐！[host]，我会一直陪着你的~'],
  九月初九: ['[host]，今天是重阳节，记得给家里的长辈打个电话哦~', '重阳节快乐！[host]要不要去登高望远？'],
  腊月初八: ['[host]，今天是腊八节，喝一碗腊八粥暖暖身子吧~', '过了腊八就是年！[host]，年货准备好了吗？'],
}
