// Load saved settings
chrome.storage.sync.get({
  hourlyWage: 30,
  supabaseUrl: '',
  supabaseKey: ''
}, (settings) => {
  document.getElementById('wage').value = settings.hourlyWage;
  document.getElementById('supabaseUrl').value = settings.supabaseUrl;
  document.getElementById('supabaseKey').value = settings.supabaseKey;
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
  const hourlyWage = parseFloat(document.getElementById('wage').value) || 30;
  const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
  const supabaseKey = document.getElementById('supabaseKey').value.trim();

  chrome.storage.sync.set({
    hourlyWage,
    supabaseUrl,
    supabaseKey
  }, () => {
    const saved = document.getElementById('saved');
    saved.style.display = 'block';
    setTimeout(() => {
      saved.style.display = 'none';
    }, 3000);
  });
});
