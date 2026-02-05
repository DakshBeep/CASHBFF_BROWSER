// CashBFF Background Service Worker

importScripts('analytics.js');

const analytics = self.__cashbff_analytics || {};

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('CashBFF installed');

  // Set default values
  const result = await chrome.storage.sync.get({ hourlyWage: null });
  if (result.hourlyWage === null) {
    await chrome.storage.sync.set({ hourlyWage: 20 });
  }

  // Fire install event (first install only, not updates)
  if (details.reason === 'install') {
    const version = chrome.runtime.getManifest().version;
    await analytics.track('install', { version });
    await analytics.flush();
  }
});

// Listen for wage_set messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'wage_set') {
    analytics.track('wage_set', { is_default: message.isDefault });
    analytics.flush();
  }
});
