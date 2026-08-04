// ==UserScript==
// @name         DLSite Play Metadata Copier
// @namespace    https://cybergene.dev/
// @version      1.0.0
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
  const toArray = (value) =>
    unique(Array.isArray(value) ? value : String(value ?? "").split(/[、,]/));
  const parseDate = (value) => {
    const text = clean(value);
    if (!text) return null;
    const japaneseDate = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (japaneseDate) {
      const [, year, month, day] = japaneseDate;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  };
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
      voiceActor: toArray(labelled.voiceActor),
      workId,
      genre: toArray(labelled.genre || genres),
      tags: labelled.tags || structured.tags || "",
      releaseDate: parseDate(
        labelled.releaseDate ||
          structured.releaseDate ||
          findText(root, /^\d{4}年\d{1,2}月\d{1,2}日\s*発売$/),
      ),
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
    Object.entries(metadata).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : Boolean(clean(value)),
    );
  const displayValue = (value) =>
    Array.isArray(value)
      ? value.join("、")
      : value instanceof Date
        ? value.toISOString().slice(0, 10)
        : value;
  const displayFieldValue = (key, value) => {
    if (key === "voiceActor" && Array.isArray(value)) return value.join(" / ");
    if (key === "genre" && Array.isArray(value)) return value.join("; ");
    return displayValue(value);
  };
  const formatMetadata = (metadata, format) => {
    if (format === "json") return JSON.stringify(metadata, null, 2);
    if (format === "markdown")
      return filledEntries(metadata)
        .map(
          ([key, value]) => `- **${FIELD_NAMES[key]}**: ${displayValue(value)}`,
        )
        .join("\n");
    return filledEntries(metadata)
      .map(([key, value]) => `${FIELD_NAMES[key]}: ${displayValue(value)}`)
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
        #${ROOT_ID} .dpm-fields { min-height:360px; overflow:auto; border:1px solid #cbd5e1;
          border-radius:8px; background:#f8fafc }
        #${ROOT_ID} .dpm-field { display:grid; grid-template-columns:minmax(110px,160px) 1fr auto;
          align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid #e2e8f0 }
        #${ROOT_ID} .dpm-field:last-child { border-bottom:0 }
        #${ROOT_ID} .dpm-field-label { font-size:13px; font-weight:600 }
        #${ROOT_ID} .dpm-field-value { min-width:0; overflow-wrap:anywhere; white-space:pre-wrap;
          font:13px/1.55 ui-monospace,monospace; user-select:text }
        #${ROOT_ID} .dpm-field-copy { min-height:32px; padding:5px 10px }
        #${ROOT_ID} select, #${ROOT_ID} button { min-height:38px; padding:7px 12px;
          border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#1f2937;
          font:inherit; cursor:pointer }
        #${ROOT_ID} .dpm-copy { margin-left:auto; border-color:#2563eb; color:#fff;
          background:#2563eb; font-weight:600 }
        #${ROOT_ID} .dpm-close { border:0; padding:4px 8px; font-size:22px }
        #${ROOT_ID} .dpm-status { min-height:20px; margin:0; color:#047857; font-size:13px }
        @media (max-width:600px) { #${ROOT_ID} .dpm-field { grid-template-columns:1fr auto }
          #${ROOT_ID} .dpm-field-label { grid-column:1 / -1 } }
      </style>
      <section class="dpm-dialog" role="dialog" aria-modal="true" aria-labelledby="dpm-title">
        <div class="dpm-header"><h2 id="dpm-title">作品メタデータ</h2>
          <button class="dpm-close" type="button" aria-label="閉じる">×</button></div>
        <textarea aria-label="作品メタデータ" spellcheck="false"></textarea>
        <div class="dpm-fields" hidden></div>
        <div class="dpm-actions"><label>形式 <select><option value="text">テキスト</option>
          <option value="markdown">Markdown</option><option value="json">JSON</option>
          <option value="fields" selected>項目別</option></select></label>
          <button class="dpm-refresh" type="button">再取得</button>
          <button class="dpm-copy" type="button">クリップボードにコピー</button></div>
        <p class="dpm-status" aria-live="polite"></p>
      </section>`;
    const textarea = overlay.querySelector("textarea");
    const fields = overlay.querySelector(".dpm-fields");
    const select = overlay.querySelector("select");
    const status = overlay.querySelector(".dpm-status");
    const copyAllButton = overlay.querySelector(".dpm-copy");
    let metadata = collectMetadata();
    const copyText = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const temporary = document.createElement("textarea");
        temporary.value = text;
        overlay.appendChild(temporary);
        temporary.select();
        document.execCommand("copy");
        temporary.remove();
      }
    };
    const render = () => {
      const showsFields = select.value === "fields";
      textarea.hidden = showsFields;
      fields.hidden = !showsFields;
      copyAllButton.hidden = showsFields;
      if (showsFields) {
        fields.replaceChildren();
        for (const [key, value] of filledEntries(metadata)) {
          const row = document.createElement("div");
          row.className = "dpm-field";
          const label = document.createElement("div");
          label.className = "dpm-field-label";
          label.textContent = FIELD_NAMES[key];
          const displayedValue = String(displayFieldValue(key, value));
          const valueElement = document.createElement("div");
          valueElement.className = "dpm-field-value";
          valueElement.textContent = displayedValue;
          const copyButton = document.createElement("button");
          copyButton.type = "button";
          copyButton.className = "dpm-field-copy";
          copyButton.textContent = "コピー";
          copyButton.addEventListener("click", async () => {
            await copyText(displayedValue);
            status.textContent = `${FIELD_NAMES[key]}をコピーしました。`;
          });
          row.append(label, valueElement, copyButton);
          fields.appendChild(row);
        }
        return;
      }
      textarea.value = formatMetadata(metadata, select.value);
    };
    const close = () => overlay.remove();
    select.addEventListener("change", render);
    overlay.querySelector(".dpm-refresh").addEventListener("click", () => {
      metadata = collectMetadata();
      render();
      status.textContent = "ページから再取得しました。";
    });
    copyAllButton.addEventListener("click", async () => {
      await copyText(textarea.value);
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
    select.focus();
  };

  const launcher = document.createElement("button");
  launcher.id = LAUNCHER_ID;
  launcher.type = "button";
  launcher.textContent = "メタデータを表示";
  launcher.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
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
  const updateLauncherPosition = () => {
    const contentPane = document.querySelector('[data-content-pane="true"]');
    const contentHeader = contentPane?.previousElementSibling?.matches("header")
      ? contentPane.previousElementSibling
      : null;
    const headerBottom = contentHeader?.getBoundingClientRect().bottom ?? 0;
    launcher.style.top = `${Math.max(20, Math.ceil(headerBottom) + 12)}px`;
  };
  const updateLauncherVisibility = () => {
    const isWorkPage =
      WORK_ID_PATTERN.test(decodeURIComponent(location.href)) ||
      Boolean(document.querySelector('h1 a[href*="/work/=/product_id/"]'));
    launcher.hidden = !isWorkPage;
  };

  window.addEventListener("resize", updateLauncherPosition);
  updateLauncherPosition();
  updateLauncherVisibility();
  setInterval(() => {
    if (location.href !== previousUrl) {
      previousUrl = location.href;
      document.getElementById(ROOT_ID)?.remove();
    }
    updateLauncherPosition();
    updateLauncherVisibility();
  }, 500);
})();
