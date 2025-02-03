# LinkedIn Content Filter Extension

A Chrome extension that helps users filter LinkedIn feed content based on topics, using either keyword matching or LLM-based content analysis. Users can set filters temporarily (for X days) or permanently.

## Features

- **Dual Filtering Modes**:
  - Keyword-based filtering for simple text matching
  - LLM-based filtering using multiple providers for context-aware content analysis:
    - OpenAI GPT-4 Mini
    - Google Gemini 1.5 Flash
    - Anthropic Claude 3.5 Sonnet
- **Flexible Duration Control**:
  - Set temporary filters (X days)
  - Set permanent filters
- **Real-time Feed Filtering**:
  - Automatically filters new content as you scroll
  - Works with LinkedIn's infinite scroll
- **Easy Configuration**:
  - Simple UI for managing filter topics
  - Duration controls for each topic
  - API key configuration for chosen LLM provider
- **Debug & Development Features**:
  - Debug mode to log LLM queries without executing them
  - Colored console logging for filtered posts
  - Post caching system to reduce API calls
  - URL override parameter to view filtered posts
- **Performance Optimizations**:
  - Persistent post evaluation cache
  - Cache invalidation on settings changes
  - Clear cache button in UI

## Installation

### For Users

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/linkedin-content-filter.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

### For Developers

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/yourusername/linkedin-content-filter.git
   cd linkedin-content-filter
   ```
2. Make your changes
3. Load the extension in Chrome using the steps above
4. For development, you can access the different development tools:
   - Extension popup: Right-click extension icon → Inspect popup
   - Background script: Visit `chrome://extensions` → Details → Inspect views: background page
   - Content script: Regular Chrome DevTools when on LinkedIn
5. Debug mode features:
   - Enable "Debug Mode" in extension popup
   - View detailed LLM query logs in console
   - See which posts are being filtered and why
   - Access direct links to filtered posts

## Usage

1. Click the extension icon in your Chrome toolbar
2. Choose your filtering mode (Keywords or LLM)
3. If using LLM mode:
   - Select your preferred LLM provider
   - Enter the appropriate API key for the selected service
4. Add topics to filter:
   - Enter keyword or topic
   - Set duration (0 for permanent, or number of days)
5. Click "Save Settings"
6. Browse LinkedIn - matching content will be filtered automatically

### Viewing Filtered Posts

When a post is filtered, you'll see an orange log in the console with:

- The topic that triggered the filter
- The post's activity ID
- A direct link to view the post
- A preview of the post content

To view a filtered post:

1. Click the direct link in the console log
2. The post will open with `#override-deletion` in the URL
3. Filtering is automatically disabled when this parameter is present

### Cache Management

The extension caches post evaluations to improve performance:

- Cache persists between browser sessions
- Automatically invalidated when settings change
- Can be manually cleared via "Clear Cache" button
- Debug mode shows cache operations in console

### Project Structure

```
linkedin-content-filter/
├── manifest.json      # Extension configuration
├── popup.html        # Extension popup UI
├── popup.js         # Popup functionality
├── content.js       # LinkedIn page content script
└── background.js    # Background service worker
```

### Key Components

- **manifest.json**: Defines extension permissions and structure
- **popup.html/js**: User interface for configuration
- **content.js**: Handles LinkedIn feed filtering
- **background.js**: Manages extension state and settings

### Chrome APIs Used

- `chrome.storage.sync`: For settings persistence
- `chrome.storage.local`: For post evaluation cache
- `chrome.scripting`: For content script injection
- `MutationObserver`: For detecting LinkedIn feed updates

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT License](LICENSE)

## Acknowledgments

- Built using Chrome Extension Manifest V3
- Supports multiple LLM providers (OpenAI, Google Gemini, Anthropic Claude) for content analysis
- Inspired by the need for better content control on LinkedIn

Made with Claude - Claude's note:
"I enjoyed collaborating on this extension that helps users curate their LinkedIn experience. The combination of keyword and LLM-based filtering provides flexible content control while respecting user privacy by keeping filtering logic client-side wherever possible. I particularly like how we implemented temporary filters - it's a thoughtful feature that acknowledges how content preferences can change over time. Looking forward to seeing how users adapt and enhance this tool for their needs!"

## Security Notes

- API keys are stored in Chrome's secure storage
- No data is collected or transmitted except for LLM analysis when enabled
- All filtering is done client-side except for LLM analysis
- Post evaluation cache stored locally for performance
