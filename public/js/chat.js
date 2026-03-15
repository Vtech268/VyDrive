/* ============================================
   VyDrive Cloud 0.2 - Chat Page JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const chatMessages = document.getElementById('chatMessages');
  const refreshBtn = document.getElementById('refreshChat');
  
  let lastMessageId = null;
  let pollingInterval = null;
  
  // Scroll to bottom
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Create message element
  function createMessageElement(msg) {
    const messageDiv = document.createElement('div');
    const isAdmin = msg.senderType === 'admin' || msg.sender_type === 'admin';
    messageDiv.className = `message ${isAdmin ? 'message-admin' : 'message-user'}`;
    messageDiv.dataset.id = msg._id || msg.id;
    
    const time = new Date(msg.createdAt || msg.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-${isAdmin ? 'user-shield' : 'user'}"></i>
      </div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-sender">${msg.sender}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${escapeHtml(msg.message)}</div>
      </div>
    `;
    
    return messageDiv;
  }
  
  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Add message to chat
  function addMessage(msg, scroll = true) {
    // Check if message already exists
    const existingMsg = document.querySelector(`[data-id="${msg._id || msg.id}"]`);
    if (existingMsg) return;
    
    const msgElement = createMessageElement(msg);
    
    // Remove empty state if exists
    const emptyState = chatMessages.querySelector('.chat-empty');
    if (emptyState) {
      emptyState.remove();
    }
    
    chatMessages.appendChild(msgElement);
    
    if (scroll) {
      scrollToBottom();
    }
  }
  
  // Send message
  chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Clear input
    messageInput.value = '';
    
    // Optimistically add message
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      sender: 'You',
      senderType: 'user',
      message: message,
      createdAt: new Date().toISOString()
    };
    addMessage(tempMsg);
    
    try {
      const response = await fetch('/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update temp message with real data
        const tempElement = document.querySelector('[data-id="' + tempMsg._id + '"]');
        if (tempElement) {
          tempElement.dataset.id = data.data.id;
        }
      } else {
        showToast(data.message || 'Failed to send message', 'error');
      }
    } catch (error) {
      showToast('Error sending message', 'error');
    }
  });
  
  // Fetch new messages
  async function fetchMessages() {
    try {
      // Get last message timestamp
      const lastMsg = chatMessages.lastElementChild;
      let since = '';
      
      if (lastMsg && lastMsg.dataset.id !== 'temp_' + lastMsg.dataset.id) {
        // Get timestamp from the last message
        const messages = Array.from(chatMessages.querySelectorAll('.message'));
        const lastRealMsg = messages.pop();
        if (lastRealMsg) {
          const timeEl = lastRealMsg.querySelector('.message-time');
          // This is a simplified approach - in production you'd use actual timestamps
        }
      }
      
      const response = await fetch('/chat/messages' + (since ? '?since=' + since : ''));
      const data = await response.json();
      
      if (data.success && data.messages) {
        data.messages.forEach(msg => addMessage(msg, false));
        
        // Scroll to bottom if new messages added
        if (data.messages.length > 0) {
          const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 50;
          if (isScrolledToBottom) {
            scrollToBottom();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }
  
  // Start polling
  function startPolling() {
    fetchMessages(); // Initial fetch
    pollingInterval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
  }
  
  // Stop polling
  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }
  
  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      this.querySelector('i').classList.add('fa-spin');
      fetchMessages().then(() => {
        setTimeout(() => {
          this.querySelector('i').classList.remove('fa-spin');
        }, 500);
      });
    });
  }
  
  // Handle visibility change
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      stopPolling();
    } else {
      startPolling();
      fetchMessages();
    }
  });
  
  // Start polling on load
  startPolling();
  
  // Scroll to bottom on load
  scrollToBottom();
  
  // Handle Enter key
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });
});
