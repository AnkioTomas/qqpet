import { BrowserWindow } from 'electron'

const PAGE = `<!doctype html><meta charset="utf-8"><title>透明浏览器</title>
<style>
html,body{margin:0;height:100%;background:transparent;font:12px sans-serif}
body{display:flex;flex-direction:column}
#bar{display:flex;gap:6px;align-items:center;padding:4px 8px;background:#fffd;border-radius:8px 8px 0 0;-webkit-app-region:drag}
#bar>*{-webkit-app-region:no-drag}
#url{flex:1}
webview{flex:1}
</style>
<div id="bar"><input id="url" placeholder="输入网址后按回车"><input id="op" type="range" min="0.05" max="1" step="0.05" value="0.6" title="透明度（可用滚轮调节）"><button id="x">关闭</button></div>
<webview id="web" src="https://www.baidu.com"></webview>
<script>
const web = document.getElementById('web'), url = document.getElementById('url'), op = document.getElementById('op')
const fade = () => (web.style.opacity = op.value)
fade()
op.oninput = fade
op.onwheel = (e) => ((op.value = +op.value - Math.sign(e.deltaY) * 0.05), fade())
url.onkeydown = (e) => e.key === 'Enter' && (web.src = /^\\w+:/.test(url.value) ? url.value : 'https://' + url.value)
web.addEventListener('did-navigate', (e) => (url.value = e.url))
document.getElementById('x').onclick = () => close()
</script>`

/** A see-through, always-on-top web page; the toolbar stays opaque, the page fades. */
export function openBrowser(): void {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: { webviewTag: true, sandbox: true },
  })
  win.webContents.on('will-attach-webview', (_e, prefs) => delete prefs.preload)
  void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`)
}
