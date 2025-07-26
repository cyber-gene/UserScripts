// ==UserScript==
// @name         yt-toggle-autoplay-on-idle
// @namespace    https://cybergene.dev/
// @version      1.2
// @description  一定時間無操作ならYouTubeの次動画再生を止める
// @match        https://www.youtube.com/watch?v=*
// @match        https://www.youtube.com/watch?*
// @match        https://www.youtube.com/shorts/*
// @grant        none
// @author       cybergene
// @source       https://github.com/cyber-gene/TampermonkeyUserScripts
// @downloadURL  https://raw.githubusercontent.com/cyber-gene/TampermonkeyUserScripts/main/YouTube/yt-toggle-autoplay-on-idle.user.js
// ==/UserScript==

(function () {
  "use strict";

  const idleMinutes = 90;

  let lastActivity = Date.now();

  const updateActivity = () => {
    lastActivity = Date.now();
  };
  ["mousemove", "keydown", "click"].forEach((evt) =>
    document.addEventListener(evt, updateActivity),
  );

  setInterval(() => {
    const idleMs = Date.now() - lastActivity;
    const idleThreshold = idleMinutes * 60 * 1000;

    if (idleMs > idleThreshold) {
      const autoplayToggle = document.querySelector(
        "button.ytp-autonav-toggle",
      );
      const toggleButton = autoplayToggle?.querySelector(
        ".ytp-autonav-toggle-button",
      );

      // Get the video element to check if it's playing
      const video = document.querySelector("video");
      const isVideoPlaying = video && !video.paused;

      if (
        autoplayToggle &&
        toggleButton &&
        toggleButton.getAttribute("aria-checked") === "true" &&
        isVideoPlaying // Only toggle autoplay if video is playing
      ) {
        autoplayToggle.click(); // 自動再生オフ
        console.log(
          "[YouTube AutoStop] 自動再生をオフにしました（無操作検出・動画再生中）",
        );
      }
    }
  }, 600000);
})();
