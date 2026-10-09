# X 长文封面生成器 · X Article Cover Generator

[中文](#中文) · [English](#english)

![6 种风格](docs/screenshots/all-styles.png)

---

## 中文

给在 X（推特）写长文的 AI / 科技博主用的封面和配图生成器。输入标题，选风格，一键导出 PNG。

- **6 种风格**，每种 3 套配色：渐变大字、极简杂志、终端代码、大字报、卡片拼贴、霓虹网格
- **3 种尺寸**：长文封面 5:2（1500×600）、正文配图 16:9（1200×675）、方图 1:1（1080×1080），可选 2 倍高清导出
- **中文排版**：自动缩放字号；不在“长|文”这类词中间断行；逗号句号不出现在行首；避免最后一行只剩一两个字；`*星号*` 包住的词会高亮；回车可手动换行
- **AI 生图提示词面板**：按当前风格和标题生成中英文提示词（纯背景版 / 带标题文字版 / Midjourney 一行版），一键复制，可以拿去 Midjourney、Nano Banana、GPT Image 画图
- **纯前端**：没有后端，不上传任何数据；双击 `index.html` 就能离线用
- 中文 / English 界面切换

### 使用

```bash
# 方式一：直接双击 index.html（file:// 可用）
# 方式二：起一个本地服务
python3 -m http.server 8000   # 然后打开 http://localhost:8000
```

### 截图

| 编辑界面 | 终端风格 |
|---|---|
| ![](docs/screenshots/ui-zh.png) | ![](docs/screenshots/ui-terminal.png) |

| 英文界面 | 手机 |
|---|---|
| ![](docs/screenshots/ui-en.png) | ![](docs/screenshots/ui-mobile.png) |

示例导出图都在 [`samples/`](samples/) 里。

### 字体说明

不内置字体文件（Noto CJK 一个字重就十几 MB）。默认按顺序使用系统里的：Noto Sans/Serif CJK SC → 思源 → 苹方 / 宋体 → 微软雅黑。macOS 和 Windows 上效果会和示例图略有不同；想要和示例完全一致，请安装 [Noto Sans CJK SC / Noto Serif CJK SC](https://github.com/notofonts/noto-cjk)。

### 项目结构

```
index.html        页面
css/style.css     界面样式
js/text.js        Canvas 中文排版：分词、避头尾、动态规划断行、自动字号
js/styles.js      6 种封面风格的绘制代码 + 配色
js/prompts.js     AI 生图提示词模板
js/i18n.js        中英文文案
js/app.js         界面逻辑、导出 PNG
tools/            无头浏览器批量出图 / 截图脚本
```

### 加一种新风格

在 `js/styles.js` 里写一个 `function myStyle(ctx, W, H, d, p) {}`，加进 `STYLES` 数组；在 `js/prompts.js` 的 `STYLE_PROMPTS` 里补上对应的提示词。

### 许可

MIT

---

## English

A cover & image generator for AI / tech creators writing X Articles. Type a title, pick a style, export a PNG.

- **6 styles × 3 palettes**: Bold Gradient, Minimal Editorial, Terminal, Poster, Card Collage, Neon Grid
- **3 sizes**: Article cover 5:2 (1500×600), in-body 16:9 (1200×675), square 1:1 (1080×1080); optional 2x export
- **CJK-aware typesetting**: auto-fit font size, no breaks inside likely words, no line-initial commas/periods, no 1–2 character orphan lines, `*asterisks*` highlight keywords, Enter for manual line breaks
- **AI image prompt panel**: Chinese + English prompts matching the current style and title (background-only, with-headline, Midjourney one-liner), one-click copy
- **Static only**: no backend, nothing uploaded; open `index.html` directly, works offline
- Chinese / English UI toggle

### Run

Open `index.html` in a browser (file:// works), or `python3 -m http.server 8000` and visit http://localhost:8000.

### Fonts

No fonts are bundled (Noto CJK is >10 MB per weight). The renderer uses system fonts in this order: Noto Sans/Serif CJK SC → Source Han → PingFang / Songti → Microsoft YaHei. Install Noto CJK SC to match the sample images exactly.

### Add a style

Write `function myStyle(ctx, W, H, d, p) {}` in `js/styles.js`, register it in `STYLES`, and add prompt text in `js/prompts.js`.

### License

MIT
