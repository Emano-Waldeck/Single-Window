const toast = msg => {
  document.getElementById('toast').textContent = msg;
  clearTimeout(toast.id);
  toast.id = setTimeout(() => {
    document.getElementById('toast').textContent = '';
  }, 750);
};

chrome.storage.local.get({
  'check-type': false,
  'popup': 'create', // 'create', 'move', 'skip'
  'excluded-hosts': [] // add domain names to exclude from the extension
}).then(prefs => {
  document.getElementById('check-type').checked = prefs['check-type'];
  document.getElementById('popup').value = prefs.popup;
  document.getElementById('excluded-hosts').value = prefs['excluded-hosts'].join('\n');
});


document.getElementById('save').onclick = () => {
  const excludedHosts = document // Pull the excluded hosts value
    .getElementById('excluded-hosts')
    .value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  chrome.storage.local.set({
    'check-type': document.getElementById('check-type').checked,
    'popup': document.getElementById('popup').value,
    'excluded-hosts': excludedHosts // Save the excluded hosts to storage
  }).then(() => toast('Options Saved'));
};

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

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
