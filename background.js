// Background service worker for Wage Lens
// Currently minimal - can add badge updates, notifications, etc. later

chrome.runtime.onInstalled.addListener(() => {
  console.log('Wage Lens installed');
  
  // Set default values
  chrome.storage.sync.get({ hourlyWage: null }, (result) => {
    if (result.hourlyWage === null) {
      chrome.storage.sync.set({ hourlyWage: 30 });
    }
  });
});
