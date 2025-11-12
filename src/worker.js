'use strict';

// Open link from right-click context menu
// Open in window Ctrl + N
// Open a new private window
// Open an internal window
// Open an internal page and without leaving focus, use right-click to on a link to open new window
// Focus desktop, use right-click to on a link to open new window
// https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_win_open2
/*
osascript -e 'tell application "Google Chrome"
    set newWin to make new window
    set URL of active tab of newWin to "https://example.com"
end tell'

*/

const last = {
  async get() {
    let id = last.id;
    if (!last.id) {
      const prefs = await chrome.storage.session.get({
        'window.id': undefined
      });
      if (prefs['window.id']) {
        id = prefs['window.id'];
      }
    }
    if (id) {
      const win = await chrome.windows.get(id, {
        windowTypes: ['normal']
      });
      if (!win) {
        throw Error('NOT_ACCEPTABLE');
      }
    }
    else {
      throw Error('NOT_FOUND');
    }
    return id;
  },
  set(id) {
    last.id = id;
    chrome.storage.session.set({
      'window.id': id
    });
  }
};

const moveTo = async (tab, windowId, mode) => {
  windowId = Number(windowId);
  const tabs = await chrome.tabs.query({
    windowId,
    active: true
  });
  const opt = {
    windowId,
    index: 0
  };
  if (tabs && tabs.length) {
    opt.index = tabs[0].index + 1;
  }

  const prefs = await chrome.storage.local.get({
    'check-type': true,
    'popup': 'create' // 'create', 'move', 'skip', 'move-alt'
  });

  // Windows issue for popup tabs
  let activate = true;
  if (prefs['check-type']) {
    const win = await chrome.windows.get(tab.windowId);
    if (win.type === 'popup') {
      if (prefs.popup === 'skip') {
        console.info(`tab belongs to "popup" window. Moving is skipped.`);
        return;
      }
      else if (prefs.popup === 'create') {
        await chrome.tabs.remove(tab.id);
        await chrome.tabs.create({
          ...opt,
          url: tab.pendingUrl || tab.url,
          active: true
        });
        await chrome.windows.update(windowId, {
          focused: tab.active
        });
        return;
      }
      else if (prefs.popup === 'move-alt') {
        activate = false;
      }
    }
  }

  const moved = await chrome.tabs.move(tab.id, opt);
  // https://github.com/Emano-Waldeck/Single-Window/issues/1
  await chrome.windows.update(windowId, {
    focused: tab.active
  });
  if (activate) {
    await chrome.tabs.update(moved.id, {
      active: true
    });
  }
};

const observers = {
  async onFocusChanged(windowId) {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      // if window is not a browser window, find the active one
      const win = await chrome.windows.get(windowId);
      if (win.type === 'normal') {
        last.set(windowId);
      }
    }
  },
  async onCreated(tab) {
    if (tab.incognito) {
      return;
    }
    try {
      const windowId = await last.get(); // throws error if not possible
      if (tab.url.startsWith('http') && tab.windowId !== windowId) {
        moveTo(tab, windowId, 'direct');
      }
      else if (
        (tab.url === 'about:blank' || tab.url === '') && tab.windowId !== windowId) {
        setTimeout(async id => {
          const tab = await chrome.tabs.get(id);
          if (tab && (tab.url.startsWith('http') || tab.url === 'about:blank' || tab.url === '')) {
            moveTo(tab, windowId, 'indirect');
          }
        }, 500, tab.id);
      }
    }
    catch (e) {
      console.info('Moving Failed', e);
    }
  }
};
chrome.windows.onFocusChanged.addListener(observers.onFocusChanged);
chrome.tabs.onCreated.addListener(observers.onCreated);

const install = async () => {
  chrome.action.setIcon({
    path: {
      '16': 'data/icons/16.png',
      '32': 'data/icons/32.png'
    }
  });
  chrome.action.setTitle({
    title: 'Single window mode is enabled'
  });
  // set
  {
    const win = await chrome.windows.getCurrent();
    if (win.type === 'normal') {
      last.set(win.id);
    }
  }
  chrome.windows.onFocusChanged.addListener(observers.onFocusChanged);
  chrome.tabs.onCreated.addListener(observers.onCreated);
};
const remove = () => {
  chrome.windows.onFocusChanged.removeListener(observers.onFocusChanged);
  chrome.tabs.onCreated.removeListener(observers.onCreated);
  chrome.action.setIcon({
    path: {
      '16': 'data/icons/disabled/16.png',
      '32': 'data/icons/disabled/32.png'
    }
  });
  chrome.action.setTitle({
    title: 'Single window mode is disabled'
  });
};

{
  const onStartup = async () => {
    if (onStartup.done) {
      return;
    }
    onStartup.done = true;

    const prefs = await chrome.storage.local.get({
      enabled: true
    });
    if (prefs.enabled) {
      install();
    }
    else {
      remove();
    }
  };
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

chrome.action.onClicked.addListener(() => chrome.storage.local.get({
  enabled: true
}, prefs => chrome.storage.local.set({
  enabled: prefs.enabled === false
})));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
