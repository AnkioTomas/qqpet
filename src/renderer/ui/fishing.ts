import FRIES from '../pet/data/fries.json'
import { pondCommand, pondRoom, pondState } from '../pet/fishing'
import { info, save } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openFrame } from './box'
import './css/fishing.css'
import { div } from './dom'
import { windowView } from './window-view'

const HEAD = { game: 6, key: '', svr: 0, ver: 1 }
/** The SWF's "harvest all" button only alerts this; the original answered it with a harvest-all request. */
const HARVEST_ALL = '暂不支持一键收获！'

let open = false

/** "1", a growth band and the sex: the original's grade code for the pet avatar in the pond. */
function grade(): string {
  const l = save.petComputedlInfo.level
  return `1${l < 5 ? 1 : l < 8 ? 2 : 0}${info.sex === 'GG' ? 2 : 3}`
}

export function openFishing(): void {
  if (open) return
  open = true
  const host = div('fishing')
  // Blocks the buy button for a second after a purchase: fish ids are purchase seconds.
  const cooldown = Object.assign(div('controlTF'), { title: '投放冷却中' })
  const player = new SwfPlayer(host)
  const remove = openFrame(div('ui-fishing', div('fishing', host, cooldown)))
  const receive = player.callback('PETEventOnReceived')
  const send = async (cmd: number, data: unknown): Promise<void> => void (await receive)(JSON.stringify({ data, head: { ...HEAD, cmd } }))
  const alert = window.alert
  const confirm = window.confirm
  const beforePay = window.before_pay
  // Official client hooked this to skip the Flash "确认支付吗".
  window.before_pay = () => true
  window.confirm = () => true

  window.PETSendData = (json) => {
    const { head, data } = JSON.parse(json)
    if (head.cmd === 4) {
      const room = pondRoom()
      const fry = FRIES.find((f) => f.fryid === data.fryid)
      if (!fry || room <= 0) {
        void send(4, pondCommand(4, data))
        return
      }
      windowView({
        title: '投放鱼苗',
        msg: `投放${fry.name}，空位 ${room}，每条 ${fry.price_yb} 元宝`,
        max: room,
        init: 1,
        ok: (close, num) => {
          const reply = pondCommand(4, { ...data, num })
          void send(4, reply)
          if (reply.result === 0) {
            cooldown.classList.add('controlTFActive')
            setTimeout(() => cooldown.classList.remove('controlTFActive'), 1000)
            setTimeout(() => void send(1, pondState()), 100)
          }
          close()
        },
        cancel: () => void send(4, { result: 5, msg: '取消了' }),
      })
      return
    }
    const reply = pondCommand(head.cmd, data)
    void send(head.cmd, reply)
    if (head.cmd === 8 && reply.result === 6) setTimeout(() => void send(1, pondState()), 100)
  }
  window.SNS_GetSelfPetInfo = () => ({
    petid: '1',
    qqnumber: '66666666',
    petName: info.name,
    masterName: info.host,
    level: save.petComputedlInfo.level,
    isvip: info.pinkDiamond ? 1 : 0,
    grade: grade(),
    gender: grade(),
    staus: 1,
    starve: info.hunger,
    starveMax: save.petComputedlInfo.hungerMax,
    clean: info.clean,
    cleanMax: save.petComputedlInfo.cleanMax,
    qqsign: '',
    viplevel: info.PDiamondLevel,
    isvipyear: info.PDiamondYear ? 1 : 0,
  })
  window.alert = (msg) => {
    if (msg === HARVEST_ALL) window.PETSendData(JSON.stringify({ data: {}, head: { ...HEAD, cmd: 8 } }))
  }
  window.close_game = (n) => {
    if (n !== 1) return
    remove()
    window.alert = alert
    window.confirm = confirm
    window.before_pay = beforePay
    open = false
  }

  void player.load('pet/fishing/main.swf')
  void send(1, pondState())
}
