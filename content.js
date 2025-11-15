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

  // Run the bookmarklet code after a short delay
  setTimeout(() => {
    (()=>{let rows=[["Price","Title","Location","Link"]];let seen=new Set();let scrolls=0,maxScrolls=3,delay=1000;function abs(u){try{return new URL(u,location.origin).href}catch{return u}}function getCity(){let match=location.pathname.match(/\/marketplace\/([^\/]+)/);return match?match[1]:"unknown"}function scrape(){document.querySelectorAll("div").forEach(e=>{let c=[...e.children];if(c.length===3&&c.every(x=>x.tagName==="DIV")){let priceEl=c[0].querySelector('span[dir="auto"]');let p=priceEl?priceEl.textContent.trim():"";if(p.startsWith("$")){let t=c[1].innerText.trim(),l=c[2].innerText.trim();let a=e.closest("a");let link=a?abs(a.getAttribute("href")||""):"";let key=p+t+l+link;if(!seen.has(key)){seen.add(key);rows.push([p,t,l,link]);}}}})}function dl(){let count=rows.length-1;let city=getCity();let csv=rows.map(r=>r.map(x=>`"${x.replace(/"/g,'""')}"`).join(",")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`${city}${count}.csv`;a.click()}function step(){scrape();window.scrollBy(0,document.body.scrollHeight);scrolls++;if(scrolls<maxScrolls){setTimeout(step,delay)}else{scrape();dl();}}step()})();

    // Remove panel after some time and continue to next search
    setTimeout(() => {
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }

      // Signal background script to continue to next search
      chrome.runtime.sendMessage({action: 'continueToNextSearch'});
    }, 3000); // Wait 3 seconds for bookmarklet to complete
  }, 500);
}