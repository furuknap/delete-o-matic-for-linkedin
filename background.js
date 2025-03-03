chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({
    topics: [],
    filterMode: 'keywords',
    apiKey: '',
    filteringEnabled: true // Default to enabled
  });
});
