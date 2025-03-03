document.addEventListener('DOMContentLoaded', function() {
  const topicsList = document.getElementById('topicsList');
  const addTopicBtn = document.getElementById('addTopic');
  const saveBtn = document.getElementById('saveSettings');
  const globalFilterToggle = document.getElementById('globalFilterToggle');

  // Load saved settings
  chrome.storage.sync.get(['topics', 'filteringEnabled'], function(data) {
    // Set global filtering toggle
    if (data.filteringEnabled !== undefined) {
      globalFilterToggle.checked = data.filteringEnabled;
    }
    
    // Update UI based on global filtering state
    updateUIBasedOnGlobalFilter(globalFilterToggle.checked);
    
    if (data.topics) {
      data.topics.forEach(topic => addTopicElement({
        type: topic.type,
        keyword: topic.keyword,
        duration: topic.duration,
        enabled: topic.enabled
      }));
    }
  });
  
  // Function to update UI based on global filtering state
  function updateUIBasedOnGlobalFilter(enabled) {
    const topicsTable = document.querySelector('table');
    const addTopicButton = document.getElementById('addTopic');
    
    if (enabled) {
      topicsTable.style.opacity = '1';
      addTopicButton.disabled = false;
    } else {
      topicsTable.style.opacity = '0.5';
      addTopicButton.disabled = true;
    }
  }
  
  // Handle global filter toggle
  globalFilterToggle.addEventListener('change', function() {
    updateUIBasedOnGlobalFilter(this.checked);
  });

  // Add new topic input
  function addTopicElement(topicData = { keyword: '', duration: 0 }) {
    const tr = document.createElement('tr');
    tr.className = 'topic-item';
    tr.innerHTML = `
      <td><input type="checkbox" class="filter-enabled" checked></td>
      <td><select class="filter-type">
          <option value="keyword">Keyword</option>
          <option value="topic">Topic</option>
        </select></td>
      <td><input type="text" class="filter-value" placeholder="Enter keyword or topic" value="${topicData.keyword}"></td>
      <td><input type="number" class="topic-duration" placeholder="Days (0 for permanent)" value="${topicData.duration}" min="0"></td>
      <td><button class="remove-topic">Remove</button></td>
    `;
    tr.querySelector('.remove-topic').addEventListener('click', () => tr.remove());
    tr.querySelector('.filter-type').value = topicData.type || 'keyword';
    tr.querySelector('.filter-enabled').checked = topicData.enabled !== false;
    
    const toggleFilter = () => {
      const enabled = tr.querySelector('.filter-enabled').checked;
      tr.classList.toggle('topic-item-disabled', !enabled);
      tr.querySelectorAll('select, input[type="text"], input[type="number"]').forEach(el => el.disabled = !enabled);
    };

    tr.querySelector('.filter-enabled').addEventListener('change', toggleFilter);
    toggleFilter();

    topicsList.appendChild(tr);
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
      topics,
      filteringEnabled: globalFilterToggle.checked
    };
    console.log('Settings:', settings); // Before the chrome.storage.sync.set call
    chrome.storage.sync.set(settings, function() {
      alert('Settings saved!');
    });
  });
});
