let isRunning = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'showPanelAndRun') {
    // Prevent multiple simultaneous executions
    if (isRunning) {
      console.log('Already running, ignoring duplicate request');
      sendResponse({status: 'already_running'});
      return;
    }

    isRunning = true;
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

  // Simple timeout to ensure continuation
  const EXECUTION_TIME = 18000; // 18 seconds total (10 scrolls + buffer)
  let hasContinued = false;

  function continueToNextSearch() {
    if (!hasContinued) {
      hasContinued = true;
      isRunning = false; // Reset running flag

      // Remove panel if it exists
      if (panel && panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }

      console.log('Continuing to next search...');

      // Signal background script to continue to next search
      chrome.runtime.sendMessage({action: 'continueToNextSearch'});
    }
  }

  function runBookmarkletCode() {
    console.log('Starting bookmarklet execution...');

    // Run the original bookmarklet code with proper duplicate detection
    (()=>{
      let rows=[["Price","Title","Location","Link"]];
      let seen=new Set();
      let scrolls=0, maxScrolls=10, delay=1000;

      function abs(u) {
        try {
          return new URL(u,location.origin).href;
        } catch {
          return u;
        }
      }

      function getCity() {
        let match=location.pathname.match(/\/marketplace\/([^\/]+)/);
        return match?match[1]:"unknown";
      }

      function scrape() {
        document.querySelectorAll("div").forEach(e => {
          let c=[...e.children];
          if(c.length===3 && c.every(x=>x.tagName==="DIV")) {
            let priceEl=c[0].querySelector('span[dir="auto"]');
            let p=priceEl?priceEl.textContent.trim():"";
            if(p.startsWith("$")) {
              let t=c[1].innerText.trim();
              let l=c[2].innerText.trim();
              let a=e.closest("a");
              let link=a?abs(a.getAttribute("href")||""):"";
              let key=p+t+l+link;
              if(!seen.has(key)) {
                seen.add(key);
                rows.push([p,t,l,link]);
              }
            }
          }
        });
      }

      function dl() {
        let count=rows.length-1;
        if(count <= 0) {
          console.log('No items found to download');
          return;
        }

        let city=getCity();
        let csv=rows.map(r=>r.map(x=>`"${x.replace(/"/g,'""')}"`).join(",")).join("\n");
        let a=document.createElement("a");
        a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
        a.download=`${city}${count}.csv`;
        a.click();
        console.log(`Downloaded ${count} items for ${city}`);
      }

      function step() {
        scrape();
        window.scrollBy(0,document.body.scrollHeight);
        scrolls++;
        if(scrolls<maxScrolls) {
          setTimeout(step,delay);
        } else {
          scrape();
          dl();
        }
      }

      step();
    })();
  }

  // Wait for page to load, then run bookmarklet
  setTimeout(() => {
    // Check if page has marketplace content
    const hasMarketplaceContent = document.querySelector('[role="main"]') ||
                                  document.querySelector('[aria-label="Marketplace"]') ||
                                  document.querySelector('div[role="feed"]');

    if (!hasMarketplaceContent) {
      console.log('Marketplace content not yet loaded, waiting additional time...');
      setTimeout(() => runBookmarkletCode(), 3000);
    } else {
      runBookmarkletCode();
    }
  }, 3000); // Wait 3 seconds for page load

  // Single timeout to ensure continuation
  setTimeout(() => {
    console.log('Execution timeout reached');
    continueToNextSearch();
  }, EXECUTION_TIME);

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    continueToNextSearch();
  });
}