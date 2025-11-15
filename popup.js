document.getElementById('startBtn').addEventListener('click', function() {
  chrome.runtime.sendMessage({action: 'startNavigation'});
  window.close();
});