import { pondCommand, pondState } from '../pet/fishing'
import { info, save } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openFrame } from './box'
import './css/fishing.css'
import { div } from './dom'

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

  window.PETSendData = (json) => {
    const { head, data } = JSON.parse(json)
    const reply = pondCommand(head.cmd, data)
    void send(head.cmd, reply)
    if (head.cmd === 4 && reply.result === 0) {
      cooldown.classList.add('controlTFActive')
      setTimeout(() => cooldown.classList.remove('controlTFActive'), 1000)
    }
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
  })
  window.alert = (msg) => {
    if (msg === HARVEST_ALL) window.PETSendData(JSON.stringify({ data: {}, head: { ...HEAD, cmd: 8 } }))
  }
  window.close_game = (n) => {
    if (n !== 1) return
    remove()
    window.alert = alert
    open = false
  }

  void player.load('pet/fishing/main.swf')
  void send(1, pondState())
}
