let currentCityIndex = 0;
let currentTermIndex = 0;

const cities = ["sanantonio", "austin", "houston", "dallas"];
const searchTerms = ["iphone 17", "iphone 16", "iphone 15", "iphone 14"];
const minPrice = 125;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startNavigation') {
    currentCityIndex = 0;
    currentTermIndex = 0;
    processNextSearch();
    sendResponse({status: 'ok'});
  }

  if (request.action === 'continueToNextSearch') {
    setTimeout(processNextSearch, 500); // 2 second pause between searches
  }
});

function processNextSearch() {
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
      // Wait 3 seconds for page to load, then run the bookmarklet
      setTimeout(function() {
        runBookmarklet(tabId);
      }, 3000);
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
  chrome.tabs.sendMessage(tabId, {action: 'showPanelAndRun'});
}