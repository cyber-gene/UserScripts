// ==UserScript==
// @name         yt-toggle-autoplay-on-idle
// @namespace    https://cybergene.dev/
// @version      1.3
// @description  Stops YouTube autoplay after a period of inactivity
// @match        https://www.youtube.com/watch?v=*
// @match        https://www.youtube.com/shorts/*
// @grant        none
// @author       cybergene
// @source       https://github.com/cyber-gene/TampermonkeyUserScripts
// @downloadURL  https://raw.githubusercontent.com/cyber-gene/TampermonkeyUserScripts/main/YouTube/yt-toggle-autoplay-on-idle.user.js
// ==/UserScript==

(function () {
  "use strict";

  const idleMinutes = 90;

  // Function to show on-screen notification that stays visible until user dismisses it
  // This is designed for users who might fall asleep, so they can see the notification when they wake up
  const showNotification = (message) => {
    // Create notification container
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 9999;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      transition: opacity 0.5s ease-in-out;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    // Add message text
    const messageText = document.createElement("span");
    messageText.textContent = message;
    notification.appendChild(messageText);

    // Add dismiss instruction
    const dismissText = document.createElement("span");
    dismissText.textContent = "(Click to close)";
    dismissText.style.cssText = `
      font-size: 12px;
      opacity: 0.8;
    `;
    notification.appendChild(dismissText);

    // Add click event to dismiss notification
    notification.addEventListener("click", () => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    });

    // Add to document
    document.body.appendChild(notification);
  };

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
      const isVideoPlaying =
        video && !video.paused && !video.ended && video.readyState >= 2;

      if (
        autoplayToggle &&
        toggleButton &&
        toggleButton.getAttribute("aria-checked") === "true" &&
        isVideoPlaying // Only toggle autoplay if video is playing
      ) {
        autoplayToggle.click(); // Turn off autoplay
        const notificationMessage = "Autoplay turned OFF (inactivity detected)";
        showNotification(notificationMessage);
      }
    }
  }, 600000);
})();
