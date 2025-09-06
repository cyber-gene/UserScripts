// ==UserScript==
// @name         YouTube Auto-Toggle Autoplay on Idle
// @namespace    https://cybergene.dev/
// @version      1.6.5
// @description  Automatically turns off YouTube's autoplay feature after a configurable period of inactivity to prevent continuous playback when you're no longer watching
// @match        https://www.youtube.com/watch?v=*
// @match        https://www.youtube.com/shorts/*
// @match        https://www.youtube.com/live/*
// @grant        none
// @author       cybergene
// @source       https://github.com/cyber-gene/UserScripts
// @updateURL    https://raw.githubusercontent.com/cyber-gene/UserScripts/main/YouTube/yt-toggle-autoplay-on-idle.user.js
// @downloadURL  https://raw.githubusercontent.com/cyber-gene/UserScripts/main/YouTube/yt-toggle-autoplay-on-idle.user.js
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
 * - Provides a button in the notification to easily turn autoplay back ON
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
   * Idle time threshold (in minutes) for disabling autoplay
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
   * Tracks the currently displayed notification
   * Used to update or remove the notification when needed
   */
  let currentNotification = null;

  /**
   * Toggles YouTube's autoplay feature ON
   * Finds and clicks the autoplay toggle button if it's currently OFF
   */
  const enableAutoplay = () => {
    const autoplayToggle = document.querySelector("button.ytp-autonav-toggle");
    const toggleButton = autoplayToggle?.querySelector(
      ".ytp-autonav-toggle-button",
    );

    if (
      autoplayToggle &&
      toggleButton &&
      toggleButton.getAttribute("aria-checked") === "false"
    ) {
      autoplayToggle.click(); // Turn ON autoplay

      // Close the modal immediately after enabling autoplay
      if (currentNotification) {
        currentNotification.style.opacity = "0";
        setTimeout(() => {
          if (currentNotification) {
            currentNotification.remove();
            currentNotification = null;
          }
        }, 500);
      }
    }
  };

  /**
   * Shows an on-screen notification that stays visible until dismissed
   * Creates a new notification or updates an existing one with buttons for enabling autoplay and dismissing
   * Designed for users who might fall asleep so they can see when they wake up
   * @param {string} message - The notification message to display
   */
  const showNotification = (message) => {
    // If a notification is already displayed, update its message
    if (currentNotification) {
      const messageText = currentNotification.querySelector(
        ".notification-message",
      );
      if (messageText) {
        messageText.textContent = message;
      }
      return;
    }

    // Create modal background overlay
    const modalOverlay = document.createElement("div");
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: opacity 0.5s ease-in-out;
    `;

    // Create notification container (modal dialog)
    const notification = document.createElement("div");
    notification.style.cssText = `
      background-color: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px 30px;
      border-radius: 8px;
      font-size: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 15px;
      max-width: 400px;
      min-width: 300px;
      text-align: center;
    `;

    // Create content container
    const contentContainer = document.createElement("div");
    contentContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    // Add message text
    const messageText = document.createElement("span");
    messageText.className = "notification-message";
    messageText.textContent = message;
    contentContainer.appendChild(messageText);

    // Add to notification
    notification.appendChild(contentContainer);

    // Create buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 15px;
    `;

    // Add the enable autoplay button
    const enableButton = document.createElement("button");
    enableButton.textContent = "Turn Autoplay ON";
    enableButton.style.cssText = `
      background-color: #3ea6ff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    enableButton.addEventListener("mouseover", () => {
      enableButton.style.backgroundColor = "#65b8ff";
    });
    enableButton.addEventListener("mouseout", () => {
      enableButton.style.backgroundColor = "#3ea6ff";
    });
    enableButton.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent notification from being dismissed
      enableAutoplay();
    });
    buttonsContainer.appendChild(enableButton);

    // Add dismiss button
    const dismissButton = document.createElement("button");
    dismissButton.textContent = "Dismiss";
    dismissButton.style.cssText = `
      background-color: rgba(255, 255, 255, 0.15);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    dismissButton.addEventListener("mouseover", () => {
      dismissButton.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
    });
    dismissButton.addEventListener("mouseout", () => {
      dismissButton.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
    });
    dismissButton.addEventListener("click", () => {
      modalOverlay.style.opacity = "0";
      currentNotification = null;
      setTimeout(() => {
        modalOverlay.remove();
      }, 500);
    });
    buttonsContainer.appendChild(dismissButton);

    // Add buttons container to notification
    notification.appendChild(buttonsContainer);

    // Add notification to modal overlay
    modalOverlay.appendChild(notification);

    // Store reference to the current notification (now the modal overlay)
    currentNotification = modalOverlay;

    // Add modal overlay to document
    document.body.appendChild(modalOverlay);

    // Allow clicking on overlay background to dismiss modal
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        dismissButton.click();
      }
    });
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

  /**
   * Registers event listeners to detect user activity
   * Monitors mouse movements, keyboard input, and clicks to track user presence
   * Each event triggers the updateActivity function to reset the idle timer
   */
  ["mousemove", "keydown", "click"].forEach((evt) =>
    document.addEventListener(evt, updateActivity),
  );

  /**
   * Periodically checks if the user has been inactive for longer than the threshold
   * If inactive and autoplay is enabled, turns off autoplay and shows notification
   * Runs every 1 minute (60,000 ms)
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
        isVideoPlaying // Only toggle autoplay if a video is playing
      ) {
        autoplayToggle.click(); // Turn off autoplay
        const dateTime = formatDateTime();
        const notificationMessage = `Autoplay turned OFF (inactivity detected) - ${dateTime}`;
        showNotification(notificationMessage);
      }
    }
  }, 60000);
})();
