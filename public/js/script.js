document.addEventListener('DOMContentLoaded', function() {
    // Generate QR code
    const qrCodeContainer = document.getElementById('qr-code');
    const qrCodeUrl = "https://wa.me/14155238886?text=join%20bold-chapter";
    
    new QRCode(qrCodeContainer, {
        text: qrCodeUrl,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Copy phone number to clipboard
    const copyBtn = document.getElementById('copy-btn');
    const phoneNumber = document.getElementById('phone-number');
    
    copyBtn.addEventListener('click', function() {
        const textArea = document.createElement('textarea');
        textArea.value = phoneNumber.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show copied notification
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    });
    
    // Open WhatsApp link
    const openWhatsAppBtn = document.getElementById('open-whatsapp');
    const joinCodeCheckbox = document.getElementById('join-code-checkbox');
    
    openWhatsAppBtn.addEventListener('click', function(e) {
        e.preventDefault();
        let message = '';
        
        if (joinCodeCheckbox.checked) {
            message = 'join bold-chapter';
        }
        
        window.open(`https://wa.me/14155238886?text=${encodeURIComponent(message)}`, '_blank');
    });
    
    // Chat demo functionality
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Initial bot message
    addMessage('Welcome to WhatsApp Gaming! Type "help" to see available commands or start playing by typing "play".', 'in');
    
    // Send message function
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message === '') return;
        
        // Add user message to chat
        addMessage(message, 'out');
        messageInput.value = '';
        
        // Send message to server API
        fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add bot response to chat
                addMessage(data.message, 'in');
            } else {
                // Handle error
                addMessage('Sorry, there was an error processing your message. Please try again.', 'in');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage('Sorry, there was an error connecting to the server. Please try again later.', 'in');
        });
    }
    
    // Add message to chat
    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = text;
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        const now = new Date();
        messageTime.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        messageDiv.appendChild(messageText);
        messageDiv.appendChild(messageTime);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Event listeners for sending messages
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
