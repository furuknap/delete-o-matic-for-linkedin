document.addEventListener('DOMContentLoaded', function() {
  const topicsList = document.getElementById('topicsList');
  const addTopicBtn = document.getElementById('addTopic');
  const saveBtn = document.getElementById('saveSettings');

  // Load saved settings
  chrome.storage.sync.get(['topics'], function(data) {
    if (data.topics) {
      data.topics.forEach(topic => addTopicElement({
        type: topic.type,
        keyword: topic.keyword,
        duration: topic.duration,
        enabled: topic.enabled
      }));
    }
  });

  // Add new topic input
  function addTopicElement(topicData = { keyword: '', duration: 0 }) {
    const div = document.createElement('div');
    div.className = 'topic-item';
    div.innerHTML = `
      <input type="checkbox" class="filter-enabled" checked>
      <select class="filter-type">
        <option value="keyword">Keyword</option>
        <option value="topic">Topic</option>
      </select>
      <input type="text" class="filter-value" placeholder="Enter keyword or topic" value="${topicData.keyword}">
      <input type="number" class="topic-duration" placeholder="Days (0 for permanent)" value="${topicData.duration}" min="0">
      <button class="remove-topic">Remove</button>
    `;
    div.querySelector('.remove-topic').addEventListener('click', () => div.remove());
    div.querySelector('.filter-type').value = topicData.type || 'keyword';
    div.querySelector('.filter-enabled').checked = topicData.enabled !== false;
    
    const toggleFilter = () => {
      const enabled = div.querySelector('.filter-enabled').checked;
      div.classList.toggle('topic-item-disabled', !enabled);
      div.querySelectorAll('select, input[type="text"], input[type="number"]').forEach(el => el.disabled = !enabled);
    };

    div.querySelector('.filter-enabled').addEventListener('change', toggleFilter);
    toggleFilter();

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
    const topics = Array.from(document.querySelectorAll('.topic-item')).map(item => {
      const filterType = item.querySelector('.filter-type').value;
      const filterValue = item.querySelector('.filter-value').value;
      const duration = parseInt(item.querySelector('.topic-duration').value) || 0;
      const enabled = item.querySelector('.filter-enabled').checked;
      return {
        type: filterType,
        keyword: filterValue,
        duration: duration,
        startDate: new Date().toISOString(),
        enabled: enabled
      };
    });

    const settings = {
      topics
    };
    console.log('Settings:', settings); // Before the chrome.storage.sync.set call
    chrome.storage.sync.set(settings, function() {
      alert('Settings saved!');
    });
  });
});
