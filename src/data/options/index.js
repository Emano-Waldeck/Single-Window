const toast = msg => {
  document.getElementById('toast').textContent = msg;
  clearTimeout(toast.id);
  toast.id = setTimeout(() => {
    document.getElementById('toast').textContent = '';
  }, 750);
};

chrome.storage.local.get({
  'check-type': true,
  'popup': 'create' // 'create', 'move', 'skip'
}).then(prefs => {
  document.getElementById('check-type').checked = prefs['check-type'];
  document.getElementById('popup').value = prefs.popup;
});

document.getElementById('save').onclick = () => chrome.storage.local.set({
  'check-type': document.getElementById('check-type').checked,
  'popup': document.getElementById('popup').value
}).then(() => toast('Options Saved'));

// support
document.getElementById('support').onclick = () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
});
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast('Double-click to reset!');
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
