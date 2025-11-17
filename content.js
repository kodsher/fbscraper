chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'showPanelAndRun') {
    createAndRunPanel();
    sendResponse({status: 'ok'});
  }
});

function createAndRunPanel() {
  // Remove existing panel if present
  const existingPanel = document.getElementById('scroll-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create the panel
  const panel = document.createElement('div');
  panel.id = 'scroll-panel';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 200px;
    background: #4285f4;
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    font-size: 14px;
  `;
  panel.innerHTML = '<div>Auto-scrolling...</div>';

  document.body.appendChild(panel);

  // Set a maximum timeout to ensure we always continue to the next search
  const MAX_EXECUTION_TIME = 20000; // 20 seconds maximum
  const COMPLETION_TIME = 15000; // Normal completion time

  let hasContinued = false;

  function continueToNextSearch() {
    if (!hasContinued) {
      hasContinued = true;

      // Remove panel if it exists
      if (panel && panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }

      console.log('Continuing to next search...');

      // Always signal background script to continue to next search
      chrome.runtime.sendMessage({action: 'continueToNextSearch'}, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Failed to send continue message:', chrome.runtime.lastError);
        }
      });
    }
  }

  function runBookmarkletCode() {
    try {
      console.log('Starting bookmarklet execution...');

      (()=>{let rows=[["Price","Title","Location","Link"]];let seen=new Set();let scrolls=0,maxScrolls=10,delay=1000;function abs(u){try{return new URL(u,location.origin).href}catch{return u}}function getCity(){let match=location.pathname.match(/\/marketplace\/([^\/]+)/);return match?match[1]:"unknown"}function scrape(){document.querySelectorAll("div").forEach(e=>{let c=[...e.children];if(c.length===3&&c.every(x=>x.tagName==="DIV")){let priceEl=c[0].querySelector('span[dir="auto"]');let p=priceEl?priceEl.textContent.trim():"";if(p.startsWith("$")){let t=c[1].innerText.trim(),l=c[2].innerText.trim();let a=e.closest("a");let link=a?abs(a.getAttribute("href")||""):"";let key=p+t+l+link;if(!seen.has(key)){seen.add(key);rows.push([p,t,l,link]);}}}})}function dl(){try{let count=rows.length-1;let city=getCity();let csv=rows.map(r=>r.map(x=>`"${x.replace(/"/g,'""')}"`).join(",")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`${city}${count}.csv`;a.click();console.log(`Downloaded ${count} items for ${city}`);}catch(e){console.error('Download failed:', e);}}function step(){try{scrape();window.scrollBy(0,document.body.scrollHeight);scrolls++;if(scrolls<maxScrolls){setTimeout(step,delay)}else{scrape();dl();}}catch(e){console.error('Scrolling error:', e);dl();}}step()})();

      console.log('Bookmarklet execution completed');
    } catch (error) {
      console.error('Bookmarklet execution failed:', error);
    }
  }

  // Wait longer for page to fully load before running bookmarklet
  setTimeout(() => {
    // Check if page has loaded marketplace content
    const hasMarketplaceContent = document.querySelector('[role="main"]') ||
                                  document.querySelector('[aria-label="Marketplace"]') ||
                                  document.querySelector('div[role="feed"]');

    if (!hasMarketplaceContent) {
      console.log('Marketplace content not yet loaded, waiting additional time...');
      // Wait additional 3 seconds if marketplace content isn't ready
      setTimeout(() => runBookmarkletCode(), 3000);
    } else {
      runBookmarkletCode();
    }
  }, 2000); // Increased from 500ms to 2000ms

  // Set up multiple safeguards to ensure continuation
  // 1. Normal completion timer
  setTimeout(() => {
    console.log('Normal completion timeout reached');
    continueToNextSearch();
  }, COMPLETION_TIME);

  // 2. Maximum execution time fallback
  setTimeout(() => {
    console.log('Maximum execution time reached, forcing continuation');
    continueToNextSearch();
  }, MAX_EXECUTION_TIME);

  // 3. Window unload handler (in case page navigates away)
  window.addEventListener('beforeunload', function() {
    console.log('Page unloading, sending continue signal');
    chrome.runtime.sendMessage({action: 'continueToNextSearch'});
  });
}