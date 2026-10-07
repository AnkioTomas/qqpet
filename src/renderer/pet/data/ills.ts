// Extracted verbatim from the original renderer bundle.
export interface Ill {
  type: string
  name: string
  health: number
  cure: { icon: string; id: string; name: string }
  tolk: string
  errTolk: string
  successTolk: string
  /** "<line>-<health>", stored in activeOption.ill */
  router: string
  children?: Ill
}

export const DEAD: Ill = {
  type: 'dead',
  name: '死亡',
  health: 0,
  cure: {
    icon: '_60001',
    id: '60001',
    name: '还魂丹',
  },
  tolk: '[host]保重，我走了，不带走一片云彩~~',
  errTolk: '您的宠物已死亡~~ ',
  successTolk: '[host]，再次见到你很高兴~~ ',
  router: '0-0',
}

/** Three illness lines, each worsening from health 4 down to 1 through `children`. */
export const ILLS: Ill[] = [
  {
    type: 'ill',
    name: '咳嗽',
    health: 4,
    cure: {
      icon: '_10003',
      id: '10003',
      name: '枇杷糖浆',
    },
    tolk: '咳咳！咳咳咳！',
    errTolk: '[host]，你给我吃什么了？~~ ',
    successTolk: '[host]，我舒服多了~~ ',
    router: '0-4',
    children: {
      type: 'ill',
      name: '支气管炎',
      health: 3,
      cure: {
        icon: '_20003',
        id: '20003',
        name: '甘草剂',
      },
      tolk: '[host]，我已经咳好久了，你怎么还不管我啊',
      errTolk: '[host]，花点钱带我看看吧~~ ',
      successTolk: '[host]，我舒服多了~~ ',
      router: '0-3',
      children: {
        type: 'ill',
        name: '哮喘',
        health: 2,
        cure: {
          icon: '_30003',
          id: '30003',
          name: '定喘丸',
        },
        tolk: '[host]，我……我呼吸好困难……',
        errTolk: '[host]，快带我去看病吧，我越来越严重了~~ ',
        successTolk: '[host]，我舒服多了~~ ',
        router: '0-2',
        children: {
          type: 'ill',
          name: '肺结核',
          health: 1,
          cure: {
            icon: '_40003',
            id: '40003',
            name: '通风散',
          },
          tolk: '狠心的[host]，你一直不理我，我就要窒息而死了',
          errTolk: '[host]，我承受不了了，再不治病你就见不到我了~~ ',
          successTolk: '[host]，我舒服多了~~ ',
          router: '0-1',
        },
      },
    },
  },
  {
    type: 'ill',
    name: '感冒',
    health: 4,
    cure: {
      icon: '_10001',
      id: '10001',
      name: '板蓝根',
    },
    tolk: '[host]我的鼻子好象又塞了',
    errTolk: '[host]，你给我吃什么了？~~ ',
    successTolk: '[host]，我舒服多了~~ ',
    router: '1-4',
    children: {
      type: 'ill',
      name: '发烧',
      health: 3,
      cure: {
        icon: '_30004',
        id: '30004',
        name: '退烧药',
      },
      tolk: '[host]，我的头开始发烧了……',
      errTolk: '[host]，花点钱带我看看吧~~ ',
      successTolk: '[host]，我舒服多了~~ ',
      router: '1-3',
      children: {
        type: 'ill',
        name: '重感冒',
        health: 2,
        cure: {
          icon: '_20001',
          id: '20001',
          name: '银翘丸',
        },
        tolk: '阿- -嚏！[host],这是我今天的第一百零一个喷嚏！',
        errTolk: '[host]，快带我去看病吧，我越来越严重了~~ ',
        successTolk: '[host]，我舒服多了~~ ',
        router: '1-2',
        children: {
          type: 'ill',
          name: '肺炎',
          health: 1,
          cure: {
            icon: '_30001',
            id: '30001',
            name: '金色消炎药水',
          },
          tolk: '救命啊，[host]！我胸口发疼，呼吸困难，难受死啦！',
          errTolk: '[host]，我承受不了了，再不治病你就见不到我了~~ ',
          successTolk: '[host]，我舒服多了~~ ',
          router: '1-1',
        },
      },
    },
  },
  {
    type: 'ill',
    name: '肚子胀',
    health: 4,
    cure: {
      icon: '_10002',
      id: '10002',
      name: '消食片',
    },
    tolk: '我的肚子胀胀的，好难受哦！',
    errTolk: '[host]，你给我吃什么了？~~ ',
    successTolk: '[host]，我舒服多了~~ ',
    router: '2-4',
    children: {
      type: 'ill',
      name: '胃炎',
      health: 3,
      cure: {
        icon: '_20002',
        id: '20002',
        name: '蓝色消炎药水',
      },
      tolk: '我今天好想吐哦！',
      errTolk: '[host]，花点钱带我看看吧~~ ',
      successTolk: '[host]，我舒服多了~~ ',
      router: '2-3',
      children: {
        type: 'ill',
        name: '胃溃疡',
        health: 2,
        cure: {
          icon: '_30002',
          id: '30002',
          name: '龙胆草',
        },
        tolk: '我的胃好疼，好心的[host]，到我去看病吧！',
        errTolk: '[host]，快带我去看病吧，我越来越严重了~~ ',
        successTolk: '[host]，我舒服多了~~ ',
        router: '2-2',
        children: {
          type: 'ill',
          name: '胃癌',
          health: 1,
          cure: {
            icon: '_40002',
            id: '40002',
            name: '仙人汤',
          },
          tolk: '我不想死啊，呜呜呜呜呜……',
          errTolk: '[host]，我承受不了了，再不治病你就见不到我了~~ ',
          successTolk: '[host]，我舒服多了~~ ',
          router: '2-1',
        },
      },
    },
  },
]

const DEPTH: Record<string, number> = { '4': 0, '3': 1, '2': 2, '1': 3 }

/** `code` is activeOption.ill plus the current health, e.g. "1-" + 3 → 发烧. */
export function illOf(code: string | null): Ill {
  if (!code || code === '0-0') return DEAD
  const [line, health] = code.split('-')
  let ill = ILLS[+line]
  for (let i = DEPTH[health] ?? 0; i > 0; i--) ill = ill.children!
  return ill
}
