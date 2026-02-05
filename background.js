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

  // Set up daily active alarm
  chrome.alarms.create('dailyActive', { periodInMinutes: 1440 }); // 24 hours
});

// Daily active ping
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyActive') {
    const { lastActiveDate } = await chrome.storage.local.get({ lastActiveDate: null });
    const today = new Date().toISOString().slice(0, 10);

    if (lastActiveDate !== today) {
      await chrome.storage.local.set({ lastActiveDate: today });
      const version = chrome.runtime.getManifest().version;
      await analytics.track('daily_active', { version });
      await analytics.flush();
    }
  }
});

// Listen for wage_set messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'wage_set') {
    analytics.track('wage_set', { is_default: message.isDefault });
    analytics.flush();
  }
});
