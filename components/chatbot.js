/* Chatbot component — injected into every page via this script */
(function () {
  const placeholder = document.getElementById('chatbot-placeholder');
  if (!placeholder) return;

  placeholder.outerHTML = `
<div id="chatbot-container">

  <div id="chatbot-window" hidden role="dialog" aria-label="AMNIKON automated assistant">
    <div class="chatbot-header">
      <div class="chatbot-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2 1-4.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/></svg></div>
      <div class="chatbot-header-info">
        <h5>AMNIKON Assistant</h5>
        <span><span class="chatbot-status-dot"></span>Automated guide</span>
      </div>
      <button type="button" id="chatbot-close" aria-label="Close chat">✕</button>
    </div>

    <nav class="chatbot-nav">
      <a href="/pages/support/support.html">
        <span class="chatbot-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0M19 7v4m2-2h-4"/></svg></span>
        <span>Request a Consultation</span>
      </a>
      <a href="mailto:info@amnikontechnologies.com">
        <span class="chatbot-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span>
        <span>Email</span>
      </a>
    </nav>

    <div class="chatbot-messages" id="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Automated conversation">
      <div class="chat-msg bot">👋 Hi! How can we help you today?</div>
      <div class="chat-msg bot">Ask me about information on this website. I will show the relevant page, or help you contact our team if I cannot find an answer. Messages here are automated and are not sent to our team.</div>
    </div>

    <div class="chatbot-input">
      <label class="sr-only" for="chatbot-input">Your message to the automated guide</label>
      <input type="text" id="chatbot-input" placeholder="Type your message…" autocomplete="off" />
      <button id="chatbot-send" aria-label="Send message">➤</button>
    </div>
  </div>

  <button id="chatbot-toggle" type="button" aria-label="Open chat" aria-expanded="false" aria-controls="chatbot-window">
    <svg class="chatbot-icon-open" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1565c0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <span class="close-icon">✕</span>
  </button>

</div>
`;
})();
