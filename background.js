let currentCityIndex = 0;
let currentTermIndex = 0;
let isProcessing = false;

const cities = ["sanantonio", "austin", "houston", "dallas"];
const searchTerms = ["iphone 17", "iphone 16", "iphone 15", "iphone 14"];
const minPrice = 125;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startNavigation') {
    currentCityIndex = 0;
    currentTermIndex = 0;
    isProcessing = false;
    processNextSearch();
    sendResponse({status: 'ok'});
  }

  if (request.action === 'continueToNextSearch') {
    if (!isProcessing) {
      isProcessing = true;
      setTimeout(() => {
        processNextSearch();
        isProcessing = false;
      }, 2000); // 2 second pause between searches
    }
  }
});

function processNextSearch() {
  console.log(`Processing next search (term ${currentTermIndex}, city ${currentCityIndex})...`);

  if (currentTermIndex >= searchTerms.length) {
    currentTermIndex = 0;
  }
  if (currentCityIndex >= cities.length) {
    currentCityIndex = 0;
    currentTermIndex++;
  }

  // If we've gone through all search terms, start over
  if (currentTermIndex >= searchTerms.length) {
    currentTermIndex = 0;
  }

  const searchTerm = searchTerms[currentTermIndex];
  const city = cities[currentCityIndex];
  const searchUrl = createSearchUrl(city, searchTerm, minPrice);

  console.log(`Searching for '${searchTerm}' in '${city}'`);

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const tabId = tabs[0].id;

    chrome.tabs.update(tabId, { url: searchUrl }, function() {
      // Wait 5 seconds for page to load, then run the bookmarklet
      setTimeout(function() {
        runBookmarklet(tabId);
      }, 5000);
    });
  });

  // Move to next city for the same search term
  currentCityIndex++;
}

function createSearchUrl(city, searchTerms, minPrice) {
  const encodedQuery = encodeURIComponent(searchTerms);
  let url = `https://www.facebook.com/marketplace/${city}/search?`;

  if (minPrice !== null) {
    url += `minPrice=${minPrice}&`;
  }

  url += `daysSinceListed=1&deliveryMethod=local_pick_up&query=${encodedQuery}&exact=false`;

  return url;
}

function runBookmarklet(tabId) {
  console.log(`Running bookmarklet on tab ${tabId}`);

  chrome.tabs.sendMessage(tabId, {action: 'showPanelAndRun'}, function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message to content script:', chrome.runtime.lastError);
    }
  });
}