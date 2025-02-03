// Cache for evaluated posts
let evaluatedPosts = new Map();

// Load cache from storage on startup
chrome.storage.local.get(['evaluatedPosts'], (result) => {
  if (result.evaluatedPosts) {
    evaluatedPosts = new Map(Object.entries(result.evaluatedPosts));
    console.log('Loaded post cache from storage, size:', evaluatedPosts.size);
  }
});

// Listen for settings changes to invalidate cache
chrome.storage.onChanged.addListener((changes) => {
  if (changes.topics || changes.filterMode || changes.apiKey || changes.llmModel) {
    console.log('Settings changed, clearing post evaluation cache');
    evaluatedPosts.clear();
    chrome.storage.local.remove(['evaluatedPosts']);
  }
});

// Save cache to storage
function saveCache() {
  const cacheObject = Object.fromEntries(evaluatedPosts);
  chrome.storage.local.set({ evaluatedPosts: cacheObject });
}

async function filterContent() {
  // Check if we're in override mode
  if (window.location.hash === '#override-deletion') {
    console.log('🔓 Override mode active - filtering disabled');
    return;
  }

  const settings = await chrome.storage.sync.get(['topics', 'filterMode', 'apiKey', 'debugMode', 'llmModel']);
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  
  posts.forEach(async (post) => {
    // Create a unique identifier for the post
    const postId = getPostIdentifier(post);
    
    // Skip if we've already evaluated this post
    if (evaluatedPosts.has(postId)) {
      if (settings.debugMode) {
        console.log('🔍 Skipping already evaluated post:', postId);
      }
      const shouldHide = evaluatedPosts.get(postId);
      post.style.display = shouldHide ? 'none' : '';
      return;
    }

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

    // Cache the result and save to storage
    evaluatedPosts.set(postId, shouldHide);
    saveCache();
    
    if (settings.debugMode) {
      console.log('🔍 Caching evaluation result for post:', postId, shouldHide);
      console.log('Cache size:', evaluatedPosts.size);
    }

    if (shouldHide) {
      post.style.display = 'none';
      
      // Get activity ID and create direct link with override
      const activityUrl = postId.startsWith('urn:li:activity:') ? 
        `https://www.linkedin.com/feed/update/${postId}/#override-deletion` : 
        'URL not available';
      
      const matchedTopic = settings.filterMode === 'keywords' ? 
        settings.topics.find(topic => postContent.toLowerCase().includes(topic.keyword.toLowerCase()))?.keyword : 
        'LLM Analysis';

      console.log(
        '%c🚫 Post Filtered:\n' +
        `Topic: ${matchedTopic}\n` +
        `Activity ID: ${postId}\n` +
        `Direct Link (filtering disabled): ${activityUrl}\n` +
        `Content Preview: ${postContent.slice(0, 200)}...`,
        'color: #FFA500; font-weight: bold; border-left: 4px solid #FFA500; padding-left: 10px;'
      );
    }
  });
}

function getPostIdentifier(post) {
  // Get the closest parent with data-id attribute
  const container = post.closest('[data-id]');
  if (!container) {
    console.warn('Could not find data-id for post, falling back to content hash');
    // Fallback to content hash if data-id is not found
    return post.textContent.slice(0, 100).replace(/\s+/g, '-');
  }
  
  // Extract activity URNs from data-id
  const dataId = container.getAttribute('data-id');
  const activities = dataId.match(/urn:li:activity:\d+/g) || [];
  
  // Use the first activity URN as identifier, or the full data-id if no URNs found
  return activities[0] || dataId;
}

// Expose cache clearing function for the popup
window.clearPostCache = () => {
  evaluatedPosts.clear();
  chrome.storage.local.remove(['evaluatedPosts']);
  console.log('Post evaluation cache cleared');
  filterContent(); // Re-evaluate all posts
};

async function checkContentWithLLM(content, topics, apiKey, debugMode = false) {
  const settings = await chrome.storage.sync.get(['llmModel']);
  const model = settings.llmModel || 'gpt-4o-mini';
  
  let endpoint = '';
  let requestBody = {};
  let headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const prompt = `Content: ${content}\nTopics: ${topics.map(t => t.keyword).join(', ')}`;

  // Set up model-specific configurations
  switch (model) {
    case 'gpt-4o-mini':
      endpoint = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Analyze if the following content matches any of the given topics. Respond with true or false only.'
        }, {
          role: 'user',
          content: prompt
        }]
      };
      break;

    case 'gemini-2.0-flash-exp':
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      headers = {
        'Content-Type': 'application/json'
      };
      requestBody = {
        contents: [{
          parts: [{
            text: 'Analyze if the following content matches any of the given topics. Respond with true or false only.\n\n' + prompt
          }]
        }]
      };
      break;

    case 'claude-3-5-sonnet-20241022':
      endpoint = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      };
      requestBody = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Analyze if the following content matches any of the given topics. Respond with true or false only.\n\n' + prompt
        }]
      };
      break;
  }

  if (debugMode) {
    console.log('🔍 LLM Query Debug Info:');
    console.log('Model:', model);
    console.log('Content:', content);
    console.log('Topics:', topics.map(t => t.keyword));
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('API Endpoint:', endpoint);
    console.log('Cache Size:', evaluatedPosts.size);
    console.log('-------------------');
    return false; // Skip actual API call in debug mode
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  const result = await response.json();
  
  // Handle different response formats
  let resultText = '';
  switch (model) {
    case 'gpt-4o-mini':
      resultText = result.choices[0].message.content;
      break;
    case 'gemini-2.0-flash-exp':
      resultText = result.candidates[0].content.parts[0].text;
      break;
    case 'claude-3-5-sonnet-20241022':
      resultText = result.content[0].text;
      break;
  }

  return resultText.toLowerCase().includes('true');
}

console.log('Content script loaded');
document.body.style.border = '5px solid red'; // Visual confirmation

// Initialize filtering
const observer = new MutationObserver(() => filterContent());
observer.observe(document.body, { childList: true, subtree: true });
filterContent();
