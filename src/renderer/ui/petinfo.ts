import { goodOf } from '../pet/data/goods'
import { diploma } from '../pet/jobs'
import { fatigue, info, luck, save, setInfo, stage } from '../pet/store'
import { openFrame } from './box'
import './css/petinfo.css'
import { formatDate } from './date'
import { button, div, img } from './dom'

let close = (): void => {}

const small = (cls: string, label: string, value: string | number): HTMLElement =>
  div(`${cls} smallRow`, div('smallLabel', label), div('smallValue', String(value)))

function achievement(src: string, title: string, n: number): HTMLElement[] {
  return n ? [div('cjbox', Object.assign(img('cjImg', src), { title: `${title}*${n}` }))] : []
}

/**
 * A name input. The window is not focusable, so it takes focus only while
 * hovered, like the original.
 */
function nameRow(cls: string, label: string, key: 'name' | 'host', saved: () => void): HTMLElement {
  const input = Object.assign(document.createElement('input'), { className: 'input', type: 'text', maxLength: 20, value: info[key] })
  const commit = (): void => {
    setInfo(key, input.value)
    saved()
  }
  const r = div(`${cls} rightRow fcb`, div('label', label), input, button('but focusPress', commit))
  r.title = '保持鼠标在输入框内 才可进行输入'
  input.addEventListener('mouseenter', () => {
    window.qqpet.setFocusable(true)
    r.classList.add('fullInput')
  })
  const leave = (): void => {
    if (!r.classList.contains('fullInput')) return
    r.classList.remove('fullInput')
    window.qqpet.setFocusable(false)
    input.blur()
  }
  input.addEventListener('mouseout', leave)
  input.addEventListener('blur', leave)
  return r
}

export function openPetInfo(): void {
  close()
  const g = save.gameSaveDatas
  const bg = save.selfGoodUseOption.background
  const head = div(
    'headImg fcc',
    div(
      'cjList fw',
      ...achievement('pet/achievement/travel.svg', '旅行成就', g.travel_china_num),
      ...achievement('pet/achievement/ddw.svg', '逗宠成就', g.ddw),
      ...achievement('pet/achievement/yyds.svg', '养鱼大师', g.yyds),
    ),
    img('img penguin_breathe', `pet/info/${info.sex}${stage()}.svg`),
  )
  head.style.backgroundImage = `url(${bg ? goodOf('background', bg.id).url : 'pet/info/16.svg'})`

  const diamond = div('pinkDiamond')
  diamond.style.backgroundImage = `url(pet/info/${info.pinkDiamond ? 'u' : 'n'}${info.PDiamondLevel || 1}.svg)`
  const pd = div(
    'pinkDiamondMain fcc',
    diamond,
    div(info.pinkDiamond ? 'pinkDiamondUP px8 pinkDiamondUPs' : 'pinkDiamondUP px8', `${info.PDgrowth} / ${info.PDgrowthValue_next}`),
  )
  pd.title = info.pinkDiamond ? `当前成长速度：${info.PDgrowthValue}/每天,到期时间：${formatDate(info.PDiamondExpirationDate)}` : '当前未开通粉钻'

  const heart = div('sweetHeart')
  heart.style.backgroundImage = `url(pet/stateInfo/${info.sweetHeart ? 'h_up' : 'h_down'}.png)`
  heart.title = info.sweetHeartOverTime ? `过期时间：${formatDate(info.sweetHeartOverTime)}` : '当前未开启贴心宝贝'

  const lucky = Object.assign(document.createElement('span'), { title: '幸运值越高，旅游奇遇，抽奖概率越高', textContent: `幸运值：${luck()}` })
  const tired = Object.assign(document.createElement('span'), { title: '疲倦值越高，宠越容易生病', textContent: `疲倦值：${fatigue()}` })
  const birthday = small('birthDay', '生日：', formatDate(info.birthDay, 'YYYY-MM-DD'))
  birthday.title = `每月${formatDate(info.birthDay, 'DD')}日签到页面自动领取生日礼物`
  const title = div('name toe fcc')
  const retitle = (): void => void (title.textContent = `${info.host}家的${info.name}`)
  retitle()
  const diplomas = Object.entries(save.studyInfo)
    .map(([k, v]) => diploma(k, v))
    .filter(Boolean)

  const main = div(
    'petInfoMain focusPress',
    button('close', () => close()),
    head,
    ...(info.PDiamondLevel ? [pd] : []),
    title,
    div('service fcc', heart),
    div('luckyFatigue toe fcc', lucky, '\u00a0\u00a0\u00a0\u00a0\u00a0', tired),
    nameRow('petName', '宠物昵称：', 'name', retitle),
    nameRow('hostName', '主人昵称：', 'host', retitle),
    small('sex', '性别：', info.sex),
    birthday,
    small('level', '等级：', save.petComputedlInfo.level),
    small('yb', '元宝：', info.yb),
    div('rightRow attributeValue', div('label', '个人能力')),
    small('intel', '智力：', info.intel),
    small('strong', '武力：', info.strong),
    small('charm', '魅力：', info.charm),
    div('rightRow educationValue', div('label', '学历获得')),
    div('educationInfo smallRow', ...diplomas.map((d) => div('smallValue', `  ${d}  `))),
  )
  const remove = openFrame(div('ui-petinfo', main), 'pet/info/2.png')
  close = (): void => {
    window.qqpet.setFocusable(false)
    remove()
    close = () => {}
  }
}
