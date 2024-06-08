import React from "react";

const AiResponse = ({ response }) => {
    return (
        <div>
            <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
    );
};

export default AiResponse;