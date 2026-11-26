# 博丽神社游艺厅 · 东方同人小游戏合集

> **Gensokyo Mini-Games Hub** — 纯前端、零后端、即开即玩的东方 Project 主题小游戏大厅，支持桌面与移动端，已部署至 GitHub Pages。
>
> - **在线游玩 (GitHub Pages)**：https://julywhisky0.github.io/gensokyo-arcade-hub/
> - **项目仓库 (GitHub)**：https://github.com/JulyWhisky0/gensokyo-arcade-hub

## 收录游戏

| 游戏 | 主题角色 | 类型 | 亮点玩法 |
| --- | --- | --- | --- |
| **幻想乡合成大西瓜** | 伊吹萃香 & 幻想乡众角色 | 物理合成 | 11 阶东方角色球进化链（毛玉 → 伊吹萃香大西瓜）、2D 刚体物理碰撞、连击音效与危险线预警 |
| **魔法森林噗哟噗哟** | 雾雨魔理沙 / 博丽灵梦等 | 益智消除 | 6×12 经典魔法气泡规则、同色融合连接、多连锁符卡切入演出、多种难度与触控按键 |
| **幻想乡管道鸟 · 竹林疾飞** | 射命丸文 / 博丽灵梦 / 琪露诺 | 动作躲避 | 三位可选飞行角色、竹林与鸟居障碍、昼夜红魔异变视差背景、P 点星收集与奖牌系统 |

## 核心特性

- **博丽神社美学视觉**：朱红鸟居、注连绳与纸垂、暖光纸灯笼、旋转博丽大结界魔法阵与阴阳玉徽章、鎏金角饰卡片，以及 3D 飘樱、神社金色灵火与视差星辉动态画布（进入游戏舞台后自动暂停背景动画以释放全部性能）。
- **赛钱箱战绩榜（本地存档）**：基于 `localStorage` 自动保存每款游戏的最高分、历史成绩与游玩次数，支持单项或全部清除。
- **统一游艺厅 HUD**：实时分数、最高分、额外状态徽标、暂停/继续、一键重开、全局静音（跨游戏持久化同步）以及操作说明弹窗。
- **Hash 路由**：使用 `#/` 与 `#/game/<id>` 路由，在 GitHub Pages 子路径下刷新永不 404。
- **纯前端零外部素材依赖**：图形由 Canvas 2D 与 SVG 实时绘制，音效由 Web Audio API 实时合成（字体带有离线系统优雅回退）。

## 本地运行

需要 Node.js 18+ 环境：

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run typecheck

# 构建生产静态文件（输出至 dist/）
npm run build

# 本地预览构建产物
npm run preview
```

## 插件化架构：如何添加新游戏

所有游戏均遵循 `src/types/game.ts` 中定义的统一契约 `GameMetadata`：

1. 在 `src/games/<your-game>/index.ts` 中实现并导出符合 `GameMetadata` 接口的对象，完成 `mount(ctx)`、`destroy()`、`restart()`（及可选 `setPaused(paused)`）。
2. 在 `src/types/game.ts` 的 `GameMetadata['id']` 联合类型中补充新游戏 ID。
3. 在 `src/games/registry.ts` 中导入新游戏并加入 `GAMES` 列表。

大厅主页的卡片展示、搜索筛选、Hash 路由、顶部 HUD、静音广播与赛钱箱战绩榜均会自动接入。

## 部署到 GitHub Pages

本项目已内置 GitHub Actions 自动部署配置（`.github/workflows/deploy.yml`），且 `vite.config.ts` 已配置 `base: './'`，推送至 [`JulyWhisky0/gensokyo-arcade-hub`](https://github.com/JulyWhisky0/gensokyo-arcade-hub) 后即可自动发布至 [`https://julywhisky0.github.io/gensokyo-arcade-hub/`](https://julywhisky0.github.io/gensokyo-arcade-hub/)：

1. 将本仓库推送到 GitHub 的 `main` 分支（`https://github.com/JulyWhisky0/gensokyo-arcade-hub`）。
2. 在 GitHub 仓库页面打开 **Settings → Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
4. 推送到 `main` 分支或手动触发 `Deploy to GitHub Pages` 工作流，即可自动构建并发布 `dist/` 到 `https://julywhisky0.github.io/gensokyo-arcade-hub/`。

## 版权声明

本项目为 **东方 Project（上海爱丽丝幻乐团 / ZUN）** 二次创作同人小游戏合集，仅用于技术交流与休闲娱乐。
