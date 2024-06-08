import React from 'react';

const ChatList = ({ messages }) => {
    return (
        <div className="chat-list">
            {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender}`}>
                    {msg.text}
                </div>
            ))}
        </div>
    );
};

export default ChatList;
