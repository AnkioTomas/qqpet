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
