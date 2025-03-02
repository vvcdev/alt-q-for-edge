// Keep track of the last active tab ID
let currentTabId = null;
let lastTabId = null;

// When a tab is activated
chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (currentTabId !== null) {
    lastTabId = currentTabId;
  }
  currentTabId = activeInfo.tabId;
});

// When the command is triggered
chrome.commands.onCommand.addListener(function(command) {
  if (command === "switch-tab" && lastTabId !== null) {
    chrome.tabs.update(lastTabId, { active: true });
  }
});