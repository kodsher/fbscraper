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
    setTimeout(processNextSearch, 2000); // 2 second pause between searches
  }
});

function processNextSearch() {
  try {
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
      if (chrome.runtime.lastError) {
        console.error('Error querying tabs:', chrome.runtime.lastError);
        // Continue to next search even if tab query fails
        setTimeout(() => processNextSearch(), 3000);
        return;
      }

      if (!tabs || !tabs[0]) {
        console.error('No active tab found');
        setTimeout(() => processNextSearch(), 3000);
        return;
      }

      const tabId = tabs[0].id;

      chrome.tabs.update(tabId, { url: searchUrl }, function() {
        if (chrome.runtime.lastError) {
          console.error('Error updating tab:', chrome.runtime.lastError);
          // Continue to next search even if navigation fails
          setTimeout(() => processNextSearch(), 3000);
          return;
        }

        // Wait 5 seconds for page to load, then run the bookmarklet
        setTimeout(function() {
          runBookmarklet(tabId);
        }, 5000);
      });
    });

    // Move to next city for the same search term
    currentCityIndex++;

  } catch (error) {
    console.error('Error in processNextSearch:', error);
    // Continue to next search even if there's an error
    setTimeout(() => processNextSearch(), 3000);
  }
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
  try {
    console.log(`Running bookmarklet on tab ${tabId}`);

    chrome.tabs.sendMessage(tabId, {action: 'showPanelAndRun'}, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to content script:', chrome.runtime.lastError);
        console.log('Tab may be closed or not a valid page, continuing to next search...');
        // Continue to next search even if message sending fails
        setTimeout(() => processNextSearch(), 3000);
      } else {
        console.log('Bookmarklet message sent successfully');
      }
    });
  } catch (error) {
    console.error('Error in runBookmarklet:', error);
    // Continue to next search even if there's an error
    setTimeout(() => processNextSearch(), 3000);
  }
}