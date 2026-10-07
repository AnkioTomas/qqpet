# Flash ↔ JS 桥接清单

Ruffle 通过 `new Function("return (" + name + ")(...arguments)")` 执行 `ExternalInterface.call`，所以带点的名字（`API.GetCursorPosition`）直接解析为全局对象上的方法。SWF 用 `ExternalInterface.addCallback` 注册的函数挂在 `<ruffle-player>` 元素上，注册发生在 `load()` 之后，用 `SwfPlayer.callback(name)` 等待。

| SWF | SWF → JS（全局） | JS → SWF（元素回调） | 原版位置 |
|---|---|---|---|
| `Action/*/Adult/*/Stand*.swf` 等 | `API.GetCursorPosition()` → `"x,y,0"`，`API.GetWindowRect()` → `"x,y,w,h"`（窗口坐标） | — | pet 组件 `window.API` |
| `talk/<1-4>/talk.swf` | `BubbleAPI.OnButtonClick(i)`，`0` → `initData.fn`，其它 → `initData["fn"+i]` | `speak(text, buttons)` | talkView |
| `reset/Adopt.swf` | `ChooseAPI.ChooseSex(0 GG / 1 MM)` | — | choosePetSex |
| `float/*.swf` | — | `setdata(v)` | float |
| `fishing/main.swf` | `SNS_GetSelfPetInfo()`、`PETSendData(json)`、`close_game(i)`、`alert(s)` | `PETEventOnReceived(json)` | fishing |
| 农场 / 小游戏（41 个） | `fscommand` → `ruffle().addFSCommandHandler` | — | 待第 4 阶段逐个核对 |

气泡皮肤目录 `talk/<n>`：`n = pinkDiamond ? (sweetHeart ? 4 : 2) : (sweetHeart ? 3 : 1)`。

## 动作结束判定（状态机）

原版每 1000/12 ms 轮询一次：`CurrentFrame() == TotalFrames() - 1` 即动作结束；`TotalFrames() == 1` 的动作（Stand 类，靠脚本动画）一直停住，直到 `nextPose` 队列非空。`overCurrentFrame` 到达后调用 `StopPlay()` 冻结在该帧。`SwfPlayer` 以 SWF 头部帧率 × 加载后经过时间模拟 `CurrentFrame`，`stop()` 冻结时钟。
