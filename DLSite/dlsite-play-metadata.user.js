// ==UserScript==
// @name         DLSite Play Metadata Copier
// @namespace    https://cybergene.dev/
// @version      0.0.1
// @description  Displays metadata from a DLSite Play work page in an easy-to-copy format
// @match        https://play.dlsite.com/*
// @grant        none
// @author       cybergene
// @source       https://github.com/cyber-gene/UserScripts
// @updateURL    https://raw.githubusercontent.com/cyber-gene/UserScripts/main/DLSite/dlsite-play-metadata.user.js
// @downloadURL  https://raw.githubusercontent.com/cyber-gene/UserScripts/main/DLSite/dlsite-play-metadata.user.js
// ==/UserScript==

(function () {
  "use strict";

  const ROOT_ID = "dlsite-play-metadata-copier";
  const LAUNCHER_ID = `${ROOT_ID}-launcher`;
  const WORK_ID_PATTERN = /\b(?:RJ|BJ|VJ|RE|BE|VE)\d{6,}\b/i;
  const LABELS = {
    circle: [
      "サークル",
      "ブランド",
      "メーカー",
      "出版社",
      "circle",
      "brand",
      "maker",
    ],
    scenario: ["シナリオ", "scenario"],
    author: ["作者", "著者", "原作", "author", "writer"],
    illustrator: ["イラスト", "作画", "原画", "illustrator", "artist"],
    voiceActor: ["声優", "出演", "キャスト", "voice actor", "cast"],
    genre: ["ジャンル", "作品形式", "カテゴリ", "genre", "category"],
    tags: ["タグ", "キーワード", "こだわり", "tag", "keyword"],
    releaseDate: ["販売日", "配信日", "発売日", "release date", "published"],
    ageRating: ["年齢指定", "レーティング", "age rating"],
    fileFormat: ["ファイル形式", "対応形式", "format"],
  };
  const FIELD_NAMES = {
    title: "作品名",
    circle: "サークル・ブランド",
    scenario: "シナリオ",
    author: "作者",
    illustrator: "イラスト・作画",
    voiceActor: "声優・出演",
    workId: "作品ID",
    genre: "ジャンル",
    tags: "タグ",
    releaseDate: "販売日",
    ageRating: "年齢指定",
    fileFormat: "ファイル形式",
    fileSize: "ファイルサイズ",
    description: "説明",
    dlsiteUrl: "DLsite URL",
    url: "DLSite Play URL",
  };

  const clean = (value) =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  const unique = (values) => [...new Set(values.map(clean).filter(Boolean))];
  const readMeta = (selector) =>
    clean(document.querySelector(selector)?.content);

  const readJsonLd = () => {
    const result = {};
    for (const script of document.querySelectorAll(
      'script[type="application/ld+json"]',
    )) {
      try {
        const parsed = JSON.parse(script.textContent);
        const roots = Array.isArray(parsed) ? parsed : [parsed];
        const items = roots.flatMap((item) => item?.["@graph"] ?? item);
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          result.title ||= clean(item.name || item.headline);
          result.description ||= clean(item.description);
          result.releaseDate ||= clean(item.datePublished || item.releaseDate);
          const creator = item.author || item.creator || item.brand;
          const creators = (Array.isArray(creator) ? creator : [creator])
            .map((entry) => clean(entry?.name ?? entry))
            .filter(Boolean);
          if (creators.length) result.author ||= creators.join("、");
          const keywords = Array.isArray(item.keywords)
            ? item.keywords
            : String(item.keywords ?? "").split(",");
          if (keywords.some(clean)) result.tags ||= unique(keywords).join("、");
        }
      } catch {
        // Ignore malformed structured data supplied by the page.
      }
    }
    return result;
  };

  const readLabelledValues = (root) => {
    const result = {};
    for (const labelElement of root.querySelectorAll(
      "dt, th, [class*='label']",
    )) {
      const label = clean(labelElement.textContent)
        .replace(/[：:]$/, "")
        .toLowerCase();
      if (!label || label.length > 30) continue;
      let value = "";
      if (labelElement.matches("dt, th")) {
        value = clean(labelElement.nextElementSibling?.textContent);
      } else if (labelElement.parentElement) {
        value = clean(
          [...labelElement.parentElement.childNodes]
            .filter((node) => node !== labelElement)
            .map((node) => node.textContent)
            .join(" "),
        ).replace(/\s*,\s*/g, "、");
      }
      if (!value || value === label || value.length > 500) continue;
      for (const [field, aliases] of Object.entries(LABELS)) {
        if (aliases.some((alias) => label === alias || label.includes(alias))) {
          result[field] ||= value;
          break;
        }
      }
    }
    return result;
  };

  const findWorkElements = () => {
    const heading = [...document.querySelectorAll("h1")].find((element) =>
      element.querySelector('a[href*="/work/=/product_id/"]'),
    );
    let root = heading?.parentElement;
    while (root && !root.querySelector('a[href*="?genre="]')) {
      root = root.parentElement;
    }
    return { heading, root: root || document };
  };

  const findText = (root, pattern) =>
    [...root.querySelectorAll("p, span")]
      .map((element) => clean(element.textContent))
      .find((text) => pattern.test(text)) || "";

  const collectMetadata = () => {
    const structured = readJsonLd();
    const { heading, root } = findWorkElements();
    const labelled = readLabelledValues(root);
    const dlsiteLink = heading?.querySelector('a[href*="/work/=/product_id/"]');
    const dlsiteUrl = dlsiteLink?.href || "";
    const workId = (
      decodeURIComponent(location.href).match(WORK_ID_PATTERN)?.[0] ||
      dlsiteUrl.match(WORK_ID_PATTERN)?.[0] ||
      ""
    ).toUpperCase();
    const title = clean(
      heading?.textContent ||
        structured.title ||
        readMeta('meta[property="og:title"]') ||
        document.title.replace(/\s*[-|｜]\s*DLsite Play.*$/i, ""),
    );
    const circle = clean(
      heading?.nextElementSibling?.querySelector('a[href*="?q="]')?.textContent,
    );
    const genres = unique(
      [...root.querySelectorAll('a[href*="?genre="]')].map(
        (link) => link.textContent,
      ),
    );
    const badges = unique(
      [...root.querySelectorAll('ul[class*="_icons_"] li')].map(
        (element) => element.textContent,
      ),
    );

    return {
      title,
      circle: labelled.circle || circle,
      scenario: labelled.scenario || "",
      author: labelled.author || structured.author || "",
      illustrator: labelled.illustrator || "",
      voiceActor: labelled.voiceActor || "",
      workId,
      genre: labelled.genre || genres.join("、"),
      tags: labelled.tags || structured.tags || "",
      releaseDate:
        labelled.releaseDate ||
        structured.releaseDate ||
        findText(root, /^\d{4}年\d{1,2}月\d{1,2}日\s*発売$/),
      ageRating:
        labelled.ageRating ||
        badges.find((value) => /^(?:R18|全年齢)$/i.test(value)) ||
        "",
      fileFormat:
        labelled.fileFormat ||
        badges.find((value) => !/^(?:R18|全年齢)$/i.test(value)) ||
        "",
      fileSize: findText(root, /^\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB)$/i),
      description:
        structured.description ||
        readMeta('meta[property="og:description"]') ||
        "",
      dlsiteUrl,
      url: location.href,
    };
  };

  const filledEntries = (metadata) =>
    Object.entries(metadata).filter(([, value]) => clean(value));
  const formatMetadata = (metadata, format) => {
    if (format === "json") return JSON.stringify(metadata, null, 2);
    if (format === "markdown")
      return filledEntries(metadata)
        .map(([key, value]) => `- **${FIELD_NAMES[key]}**: ${value}`)
        .join("\n");
    return filledEntries(metadata)
      .map(([key, value]) => `${FIELD_NAMES[key]}: ${value}`)
      .join("\n");
  };

  const showPopup = () => {
    document.getElementById(ROOT_ID)?.remove();
    const overlay = document.createElement("div");
    overlay.id = ROOT_ID;
    overlay.innerHTML = `
      <style>
        #${ROOT_ID} { position:fixed; inset:0; z-index:2147483647; display:grid; place-items:center;
          padding:20px; background:rgba(15,23,42,.58); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif }
        #${ROOT_ID} * { box-sizing:border-box }
        #${ROOT_ID} .dpm-dialog { width:min(720px,100%); max-height:min(760px,92vh); display:flex;
          flex-direction:column; gap:14px; padding:20px; color:#1f2937; background:#fff;
          border-radius:12px; box-shadow:0 24px 64px rgba(0,0,0,.3) }
        #${ROOT_ID} .dpm-header, #${ROOT_ID} .dpm-actions { display:flex; align-items:center; gap:10px }
        #${ROOT_ID} .dpm-header { justify-content:space-between }
        #${ROOT_ID} h2 { margin:0; font-size:18px }
        #${ROOT_ID} textarea { width:100%; min-height:360px; resize:vertical; padding:12px;
          border:1px solid #cbd5e1; border-radius:8px; color:#111827; background:#f8fafc;
          font:13px/1.65 ui-monospace,monospace }
        #${ROOT_ID} select, #${ROOT_ID} button { min-height:38px; padding:7px 12px;
          border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#1f2937;
          font:inherit; cursor:pointer }
        #${ROOT_ID} .dpm-copy { margin-left:auto; border-color:#2563eb; color:#fff;
          background:#2563eb; font-weight:600 }
        #${ROOT_ID} .dpm-close { border:0; padding:4px 8px; font-size:22px }
        #${ROOT_ID} .dpm-status { min-height:20px; margin:0; color:#047857; font-size:13px }
      </style>
      <section class="dpm-dialog" role="dialog" aria-modal="true" aria-labelledby="dpm-title">
        <div class="dpm-header"><h2 id="dpm-title">作品メタデータ</h2>
          <button class="dpm-close" type="button" aria-label="閉じる">×</button></div>
        <textarea aria-label="作品メタデータ" spellcheck="false"></textarea>
        <div class="dpm-actions"><label>形式 <select><option value="text">テキスト</option>
          <option value="markdown">Markdown</option><option value="json">JSON</option></select></label>
          <button class="dpm-refresh" type="button">再取得</button>
          <button class="dpm-copy" type="button">クリップボードにコピー</button></div>
        <p class="dpm-status" aria-live="polite"></p>
      </section>`;
    const textarea = overlay.querySelector("textarea");
    const select = overlay.querySelector("select");
    const status = overlay.querySelector(".dpm-status");
    let metadata = collectMetadata();
    const render = () => {
      textarea.value = formatMetadata(metadata, select.value);
    };
    const close = () => overlay.remove();
    select.addEventListener("change", render);
    overlay.querySelector(".dpm-refresh").addEventListener("click", () => {
      metadata = collectMetadata();
      render();
      status.textContent = "ページから再取得しました。";
    });
    overlay.querySelector(".dpm-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
      } catch {
        textarea.select();
        document.execCommand("copy");
      }
      status.textContent = "コピーしました。";
    });
    overlay.querySelector(".dpm-close").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    document.body.appendChild(overlay);
    render();
    textarea.focus();
  };

  const launcher = document.createElement("button");
  launcher.id = LAUNCHER_ID;
  launcher.type = "button";
  launcher.textContent = "メタデータを表示";
  launcher.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483646;
    padding: 11px 16px;
    border: 0;
    border-radius: 999px;
    color: #fff;
    background: #2563eb;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .25);
    font: 600 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
  `;
  launcher.addEventListener("click", showPopup);
  document.body.appendChild(launcher);

  let previousUrl = location.href;
  const updateLauncherVisibility = () => {
    const isWorkPage =
      WORK_ID_PATTERN.test(decodeURIComponent(location.href)) ||
      Boolean(document.querySelector('h1 a[href*="/work/=/product_id/"]'));
    launcher.hidden = !isWorkPage;
  };

  updateLauncherVisibility();
  setInterval(() => {
    if (location.href !== previousUrl) {
      previousUrl = location.href;
      document.getElementById(ROOT_ID)?.remove();
    }
    updateLauncherVisibility();
  }, 500);
})();
