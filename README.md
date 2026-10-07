# QQPet

QQ 宠物跨平台复刻（Windows / macOS / Linux），基于 Arctic Penguin T800 逆向重建。Flash 内容由 [Ruffle](https://ruffle.rs) 播放。

美术资源和 SWF 版权归腾讯所有，仓库必须保持私有。

## 功能

- **养成**：选蛋领养、成长与升级、饥饿/清洁/心情/健康、生病就医、死亡与复活、重生（可换性别）。
- **日常**：打工、上学（含升学考试）、全国旅游（奇遇、纪念品、旅行相簿明信片），关闭应用期间的进度照常计时。
- **物品**：商城与购物车、背包、食物/清洁/药品/玩具、限时物品、粉钻与甜蜜情侣。
- **任务与邮件**：今日任务（按宠物需求和节假日生成）、逗逗我、学习打工、旅游任务；签到与图鉴；节日、生日、旅行明信片邮件。
- **活动**：池塘（养鱼）、农场（QQFarm，金币即元宝）、密室探险、6 类 98 个小游戏（独立窗口，按游戏时长奖励）。
- **AI（可选）**：接入任意 OpenAI 兼容接口，宠物闲聊、改写台词、点评或翻译剪贴板文字。
- **其他**：天气播报、节日问候、免打扰、透明度、开机自启、高清画质（@2x 素材）、存档导入导出（兼容原版 `config.json`，首次启动的选蛋页也可直接导入）。

存档位于 `userData/save.json`，导入时旧存档备份为 `save.json.bak`。

## 开发

```bash
git lfs install && git lfs pull   # resources/pet 由 Git LFS 管理
npm ci
npm run dev
```

## 构建

```bash
npm run dist   # 类型检查 + 构建 + 打包当前平台安装包到 dist/
```

推送到 `main` 由 GitHub Actions 打出三平台安装包；推送 `v*` 标签自动发布 Release。

## 改过的 SWF

以下文件用 [JPEXS FFDec](https://github.com/jindrapetrik/jpexs-decompiler) 打过补丁，重新导入资源时不要覆盖：

| 文件 | 改动 |
|---|---|
| `resources/pet/mstx/qq_mstx.swf` | 隐藏需要联网的「兑换礼包」「魔法爱情石」按钮 |
| `resources/pet/qqfarm/Farm.swf` | 允许在 `file://` 之外启动；「金币」改为「元宝」；商店可买的种子排前、其余置灰，购买后弹出提示 |
| `resources/pet/qqfarm/props.swf` | 素材中的「金币」文字改为「元宝」 |

## 目录

| 路径 | 说明 |
|---|---|
| `src/main` | 主进程：窗口、托盘、`app://` 协议、存档、AI 与天气请求 |
| `src/preload` | `window.qqpet` 接口 |
| `src/renderer` | 界面（原生 TypeScript），`pet/` 为养成逻辑，`ui/` 为各窗口，`swf/` 为 Ruffle 封装 |
| `src/shared` | 主进程与渲染层共享的 IPC 与存档类型 |
| `resources/pet` | 原版资源，`npm run import-assets -- <app.asar>` 可重新导入 |
| `tools/` | 反混淆脚本、原版 CSS 移植脚本、CDP 调试脚本 |
