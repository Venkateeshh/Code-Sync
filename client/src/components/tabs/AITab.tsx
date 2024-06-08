import { DeepChat } from 'deep-chat-react';

const AITab = () => {
  return (
    <div className="flex max-h-full min-h-[400px] w-full flex-col p-2">
      <h1 className="tab-title">Deep Chat</h1>
      <div className="flex-grow flex flex-col overflow-auto rounded-lg bg-white shadow-md">
        <div className="flex-grow flex flex-col ">
          <DeepChat
            directConnection={{
              cohere: {
                key: "4y3lScV2oOUQvkvrspSP0wGLjFruYXE85lC5tV9h",
                chat: { temperature: 1 }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AITab;
