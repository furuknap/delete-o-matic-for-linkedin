async function filterContent() {
  const settings = await chrome.storage.sync.get(['topics', 'filterMode', 'apiKey', 'debugMode']);
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  
  posts.forEach(async (post) => {
    const postContent = post.textContent;
    let shouldHide = false;

    if (settings.filterMode === 'keywords') {
      shouldHide = settings.topics.some(topic => {
        if (topic.duration > 0) {
          const daysSinceStart = (new Date() - new Date(topic.startDate)) / (1000 * 60 * 60 * 24);
          if (daysSinceStart > topic.duration) return false;
        }
        return postContent.toLowerCase().includes(topic.keyword.toLowerCase());
      });
    } else if (settings.filterMode === 'llm' && settings.apiKey) {
      shouldHide = await checkContentWithLLM(postContent, settings.topics, settings.apiKey, settings.debugMode);
    }

    if (shouldHide) {
      post.style.display = 'none';
    }
  });
}

async function checkContentWithLLM(content, topics, apiKey, debugMode = false) {
  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: 'Analyze if the following content matches any of the given topics. Respond with true or false only.'
    }, {
      role: 'user',
      content: `Content: ${content}\nTopics: ${topics.map(t => t.keyword).join(', ')}`
    }]
  };

  if (debugMode) {
    console.log('🔍 LLM Query Debug Info:');
    console.log('Content:', content);
    console.log('Topics:', topics.map(t => t.keyword));
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('API Endpoint: https://api.openai.com/v1/chat/completions');
    console.log('-------------------');
    return false; // Skip actual API call in debug mode
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const result = await response.json();
  return result.choices[0].message.content.toLowerCase().includes('true');
}

console.log('Content script loaded');
document.body.style.border = '5px solid red'; // Visual confirmation

// Initialize filtering
const observer = new MutationObserver(() => filterContent());
observer.observe(document.body, { childList: true, subtree: true });
filterContent();
