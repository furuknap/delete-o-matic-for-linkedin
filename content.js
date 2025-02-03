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
  if (changes.topics || changes.filterMode || changes.apiKey) {
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
  const settings = await chrome.storage.sync.get(['topics', 'filterMode', 'apiKey', 'debugMode']);
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  
  posts.forEach(async (post) => {
    // Create a unique identifier for the post
    // Using a combination of post content and timestamp if available
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
      
      // Log filtered post details
      const postUrl = post.querySelector('a[data-tracking-control-name="feed-shared-update-v2_share-update"]')?.href || 
                     post.querySelector('a[data-tracking-control-name="feed-shared-update-v2_feed-article"]')?.href || 
                     'URL not found';
      
      const matchedTopic = settings.filterMode === 'keywords' ? 
        settings.topics.find(topic => postContent.toLowerCase().includes(topic.keyword.toLowerCase()))?.keyword : 
        'LLM Analysis';

      console.log(
        '%c🚫 Post Filtered:\n' +
        `Topic: ${matchedTopic}\n` +
        `URL: ${postUrl}\n` +
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
  const requestBody = {
    model: 'gpt-4-mini',
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
    console.log('Cache Size:', evaluatedPosts.size);
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
