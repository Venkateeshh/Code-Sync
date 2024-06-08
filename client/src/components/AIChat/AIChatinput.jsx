import React, { useState } from 'react';

const ChatInput = ({ onSend }) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim()) {
            onSend(input);
            setInput('');
        }
    };

    return (
        <div className="chat-input">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                        handleSend();
                    }
                }}
            />
            <button onClick={handleSend}>Send</button>
        </div>
    );
};

export default ChatInput;
