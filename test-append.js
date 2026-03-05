import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><div id="chat-box"></div>`);
const document = dom.window.document;
const chatBox = document.getElementById('chat-box');

function appendSingleAdminMessageToDOM(chatBox, msg) {
    if (chatBox.innerHTML.includes("No messages here yet")) {
        chatBox.innerHTML = '';
    }

    const bubbleBox = document.createElement('div');
    bubbleBox.style.display = 'flex';
    bubbleBox.style.flexDirection = 'column';
    bubbleBox.style.maxWidth = '80%';

    const bubble = document.createElement('div');
    bubble.style.padding = '0.75rem';
    bubble.style.borderRadius = '8px';
    bubble.textContent = msg.content;

    const dt = new Date(msg.created_at);
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + dt.toLocaleDateString();
    const timeLabel = document.createElement('span');
    timeLabel.style.fontSize = '0.7rem';
    timeLabel.style.color = '#94a3b8';
    timeLabel.style.marginTop = '0.2rem';
    timeLabel.textContent = timeStr;

    if (msg.is_from_admin) {
        // Admin (Me) is sending
        bubbleBox.style.alignSelf = 'flex-end';
        bubble.style.background = 'var(--primary-color)';
        bubble.style.color = '#000';
        timeLabel.style.alignSelf = 'flex-end';
    } else {
        // Student is sending
        bubbleBox.style.alignSelf = 'flex-start';
        bubble.style.background = '#e2e8f0';
        bubble.style.color = '#1e293b';
        timeLabel.style.alignSelf = 'flex-start';

        const senderLabel = document.createElement('span');
        senderLabel.style.fontSize = '0.75rem';
        senderLabel.style.fontWeight = 'bold';
        senderLabel.style.color = '#64748b';
        senderLabel.style.marginBottom = '0.2rem';
        senderLabel.textContent = 'Student';
        bubbleBox.insertBefore(senderLabel, bubble);
    }

    bubbleBox.appendChild(bubble);
    bubbleBox.appendChild(timeLabel);
    chatBox.appendChild(bubbleBox);
    chatBox.scrollTop = chatBox.scrollHeight;
}

const msg = {
    content: "Test",
    created_at: "2026-03-05T19:35:59+07:00",
    is_from_admin: false
};

try {
    appendSingleAdminMessageToDOM(chatBox, msg);
    console.log("Success:", chatBox.innerHTML);
} catch (e) {
    console.error("Error:", e);
}
