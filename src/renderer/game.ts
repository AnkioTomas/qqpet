import { SwfPlayer } from './swf/player'

const swf = new URLSearchParams(location.search).get('swf')!
document.title = swf.replace(/^.*\//, '').replace(/\.swf$/, '')
const player = new SwfPlayer(document.body)
await player.load(`pet/game/${swf}`)
player.el.focus()
