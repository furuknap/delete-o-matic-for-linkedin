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
  if (changes.topics) {
    console.log('Settings changed, clearing post evaluation cache');
    evaluatedPosts.clear();
    chrome.storage.local.remove(['evaluatedPosts']);
  }
  
  // If global filtering setting changed, refresh filtering
  if (changes.filteringEnabled) {
    console.log('Global filtering setting changed:', changes.filteringEnabled.newValue);
    evaluatedPosts.clear();
    chrome.storage.local.remove(['evaluatedPosts']);
    filterContent(); // Re-evaluate all posts with new setting
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

  const settings = await chrome.storage.sync.get(['topics', 'filteringEnabled']);
  
  // Check if filtering is globally disabled
  if (settings.filteringEnabled === false) {
    console.log('🔓 Filtering globally disabled');
    // Show all posts that might have been hidden
    document.querySelectorAll('.feed-shared-update-v2').forEach(post => {
      post.style.display = '';
    });
    return;
  }
  
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  
  posts.forEach(async (post) => {
    // Create a unique identifier for the post
    const postId = getPostIdentifier(post);
    
    // Skip if we've already evaluated this post
    if (evaluatedPosts.has(postId)) {
      const shouldHide = evaluatedPosts.get(postId);
      post.style.display = shouldHide ? 'none' : '';
      return;
    }

    const postContent = post.textContent;
    let shouldHide = false;

    shouldHide = settings.topics.some(topic => {
      if (!topic.enabled) return false;
      if (topic.duration > 0) {
        const daysSinceStart = (new Date() - new Date(topic.startDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceStart > topic.duration) return false;
      }
      if (topic.type === 'keyword') {
        return postContent.toLowerCase().includes(topic.keyword.toLowerCase());
      } else if (topic.type === 'topic') {
        // Implement more sophisticated topic matching logic here if needed
        return postContent.toLowerCase().includes(topic.keyword.toLowerCase());
      }
      return false;
    });

    // Cache the result and save to storage
    evaluatedPosts.set(postId, shouldHide);
    saveCache();
    
    if (shouldHide) {
      post.style.display = 'none';
      
      // Get activity ID and create direct link with override
      const activityUrl = postId.startsWith('urn:li:activity:') ? 
        `https://www.linkedin.com/feed/update/${postId}/#override-deletion` : 
        'URL not available';
      
      const matchedTopic = settings.topics.find(topic => postContent.toLowerCase().includes(topic.keyword.toLowerCase()))?.keyword;

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

console.log('Content script loaded');
document.body.style.border = '5px solid red'; // Visual confirmation

// Initialize filtering
const observer = new MutationObserver(() => filterContent());
observer.observe(document.body, { childList: true, subtree: true });
filterContent();
