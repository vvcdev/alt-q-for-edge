// Keep track of the active and last active tab IDs
let currentTabId = null;
let lastTabId = null;

// Initialize tab tracking on extension startup
function initializeTabTracking() {
  // Retrieve stored tab IDs if they exist
  chrome.storage.local.get(['currentTabId', 'lastTabId'], function(result) {
    if (result.currentTabId) currentTabId = result.currentTabId;
    if (result.lastTabId) lastTabId = result.lastTabId;
    
    // If we have restored tab IDs, verify they still exist
    if (currentTabId) {
      chrome.tabs.get(currentTabId, function(tab) {
        if (chrome.runtime.lastError) {
          // Tab doesn't exist anymore, reset
          currentTabId = null;
          chrome.storage.local.remove('currentTabId');
        }
      });
    }
    
    if (lastTabId) {
      chrome.tabs.get(lastTabId, function(tab) {
        if (chrome.runtime.lastError) {
          // Tab doesn't exist anymore, reset
          lastTabId = null;
          chrome.storage.local.remove('lastTabId');
        }
      });
    }
    
    // If no current tab is stored or it's invalid, get the active tab
    if (!currentTabId) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
          currentTabId = tabs[0].id;
          saveTabIds();
        }
      });
    }
  });
}

// Save tab IDs to persistent storage
function saveTabIds() {
  chrome.storage.local.set({
    'currentTabId': currentTabId, 
    'lastTabId': lastTabId
  });
}

// When a tab is activated
chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (currentTabId !== null && currentTabId !== activeInfo.tabId) {
    lastTabId = currentTabId;
  }
  currentTabId = activeInfo.tabId;
  saveTabIds();
});

// When a tab is removed
chrome.tabs.onRemoved.addListener(function(tabId) {
  // If the removed tab was the current or last tab, adjust accordingly
  if (tabId === currentTabId) {
    currentTabId = lastTabId;
    lastTabId = null;
    saveTabIds();
  } else if (tabId === lastTabId) {
    lastTabId = null;
    saveTabIds();
  }
});

// When a new tab is created
chrome.tabs.onCreated.addListener(function(tab) {
  // If this is the first tab, make it the current tab
  if (currentTabId === null) {
    currentTabId = tab.id;
    saveTabIds();
  }
});

// When the command is triggered
chrome.commands.onCommand.addListener(function(command) {
  if (command === "switch-tab") {
    if (lastTabId !== null) {
      // Try to switch to the last tab
      chrome.tabs.get(lastTabId, function(tab) {
        if (!chrome.runtime.lastError) {
          // Tab exists, switch to it
          chrome.tabs.update(lastTabId, { active: true });
        } else {
          // Tab doesn't exist, find a fallback tab
          chrome.tabs.query({}, function(tabs) {
            if (tabs.length > 1) {
              // Find another tab that's not the current one
              const fallbackTab = tabs.find(t => t.id !== currentTabId);
              if (fallbackTab) {
                lastTabId = fallbackTab.id;
                chrome.tabs.update(lastTabId, { active: true });
                saveTabIds();
              }
            }
          });
        }
      });
    } else {
      // If no last tab, try to find another tab to switch to
      chrome.tabs.query({}, function(tabs) {
        if (tabs.length > 1) {
          const otherTab = tabs.find(t => t.id !== currentTabId);
          if (otherTab) {
            lastTabId = otherTab.id;
            chrome.tabs.update(lastTabId, { active: true });
            saveTabIds();
          }
        }
      });
    }
  }
});

// Initialize when the extension starts
initializeTabTracking();
