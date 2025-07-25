// ==UserScript==
// @name         yt-toggle-autoplay-on-idle
// @namespace    https://cybergene.dev/
// @version      1.0
// @description  一定時間無操作ならYouTubeの次動画再生を止める
// @match        https://www.youtube.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/cyber-gene/TampermonkeyUserScripts/main/YouTube/yt-toggle-autoplay-on-idle.user.js
// ==/UserScript==

(function () {
    'use strict';

    const idleMinutes = 1;

    let lastActivity = Date.now();

    const updateActivity = () => {
        lastActivity = Date.now();
    };
    ['mousemove', 'keydown', 'click'].forEach(evt =>
        document.addEventListener(evt, updateActivity)
    );

    setInterval(() => {
        const idleMs = Date.now() - lastActivity;
        const idleThreshold = idleMinutes * 60 * 1000;

        if (idleMs > idleThreshold) {
            const autoplayToggle = document.querySelector('button.ytp-autonav-toggle-button');
            if (autoplayToggle && autoplayToggle.getAttribute('aria-checked') === 'true') {
                autoplayToggle.click(); // 自動再生オフ
                console.log('[YouTube AutoStop] 自動再生をオフにしました（無操作検出）');
            }
        }
    }, 10000);
})();