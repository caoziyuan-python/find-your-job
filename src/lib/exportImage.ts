/** 把任意 DOM 节点导出为 PNG（foreignObject SVG → canvas，2x 高清）。
 *  hideActions: 导出前临时隐藏带 data-export-hide 的元素（编辑/删除/记一轮等操作按钮），
 *  让长图干净、适合直接分享。 */
export async function exportNodeAsPng(opts: {
  node: HTMLElement;
  filename: string;
  scale?: number;
}): Promise<void> {
  const { node, filename, scale = 2 } = opts;
  document.body.classList.add("export-clean");
  // 等布局稳定：优先 rAF（约 2 帧）；后台页签 rAF 会暂停，用定时器兜底
  await new Promise((r) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        r(null);
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 300);
  });
  try {
    const rect = node.getBoundingClientRect();
    const clone = node.cloneNode(true) as HTMLElement;

    // 内联全部 CSS 规则，保证 foreignObject 中样式不丢失
    let cssText = "";
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          cssText += rule.cssText + "\n";
        }
      } catch {
        /* 跨域样式表跳过 */
      }
    }
    const styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    clone.insertBefore(styleEl, clone.firstChild);
    // 克隆节点自身也打上标记：让“导出时隐藏操作按钮”等规则在 SVG 内部同样生效
    clone.classList.add("export-clean");
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;

    const html = new XMLSerializer().serializeToString(clone);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width * scale}" ` +
      `height="${rect.height * scale}" viewBox="0 0 ${rect.width} ${rect.height}">` +
      `<foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("svg-load-timeout")), 8000);
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = (e) => {
        clearTimeout(timer);
        reject(e);
      };
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-2d-context");
    // 背景保持透明：带外框的导出图圆角处不露白边，方便直接贴到任何背景上
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  } finally {
    document.body.classList.remove("export-clean");
  }
}
