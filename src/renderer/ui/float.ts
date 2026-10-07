import { SwfPlayer } from '../swf/player'

const el = document.createElement('div')
el.className = 'float-mood'
document.getElementById('pet')!.appendChild(el)
const player = new SwfPlayer(el)
const loaded = player.load('pet/float/mood.swf')

/** "+v" mood animation above the pet. */
export async function floatMood(v: number): Promise<void> {
  await loaded
  const setdata = await player.callback('setdata')
  setdata(v)
}
