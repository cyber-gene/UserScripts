// ==UserScript==
// @name         yt-toggle-autoplay-on-idle
// @namespace    https://cybergene.dev/
// @version      1.4
// @description  Stops YouTube autoplay after a period of inactivity
// @match        https://www.youtube.com/watch?v=*
// @match        https://www.youtube.com/shorts/*
// @grant        none
// @author       cybergene
// @source       https://github.com/cyber-gene/TampermonkeyUserScripts
// @downloadURL  https://raw.githubusercontent.com/cyber-gene/TampermonkeyUserScripts/main/YouTube/yt-toggle-autoplay-on-idle.user.js
// ==/UserScript==

/**
 * YouTube Auto-Toggle Autoplay on Idle
 *
 * This script automatically turns off YouTube's autoplay feature after a period of user inactivity.
 * It's designed to prevent YouTube from continuously playing videos when the user is no longer
 * actively watching (e.g., if they've fallen asleep).
 *
 * Features:
 * - Detects user inactivity for a configurable period (default: 90 minutes)
 * - Only turns off autoplay when videos are actually playing
 * - Displays a persistent notification when autoplay has been disabled
 * - Notification includes timestamp and remains visible until manually dismissed
 *
 * Configuration:
 * - Modify the `idleMinutes` constant to change the inactivity detection threshold
 *
 * Requirements:
 * - Any userscript manager (Tampermonkey etc.)
 * - Works on YouTube video and YouTube Shorts pages
 */

(function () {
  "use strict";

  /**
   * The number of minutes of inactivity before turning off autoplay
   * Modify this value to change the idle detection threshold
   */
  const idleMinutes = 90;

  /**
   * Formats the current date and time as a localized string
   * @returns {string} Formatted date and time string
   */
  const formatDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    return `${date} ${time}`;
  };

  /**
   * Shows an on-screen notification that stays visible until dismissed
   * Designed for users who might fall asleep so they can see when they wake up
   * @param {string} message - The notification message to display
   */
  let currentNotification = null; // Track the currently displayed notification

  const showNotification = (message) => {
    // If a notification is already displayed, update its message
    if (currentNotification) {
      const messageText = currentNotification.querySelector("span:first-child");
      if (messageText) {
        messageText.textContent = message;
      }
      return;
    }
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
        notification.remove();
      }, 500);
    });

    // Add to document
    document.body.appendChild(notification);
  };

  /**
   * Tracks the timestamp of the last user activity
   * Used to calculate idle duration
   */
  let lastActivity = Date.now();

  /**
   * Updates the last activity timestamp to the current time
   * Called whenever user interaction is detected
   */
  const updateActivity = () => {
    lastActivity = Date.now();
  };

  // Register event listeners to detect user activity
  ["mousemove", "keydown", "click"].forEach((evt) =>
    document.addEventListener(evt, updateActivity),
  );

  /**
   * Periodically checks if the user has been inactive for longer than the threshold
   * If inactive and autoplay is enabled, turns off autoplay and shows notification
   * Runs every 10 minutes (600,000 ms)
   */
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
        const dateTime = formatDateTime();
        const notificationMessage = `Autoplay turned OFF (inactivity detected) - ${dateTime}`;
        showNotification(notificationMessage);
      }
    }
  }, 600000);
})();
