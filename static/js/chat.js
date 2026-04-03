// Chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chatForm');
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!chatForm || !chatMessages || !userInput) {
        return; // Not on chat page
    }
    
    // Auto-scroll to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add message to chat
    function addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // Show loading state
    function setLoading(loading) {
        sendBtn.disabled = loading;
        sendBtn.textContent = loading ? 'Sending...' : 'Send';
        userInput.disabled = loading;
    }
    
    // Handle form submit
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;
        
        // Add user message to UI
        addMessage(message, 'user');
        userInput.value = '';
        setLoading(true);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await response.json()
                : {
                    success: false,
                    error: await response.text() || 'Unexpected server response'
                };
            
            if (response.ok && data.success) {
                addMessage(data.response, 'assistant');
            } else {
                addMessage('Error: ' + (data.error || 'Failed to get response'), 'assistant');
            }
        } catch (error) {
            addMessage('Error: Connection failed. Please try again.', 'assistant');
            console.error('Chat error:', error);
        } finally {
            setLoading(false);
            userInput.focus();
        }
    });
    
    // Initial scroll
    scrollToBottom();
});
