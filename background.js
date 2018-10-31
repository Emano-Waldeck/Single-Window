'use strict';
// Open link from right-click context menu
// Open in window Ctrl + N
// Open a new private window
// Open an internal window
// Open an internal page and without leaving focus, use right-click to on a link to open new window
// Focus desktop, use right-click to on a link to open new window
// https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_win_open2

var moveTo = (tab, windowId) => {
  windowId = Number(windowId);

  chrome.tabs.query({
    windowId,
    active: true
  }, tabs => {
    const opt = {
      windowId
    };
    if (tabs && tabs.length) {
      opt.index = tabs[0].index + 1;
    }
    chrome.tabs.move(tab.id, opt, () => {
      const lastError = chrome.runtime.lastError;
      if (!lastError) {
        // https://github.com/Emano-Waldeck/Single-Window/issues/1
        chrome.tabs.update(tab.id, {
          active: tab.active
        }, () => chrome.windows.update(windowId, {
          focused: tab.active
        }));
      }
    });
  });
};

var observers = {
  onFocusChanged: windowId => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      localStorage.setItem('window.id', windowId);
      // if window is not a browser window, find the active one
      chrome.windows.get(windowId, win => {
        if (win.type !== 'normal') {
          chrome.windows.getAll(wins => {
            const win = wins.filter(w => w.type === 'normal').shift();
            if (win) {
              localStorage.setItem('window.id', win.id);
            }
          });
        }
      });
    }
  },
  onCreated: tab => {
    if (tab.incognito) {
      return;
    }
    const windowId = localStorage.getItem('window.id');
    if (
      tab.url.startsWith('http') &&
      String(tab.windowId) !== windowId
    ) {
      console.log('block', 'http');
      moveTo(tab, windowId);
    }
    else if (
      (tab.url === 'about:blank' || tab.url === '') &&
      String(tab.windowId) !== windowId
    ) {
      window.setTimeout(() => chrome.tabs.get(tab.id, tab => {
        if (
          tab &&
          (tab.url.startsWith('http') || tab.url === 'about:blank' || tab.url === '')
        ) {
          console.log('block', 'about:blank');
          moveTo(tab, windowId);
        }
        else {
          console.log('allow', tab);
        }
      }), 500, localStorage.getItem('window.id'));
    }
    else {
      console.log('allow', tab);
    }
  }
};

var install = () => {
  chrome.windows.getCurrent(win => {
    localStorage.setItem('window.id', win.id);
  });
  chrome.windows.onFocusChanged.addListener(observers.onFocusChanged);
  chrome.tabs.onCreated.addListener(observers.onCreated);
  chrome.browserAction.setIcon({
    path: {
      '16': 'data/icons/16.png',
      '19': 'data/icons/19.png',
      '32': 'data/icons/32.png',
      '38': 'data/icons/38.png',
      '48': 'data/icons/48.png',
      '64': 'data/icons/64.png'
    }
  });
  chrome.browserAction.setTitle({
    title: 'Single window mode is enabled'
  });
};
var remove = () => {
  chrome.windows.onFocusChanged.removeListener(observers.onFocusChanged);
  chrome.tabs.onCreated.removeListener(observers.onCreated);
  chrome.browserAction.setIcon({
    path: {
      '16': 'data/icons/disabled/16.png',
      '19': 'data/icons/disabled/19.png',
      '32': 'data/icons/disabled/32.png',
      '38': 'data/icons/disabled/38.png',
      '48': 'data/icons/disabled/48.png',
      '64': 'data/icons/disabled/64.png'
    }
  });
  chrome.browserAction.setTitle({
    title: 'Single window mode is disabled'
  });
};

{
  const onStartup = () => chrome.storage.local.get({
    enabled: true
  }, prefs => {
    if (prefs.enabled) {
      install();
    }
    else {
      remove();
    }
  });
  chrome.runtime.onInstalled.addListener(onStartup);
  chrome.runtime.onStartup.addListener(onStartup);
}
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.enabled) {
    if (prefs.enabled.newValue) {
      install();
    }
    else {
      remove();
    }
  }
});

chrome.browserAction.onClicked.addListener(() => chrome.storage.local.get({
  enabled: true
}, prefs => chrome.storage.local.set({
  enabled: prefs.enabled === false
})));

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': true,
  'last-update': 0
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      // do not display the FAQs page if last-update occurred less than 30 days ago.
      if (doUpdate) {
        const p = Boolean(prefs.version);
        window.setTimeout(() => chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '?version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        }), 3000);
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    chrome.runtime.getManifest().homepage_url + '?rd=feedback&name=' + name + '&version=' + version
  );
}
