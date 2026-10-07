# 原版主进程逆向笔记（Arctic Penguin T800）

还原后的完整代码见 `original-main.js`（由 `tools/deobfuscate/deob.cjs` 生成，解码函数名为 `e`）。

## 窗口

- 一个覆盖主屏工作区的透明无边框窗口，`alwaysOnTop: 'screen-saver'`，默认 `setIgnoreMouseEvents(true, { forward: true })`。
- 页面由 express 在 `127.0.0.1:33385/<随机路径>u_getOut/` 提供，原因是 PepperFlash 不能从 `file://` 加载。新版用 `app://bundle/` 协议替代。

## 存档

- `electron-store`，文件 `userData/config.json`，正式版 `encryptionKey: null`，即明文 JSON。
- 根键 `petInfoData`：`havePet`、`petInfo`、`petComputedlInfo`、`studyInfo`、`activeOption`、`selfGoodDatas`、`gameSaveDatas`、`illustrated`、`saveJsonData`、`nowTimeLine`、`isBury`、`saveNum`、`machineId`、`oId`。
- 默认值和逐字段校验见 `original-main.js` 中的 `q`/`H`/`R`/`J`/`U`/`V` 表和 `Se()`。

## IPC（渲染层 → 主进程）

| 通道 | 作用 |
|---|---|
| `main_h_m_saveDatas` | 按顶层分组合并写入存档 |
| `main_h_m_mousePenetration` | 切换点击穿透 |
| `main_h_m_bus` | `traysIco` 托盘状态、`loginOut`、`exit`、`showMessageBox`（含埋葬后重开）、`setFocusable`、`setAlwaysOnTop`、`startupSelf` 开机自启 |
| `main_h_m_service` | 远程接口代理（见下）；`api: 'back'` 时调用本地 `copy` 剪贴板 |
| `main_h_m_gt` | 读取主进程时间线 |
| `main_h_m_console` / `main_h_m_heartbeat` | 日志 / 心跳（空实现） |

主进程 → 渲染层：`main_m_h_bus`（`load` 初始数据、托盘点击 `openPetStateInfoPage`、右键 `openRightMenu`、`clearLocalStorge`）、`main_m_h_gt`（每秒推送时间线）、`main_m_h_heartbeat`（5 秒）、`main_m_h_serviceBack`。

## 远程接口（新版全部删除）

`https://shuyangai.online/pet/` 下的 `usersDatas/<machineId>/v.json`、`usersDatas/<machineId>/e.json`、`updater/l.json`、`updater/sp.json`，响应体 AES-256-CBC，key 为 `sha256(md5("anguel"))`。站点已失效。

## 托盘

`img_res/Tray/<sex>/<state>/<n>.ico` 每 300ms 轮播；状态与提示文本见 `traysModel`。

## 新版对应（`window.qqpet`，定义见 `src/shared/ipc.ts`）

| 原版 | 新版 |
|---|---|
| `main_m_h_bus` `load` 推送初始数据 | `load()` 主动拉取 |
| `main_h_m_saveDatas` | `save(patch)`，合并语义不变 |
| `main_h_m_mousePenetration` | `setClickThrough()`；悬停判断改由 `onCursor()` 推送的光标位置完成 |
| bus `traysIco` | `setTrayState()`，图标改用导入时生成的 PNG |
| bus `loginOut` / `exit` | `quit()` |
| bus `showMessageBox` | `messageBox()` 返回按钮序号 |
| bus `showMessageBox` + `fnType: relaunch` + `opt.bury` | `resetPet()`；清理 localStorage 由渲染层在调用前自行完成 |
| bus `setFocusable` / `setAlwaysOnTop` / `startupSelf` | `setFocusable()` / `setAlwaysOnTop()` / `setAutoStart()` |
| service `api: 'back'` `copy` | `copyText()` |
| 托盘 click / right-click → bus `openPetStateInfoPage` / `openRightMenu` | `onTrayClick()`，`kind` 为 `state` / `menu`；Linux 上来自托盘菜单，无坐标 |
| `main_m_h_gt` 时间线、`main_m_h_heartbeat`、`main_h_m_console` | 删除；时间统一用本地时钟 |
| `main_h_m_service` 远程接口 | 删除；渲染层按"请求失败"路径处理 |
| `before-quit` 吞掉第一次退出请求 | 删除，避免拦截系统关机 |

存档文件改为 `userData/save.json`（只含原 `petInfoData` 内容，去掉 `machineId`/`oId`）。首次启动若不存在，会自动从 `appData/Arctic Penguin/config.json` 迁移。
