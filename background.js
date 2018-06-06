'use strict';

var detect = () => chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => {
  const tab = tabs.length ? tabs[0] : '';
  localStorage.setItem('tab.index', tab ? tab.index : '');
  localStorage.setItem('window.id', tab ? tab.windowId : '');
});

const onCreated = tab => {
  if (tab.url === '' || tab.url.startsWith('http') || tab.url.startsWith('about')) {
    const windowId = localStorage.getItem('window.id');
    if (windowId && Number(windowId) !== tab.windowId) {
      const index = Number(localStorage.getItem('tab.index'));
      chrome.tabs.move(tab.id, {
        windowId: Number(windowId),
        index: index + 1
      }, () => chrome.tabs.update(tab.id, {
        active: true
      }));
    }
  }
};

var install = () => {
  chrome.windows.onRemoved.addListener(detect);
  chrome.tabs.onActivated.addListener(detect);
  chrome.windows.onFocusChanged.addListener(detect);
  detect();
  chrome.tabs.onCreated.addListener(onCreated);
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
  chrome.windows.onRemoved.removeListener(detect);
  chrome.tabs.onActivated.removeListener(detect);
  chrome.windows.onFocusChanged.removeListener(detect);
  chrome.tabs.onCreated.removeListener(onCreated);
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
