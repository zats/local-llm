# **Technical Specification: On-Device LLM Web Access (v5 \- Playground Update)**

This specification describes a Chrome extension that provides two core functionalities:

1. **A Website-Facing API**: Exposes on-device LLM capabilities to third-party websites.  
2. **An Extension Playground**: A built-in UI for users to interact directly with the on-device LLM, featuring a chat interface and customizable parameters.

## **Part I: Website-Facing API**

*This section defines the API for third-party websites and remains unchanged from v4.*

### **1\. Website API (JavaScript)**

#### **1.1. Discovery**

* **Mechanism**: The extension injects window.chromeNativeLLM into the page's window.  
* **Detection**: Websites check if (window.chromeNativeLLM).

#### **1.2. API Methods**

* **checkAvailability(): Promise\<AvailabilityStatus\>**: Checks if the model is ready.  
* **getCompletionStream(prompt: string, options?): AsyncIterable\<string\>**: (Recommended) Streams a response for a single prompt.  
* **getCompletion(prompt: string, options?): Promise\<string\>**: (Alternative) Gets a full response for a single prompt.

## **Part II: Chrome Extension Playground**

*This new section defines the extension's own user interface for direct interaction.*

### **2\. Extension UI (Popup Playground)**

This UI is displayed when the user clicks the extension icon in the Chrome toolbar.

#### **2.1. UI Components**

* **Chat View**: A scrollable area displaying the history of the current conversation (user prompts and LLM responses).  
* **Prompt Input**: A text area for the user to type their message.  
* **Controls Panel**: A section for customizing inference parameters for the playground session.  
  * **Temperature**: A slider to control creativity (e.g., 0.0 to 2.0).  
  * **Max Tokens**: A number input for the maximum response length.  
  * **Sampling Mode**: A dropdown to select the sampling strategy (e.g., Top-K, Top-P, Greedy).  
* **Session Management**:  
  * **"New Chat" button**: Clears the current playground session and starts a new conversation.

#### **2.2. Functionality**

* The playground supports stateful, multi-turn conversations. Each conversation corresponds to a single LanguageModelSession on the native macOS side, which maintains the Transcript (history).  
* The "New Chat" button will trigger the creation of a new session.

## **Part III: System Architecture & Communication**

*This section is updated to include the new commands and session management required for the playground.*

### **3\. Extension to Native App Communication (Native Messaging)**

The protocol is updated to manage conversational sessions for the playground alongside one-off requests from websites.

#### **3.1. Message Format (JSON) \- Extension \-\> Native App**

* **Website API Commands (Unchanged)**:  
  * checkAvailability  
  * getCompletionStream  
  * getCompletion  
* **Playground Session Commands (New)**:  
  * **startPlaygroundSession**: Creates a new conversational session on the native side.  
    { "requestId": "req-xyz", "command": "startPlaygroundSession" }

  * **sendPlaygroundMessage**: Sends a prompt to an *existing* session. Includes current playground parameters.  
    {  
      "requestId": "req-p-123",  
      "command": "sendPlaygroundMessage",  
      "payload": {  
        "sessionId": "session-abc",  
        "prompt": "Tell me more about that.",  
        "temperature": 0.8,  
        "maximumResponseTokens": 512  
      }  
    }

  * **endPlaygroundSession**: Tells the native app to discard a session and its history.  
    { "requestId": "req-end", "command": "endPlaygroundSession", "payload": { "sessionId": "session-abc" } }

#### **3.2. Message Format (JSON) \- Native App \-\> Extension**

* **Responses for Website API (Unchanged)**: availabilityResponse, completionResponse, etc. continue to use their original requestId.  
* **Responses for Playground**:  
  * **playgroundSessionStarted**: Confirms a new session was created.  
    { "requestId": "req-xyz", "type": "playgroundSessionStarted", "payload": { "sessionId": "session-abc" } }

  * Playground responses now include the sessionId so the UI can update the correct conversation. The response will be streamed.  
    * { "type": "streamChunk", "payload": { "sessionId": "session-abc", "token": "..." } }  
    * { "type": "streamEnd", "payload": { "sessionId": "session-abc" } }  
    * { "type": "error", "payload": { "sessionId": "session-abc", "message": "...", "code": "..." } }

### **4\. macOS Native App (Swift)**

The native app must now manage multiple, concurrent LanguageModelSession instances.

#### **4.1. State Management**

* The native app will maintain a dictionary of active playground sessions:  
  var activeSessions: \[String: LanguageModelSession\] \= \[:\]

  The String key is the sessionId.

#### **4.2. Command Implementation**

* **Handling checkAvailability, getCompletion, getCompletionStream**: These website-facing commands are handled as before, creating a temporary session per request.  
* **Handling startPlaygroundSession (New)**:  
  1. Generate a unique sessionId (e.g., a UUID string).  
  2. Create a new LanguageModelSession: let session \= LanguageModelSession().  
  3. Store it in the dictionary: activeSessions\[sessionId\] \= session.  
  4. Send a playgroundSessionStarted message back with the new sessionId.  
* **Handling sendPlaygroundMessage (New)**:  
  1. Look up the session in activeSessions using the provided sessionId. If not found, send an error.  
  2. Create GenerationOptions from the temperature and other parameters in the payload.  
  3. Call streamResponse(to: options:) on the **retrieved session instance**. The framework automatically uses the session's existing transcript for context.  
  4. Stream streamChunk and streamEnd messages back to the extension, including the sessionId in each message.  
* **Handling endPlaygroundSession (New)**:  
  1. Remove the session associated with the sessionId from the activeSessions dictionary.