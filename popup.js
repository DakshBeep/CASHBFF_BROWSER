// Load saved settings
chrome.storage.sync.get({
  hourlyWage: 20,
  trackingEnabled: true
}, (settings) => {
  document.getElementById('wage').value = settings.hourlyWage;
  document.getElementById('tracking').checked = settings.trackingEnabled;
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
  const hourlyWage = parseFloat(document.getElementById('wage').value) || 20;
  const trackingEnabled = document.getElementById('tracking').checked;

  chrome.storage.sync.set({
    hourlyWage,
    trackingEnabled
  }, () => {
    const saved = document.getElementById('saved');
    saved.style.display = 'block';
    setTimeout(() => {
      saved.style.display = 'none';
    }, 3000);

    // Notify background of wage change for analytics
    chrome.runtime.sendMessage({
      type: 'wage_set',
      isDefault: hourlyWage === 20
    });
  });
});

// Update tracking toggle immediately (no need to wait for Save)
document.getElementById('tracking').addEventListener('change', (e) => {
  chrome.storage.sync.set({ trackingEnabled: e.target.checked });
});
