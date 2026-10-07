# QQPet

QQ 宠物跨平台复刻（Windows / macOS / Linux），基于 Arctic Penguin T800 逆向重建。Flash 内容由 [Ruffle](https://ruffle.rs) 播放。

美术资源和 SWF 版权归腾讯所有，仓库必须保持私有。

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

## 目录

| 路径 | 说明 |
|---|---|
| `src/main` | 主进程：窗口、托盘、`app://` 协议 |
| `src/preload` | `window.qqpet` 接口 |
| `src/renderer` | 界面（原生 TypeScript），`swf/` 为 Ruffle 封装 |
| `src/shared` | 主进程与渲染层共享的 IPC 类型 |
| `resources/pet` | 原版资源，`npm run import-assets -- <app.asar>` 可重新导入 |
| `docs/reverse` | 原版逆向笔记与还原代码 |
| `tools/` | 反混淆脚本、CDP 调试脚本 |
