document.addEventListener('DOMContentLoaded', function() {
  const filterMode = document.getElementById('filterMode');
  const apiKeySection = document.getElementById('apiKeySection');
  const topicsList = document.getElementById('topicsList');
  const addTopicBtn = document.getElementById('addTopic');
  const saveBtn = document.getElementById('saveSettings');

  // Load saved settings
  chrome.storage.sync.get(['topics', 'filterMode', 'apiKey', 'debugMode'], function(data) {
    if (data.topics) {
      data.topics.forEach(topic => addTopicElement(topic));
    }
    if (data.filterMode) {
      filterMode.value = data.filterMode;
      apiKeySection.style.display = data.filterMode === 'llm' ? 'block' : 'none';
    }
    if (data.apiKey) {
      document.getElementById('apiKey').value = data.apiKey;
    }
    if (data.debugMode !== undefined) {
      document.getElementById('debugMode').checked = data.debugMode;
    }
  });

  // Toggle API key input visibility
  filterMode.addEventListener('change', function() {
    apiKeySection.style.display = this.value === 'llm' ? 'block' : 'none';
  });

  // Add new topic input
  function addTopicElement(topicData = { keyword: '', duration: 0 }) {
    const div = document.createElement('div');
    div.className = 'topic-item';
    div.innerHTML = `
      <input type="text" class="topic-keyword" placeholder="Enter topic or keyword" value="${topicData.keyword}">
      <input type="number" class="topic-duration" placeholder="Days (0 for permanent)" value="${topicData.duration}" min="0">
      <button class="remove-topic">Remove</button>
    `;
    div.querySelector('.remove-topic').addEventListener('click', () => div.remove());
    topicsList.appendChild(div);
  }

  addTopicBtn.addEventListener('click', () => addTopicElement());

  // Clear post cache
  document.getElementById('clearCache').addEventListener('click', async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.clearPostCache()
    });
    alert('Post cache cleared!');
  });

  // Save settings
  saveBtn.addEventListener('click', function() {
    const topics = Array.from(document.querySelectorAll('.topic-item')).map(item => ({
      keyword: item.querySelector('.topic-keyword').value,
      duration: parseInt(item.querySelector('.topic-duration').value) || 0,
      startDate: new Date().toISOString()
    }));

    const settings = {
      topics,
      filterMode: filterMode.value,
      apiKey: document.getElementById('apiKey').value,
      debugMode: document.getElementById('debugMode').checked
    };
    console.log('Settings:', settings); // Before the chrome.storage.sync.set call
    chrome.storage.sync.set(settings, function() {
      alert('Settings saved!');
    });
  });
});
