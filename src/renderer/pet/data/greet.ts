import type { Line } from './talk'

/** Launch greetings by time of day: the last entry whose hour has come applies. */
export const GREET: [number, Line[]][] = [
  [
    0,
    [
      { tolk: '[host]，这么晚还没睡呀？熬夜对身体不好，我陪你一会儿就去睡吧~', submitText: '马上睡' },
      { tolk: '嘘~夜深了，[host]要早点休息哦，明天才有精神！', submitText: '晚安~' },
      { tolk: '月亮都睡着了，[host]还在忙吗？辛苦啦，摸摸头~', submitText: '摸摸~' },
    ],
  ],
  [
    5,
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
    ],
  ],
  [
    14,
    [
      { tolk: '[host]，下午好！来杯下午茶提提神吧~', submitText: '好主意' },
      { tolk: '下午容易犯困，[host]起来活动活动吧！', submitText: '伸懒腰~' },
    ],
  ],
  [
    18,
    [
      { tolk: '[host]，晚上好！今天辛苦啦，陪我玩一会儿吧~', submitText: '来玩吧' },
      { tolk: '晚饭吃了什么好吃的？[host]有没有给我留一口？', submitText: '给你留了' },
    ],
  ],
  [
    23,
    [
      { tolk: '[host]，快到半夜啦，早点洗洗睡吧，我也困了~', submitText: '晚安~' },
      { tolk: '这么晚了还陪着我，[host]真好！不过要早点睡哦~', submitText: '好的~' },
    ],
  ],
]
