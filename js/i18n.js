(function (global) {
  'use strict';
  global.I18N = {
    zh: {
      appName: 'X 长文封面生成器', tagline: '给 AI 创作者的封面 & 配图工具 · 纯前端 · 离线可用 · 开源',
      content: '内容', title: '标题', titleHint: '用 *星号* 包住关键词可高亮；按回车可手动换行。', subtitle: '副标题（可选）', handle: '作者账号', tag: '角标（可选）',
      style: '风格', palette: '配色', size: '尺寸', export: '导出', exportPng: '下载 PNG', exportAll: '下载全部尺寸', hd: '2 倍高清导出',
      preview: '预览', promptPanel: 'AI 生图提示词', promptIntro: '想用 Midjourney / Nano Banana / GPT Image 画一张更有质感的封面？复制下面的提示词。',
      bgOnly: '纯背景（不含文字，导出后再叠字）', withText: '带标题文字（适合 Nano Banana、GPT Image）', mj: 'Midjourney 一行版', copy: '复制', copied: '已复制',
      chinese: '中文', english: 'English', reset: '恢复示例', footer: 'MIT 开源 · 所有处理都在你的浏览器里完成，不上传任何数据',
      tips: '小贴士：X 长文封面是 5:2，正文配图推荐 16:9。标题太长会自动缩小字号并换行。'
    },
    en: {
      appName: 'X Article Cover Generator', tagline: 'Covers & images for AI creators · static · works offline · open source',
      content: 'Content', title: 'Title', titleHint: 'Wrap keywords in *asterisks* to highlight; press Enter for a manual line break.', subtitle: 'Subtitle (optional)', handle: 'Author handle', tag: 'Label (optional)',
      style: 'Style', palette: 'Palette', size: 'Size', export: 'Export', exportPng: 'Download PNG', exportAll: 'Download all sizes', hd: 'Export at 2x',
      preview: 'Preview', promptPanel: 'AI image prompts', promptIntro: 'Want richer art from Midjourney / Nano Banana / GPT Image? Copy these prompts.',
      bgOnly: 'Background only (no text — add the title here afterwards)', withText: 'With headline text (Nano Banana, GPT Image)', mj: 'Midjourney one-liner', copy: 'Copy', copied: 'Copied',
      chinese: '中文', english: 'English', reset: 'Reset sample', footer: 'MIT licensed · everything runs in your browser, nothing is uploaded',
      tips: 'Tip: X Article covers are 5:2; 16:9 works best for in-body images. Long titles shrink and wrap automatically.'
    }
  };
})(window);
