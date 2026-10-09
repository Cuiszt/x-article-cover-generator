/* AI image prompt templates (CN + EN) per style. */
(function (global) {
  'use strict';

  var STYLE_PROMPTS = {
    gradient: {
      zh: '大胆的流体渐变背景，{colors_zh}，柔和的光晕和细网格线，几道同心圆光环，干净的科技感，留出左侧大面积空白用于放标题',
      en: 'bold fluid gradient background in {colors_en}, soft glowing orbs and a subtle fine grid, faint concentric rings, clean tech aesthetic, large empty area on the left for a headline',
      colors: { aurora: ['深紫到蓝再到青色', 'deep purple to blue to cyan'], sunset: ['酒红到粉再到橙黄', 'wine red to pink to orange-gold'], mint: ['墨绿到翠绿再到天蓝', 'deep green to emerald to sky blue'] }
    },
    editorial: {
      zh: '极简杂志编辑风版面，{colors_zh}，细腻纸张纹理，细线分隔，大量留白，克制优雅的排版感，像一本科技杂志的专栏头图',
      en: 'minimal editorial magazine layout, {colors_en}, fine paper texture, thin hairline rules, generous negative space, restrained elegant typography feel, like the header of a tech magazine column',
      colors: { paper: ['米白纸张底色配黑色和一点橙红', 'off-white paper with black ink and a touch of burnt orange'], night: ['深黑底色配米白和金色', 'near-black background with cream and gold accents'], sage: ['鼠尾草绿底色配深绿', 'sage green background with deep green ink'] }
    },
    terminal: {
      zh: '深色代码终端窗口的界面插画，{colors_zh}，等宽字体代码行、闪烁光标、窗口左上角三个圆点，开发者氛围，背景有点阵',
      en: 'dark code terminal window UI illustration, {colors_en}, monospace code lines, blinking block cursor, three window dots in the corner, developer vibe, dotted background',
      colors: { github: ['深灰底色配荧光绿和蓝色', 'charcoal background with neon green and blue'], dracula: ['深紫灰底色配绿色和粉色', 'dark purple-grey with green and pink highlights'], amber: ['黑底配琥珀色复古显示器', 'black background with amber retro CRT glow'] }
    },
    poster: {
      zh: '大字报风格海报，{colors_zh}，巨大的粗体字、底部黑黄警示斜纹、强烈对比、平面设计、波普感、极具冲击力',
      en: 'bold typographic poster, {colors_en}, giant heavy letters, hazard stripes along the bottom, high contrast flat graphic design, pop-art punch',
      colors: { yellow: ['亮黄底色配黑字和红色标签', 'bright yellow with black type and a red label'], red: ['正红底色配米白字和黑色', 'vivid red with cream type and black'], mono: ['米白底色配黑字和蓝色点缀', 'off-white with black type and a blue accent'] }
    },
    collage: {
      zh: '扁平风拼贴插画：几张略微倾斜的圆角卡片（聊天气泡、柱状图、图片缩略图、便利贴），{colors_zh}，柔和投影，点阵背景，轻松友好的 AI 工具氛围',
      en: 'flat collage illustration of slightly tilted rounded UI cards (chat bubbles, bar chart, image thumbnail, sticky note), {colors_en}, soft drop shadows, dotted background, friendly AI-tools vibe',
      colors: { lilac: ['淡紫底色配紫色', 'pale lilac with violet accents'], peach: ['蜜桃色底色配橙色', 'peach background with orange accents'], ink: ['深色底色配青色和粉色', 'dark background with cyan and pink accents'] }
    },
    neon: {
      zh: '赛博朋克霓虹网格场景，{colors_zh}，地平线发光、透视网格地面、星空、四角取景框，复古未来主义，中央留出放标题的空间',
      en: 'synthwave neon grid scene, {colors_en}, glowing horizon, perspective grid floor, starry sky, viewfinder corner brackets, retro-futurism, empty center space for a title',
      colors: { cyan: ['深蓝夜空配青色霓虹', 'midnight blue with cyan neon'], violet: ['深紫夜空配品红霓虹', 'deep purple with magenta neon'], lime: ['墨绿夜空配荧光绿霓虹', 'dark green with lime neon'] }
    }
  };

  var SIZE_HINT = {
    cover: { ar: '5:2', zh: '超宽横幅 5:2 比例', en: 'ultra-wide 5:2 banner' },
    body: { ar: '16:9', zh: '16:9 横版', en: '16:9 landscape' },
    square: { ar: '1:1', zh: '1:1 方图', en: '1:1 square' }
  };

  function fill(tpl, styleId, paletteId, lang) {
    var sp = STYLE_PROMPTS[styleId];
    var c = (sp.colors[paletteId] || sp.colors[Object.keys(sp.colors)[0]]);
    return tpl.replace('{colors_zh}', c[0]).replace('{colors_en}', c[1]);
  }

  /**
   * Build prompts. data: {title, subtitle}. Returns {bgZh, bgEn, textZh, textEn, mj}.
   *  - bg*: background art only (no text) – overlay title with this tool afterwards.
   *  - text*: art with the title rendered in the image (Nano Banana / GPT Image are decent at CJK text).
   *  - mj: Midjourney line with --ar.
   */
  function build(styleId, paletteId, sizeId, data) {
    var sp = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.gradient;
    var sz = SIZE_HINT[sizeId] || SIZE_HINT.cover;
    var title = (global.TextKit ? global.TextKit.stripMarkup(data.title) : data.title || '').trim();
    var sub = (data.subtitle || '').trim();
    var baseZh = fill(sp.zh, styleId, paletteId, 'zh');
    var baseEn = fill(sp.en, styleId, paletteId, 'en');
    var topicZh = title ? '，画面主题呼应「' + title + '」' : '';
    var topicEn = title ? ', themed around the idea: "' + title + '"' : '';
    var bgZh = sz.zh + '的社交媒体长文封面背景图：' + baseZh + topicZh + '。不要出现任何文字、字母、水印或 logo，高清，细节干净。';
    var bgEn = 'Social media article cover background, ' + sz.en + ': ' + baseEn + topicEn + '. No text, no letters, no watermark, no logo. High resolution, crisp clean details.';
    var textZh = sz.zh + '的社交媒体长文封面：' + baseZh + '。画面上用醒目的粗体中文排版标题「' + title + '」' + (sub ? '，下方一行小字副标题「' + sub + '」' : '') + '，文字必须准确无错字，清晰可读，排版有设计感。';
    var textEn = 'Social media article cover, ' + sz.en + ': ' + baseEn + '. Render the headline in bold Simplified Chinese typography exactly as: "' + title + '"' + (sub ? ', with a smaller subtitle line: "' + sub + '"' : '') + '. Text must be spelled exactly, sharp and legible, well-designed layout.';
    var mj = baseEn + topicEn + ', no text --ar ' + sz.ar;
    return { bgZh: bgZh, bgEn: bgEn, textZh: textZh, textEn: textEn, mj: mj };
  }

  global.CoverPrompts = { build: build };
})(window);
