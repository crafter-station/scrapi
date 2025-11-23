# Complete Chat Messaging Implementation Guide

This document provides a **super detailed** explanation of how the chat messaging system is implemented in this v0-clone project. Use this as a blueprint to replicate the exact same functionality in another project.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Routes](#api-routes)
4. [Frontend Components](#frontend-components)
5. [Streaming Implementation](#streaming-implementation)
6. [State Management](#state-management)
7. [Complete Flow Diagrams](#complete-flow-diagrams)
8. [Step-by-Step Implementation](#step-by-step-implementation)

---

## Architecture Overview

The chat system uses a **hybrid architecture** combining:
- **Next.js App Router** for API routes and server-side logic
- **v0 SDK** (`v0-sdk` and `@v0-sdk/react`) for chat API communication and message rendering
- **PostgreSQL** (via Drizzle ORM) for ownership tracking and rate limiting
- **Server-Sent Events (SSE)** for real-time streaming responses
- **React Context** for streaming state handoff between pages
- **SWR** for data fetching and caching

### Key Technologies

```typescript
// Core dependencies
- v0-sdk: TypeScript SDK for v0 Platform API
- @v0-sdk/react: React components for rendering v0 messages
- drizzle-orm: PostgreSQL ORM
- next-auth: Authentication
- swr: Data fetching and caching
- streamdown: Stream processing utilities
```

---

## Database Schema

### Tables

#### 1. `users` Table
```sql
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64),
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

#### 2. `chat_ownerships` Table
```sql
CREATE TABLE "chat_ownerships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "v0_chat_id" varchar(255) NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("v0_chat_id")
);
```

**Purpose**: Maps v0 API chat IDs to authenticated users. Ensures users can only access their own chats.

#### 3. `anonymous_chat_logs` Table
```sql
CREATE TABLE "anonymous_chat_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ip_address" varchar(45) NOT NULL,
  "v0_chat_id" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

**Purpose**: Tracks anonymous chat creation by IP address for rate limiting.

### Database Queries (`lib/db/queries.ts`)

Key functions:

```typescript
// Create ownership for authenticated users
createChatOwnership({ v0ChatId, userId })

// Get ownership to verify access
getChatOwnership({ v0ChatId })

// Rate limiting for authenticated users
getChatCountByUserId({ userId, differenceInHours })

// Rate limiting for anonymous users
getChatCountByIP({ ipAddress, differenceInHours })

// Log anonymous chat creation
createAnonymousChatLog({ ipAddress, v0ChatId })
```

---

## API Routes

### 1. `/api/chat` (POST) - Main Chat Endpoint

**Location**: `app/api/chat/route.ts`

**Purpose**: Creates new chats or sends messages to existing chats.

#### Request Body
```typescript
{
  message: string              // Required: User's message
  chatId?: string              // Optional: Existing chat ID (for continuing conversation)
  streaming?: boolean          // Optional: Enable streaming (default: true)
  attachments?: Array<{        // Optional: Image attachments
    url: string
  }>
  projectId?: string          // Optional: Project ID
}
```

#### Flow

1. **Authentication Check**
   ```typescript
   const session = await auth()
   ```

2. **Rate Limiting**
   - **Authenticated users**: Check `chat_ownerships` table for messages in last 24 hours
   - **Anonymous users**: Check `anonymous_chat_logs` table by IP address
   - Limits:
     - Authenticated regular: 50 messages/day
     - Authenticated guest: 5 messages/day
     - Anonymous: 3 messages/day

3. **Chat Creation/Continuation**
   ```typescript
   if (chatId) {
     // Continue existing chat
     if (streaming) {
       chat = await v0.chats.sendMessage({
         chatId,
         message,
         responseMode: 'experimental_stream',
         attachments
       })
       // Return stream directly
       return new Response(chat as ReadableStream<Uint8Array>, {
         headers: {
           'Content-Type': 'text/event-stream',
           'Cache-Control': 'no-cache',
           Connection: 'keep-alive',
         },
       })
     } else {
       // Non-streaming response
       chat = await v0.chats.sendMessage({
         chatId,
         message,
         attachments
       })
     }
   } else {
     // Create new chat
     if (streaming) {
       chat = await v0.chats.create({
         message,
         responseMode: 'experimental_stream',
         attachments
       })
       return new Response(chat as ReadableStream<Uint8Array>, {
         headers: {
           'Content-Type': 'text/event-stream',
           'Cache-Control': 'no-cache',
           Connection: 'keep-alive',
         },
       })
     } else {
       chat = await v0.chats.create({
         message,
         responseMode: 'sync',
         attachments
       })
     }
   }
   ```

4. **Ownership/Logging** (for new chats only)
   ```typescript
   if (!chatId && chatDetail.id) {
     if (session?.user?.id) {
       // Authenticated: Create ownership mapping
       await createChatOwnership({
         v0ChatId: chatDetail.id,
         userId: session.user.id,
       })
     } else {
       // Anonymous: Log for rate limiting
       const clientIP = getClientIP(request)
       await createAnonymousChatLog({
         ipAddress: clientIP,
         v0ChatId: chatDetail.id,
       })
     }
   }
   ```

5. **Response**
   - **Streaming**: Returns `ReadableStream<Uint8Array>` with SSE headers
   - **Non-streaming**: Returns JSON with chat details and messages

#### IP Address Extraction
```typescript
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return 'unknown'
}
```

---

### 2. `/api/chats/[chatId]` (GET) - Fetch Chat Details

**Location**: `app/api/chats/[chatId]/route.ts`

**Purpose**: Retrieves full chat details including all messages.

#### Flow

1. **Authentication & Authorization**
   ```typescript
   const session = await auth()
   
   if (session?.user?.id) {
     // Check ownership
     const ownership = await getChatOwnership({ v0ChatId: chatId })
     if (!ownership || ownership.user_id !== session.user.id) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
     }
   } else {
     // Anonymous: Allow access (they can only access via direct URL)
   }
   ```

2. **Fetch from v0 API**
   ```typescript
   const chatDetails = await v0.chats.getById({ chatId })
   ```

3. **Response**
   ```typescript
   return NextResponse.json(chatDetails)
   ```

**Response Structure**:
```typescript
{
  id: string
  object: 'chat'
  name: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    experimental_content?: MessageBinaryFormat
    createdAt: string
    // ... other fields
  }>
  demo?: string
  latestVersion?: {
    demoUrl?: string
  }
  // ... other fields
}
```

---

### 3. `/api/chat/ownership` (POST) - Create Ownership Record

**Location**: `app/api/chat/ownership/route.ts`

**Purpose**: Creates ownership/logging record after chat is created (called from frontend).

#### Request Body
```typescript
{
  chatId: string
}
```

#### Flow
```typescript
if (session?.user?.id) {
  await createChatOwnership({
    v0ChatId: chatId,
    userId: session.user.id,
  })
} else {
  const clientIP = getClientIP(request)
  await createAnonymousChatLog({
    ipAddress: clientIP,
    v0ChatId: chatId,
  })
}
```

---

## Frontend Components

### 1. `useChat` Hook

**Location**: `hooks/use-chat.ts`

**Purpose**: Main hook for managing chat state and interactions.

#### State
```typescript
const [message, setMessage] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [isStreaming, setIsStreaming] = useState(false)
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

// SWR for fetching chat data
const { data: currentChat, error, isLoading: isLoadingChat } = useSWR<Chat>(
  chatId ? `/api/chats/${chatId}` : null
)
```

#### Key Functions

**`handleSendMessage`**:
```typescript
const handleSendMessage = async (
  e: React.FormEvent<HTMLFormElement>,
  attachments?: Array<{ url: string }>
) => {
  e.preventDefault()
  if (!message.trim() || isLoading || !chatId) return

  const userMessage = message.trim()
  setMessage('')
  setIsLoading(true)

  // Add user message to history immediately
  setChatHistory((prev) => [...prev, { type: 'user', content: userMessage }])

  // Fetch with streaming
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      chatId: chatId,
      streaming: true,
      attachments,
    }),
  })

  if (!response.ok) {
    // Handle errors
    throw new Error(errorMessage)
  }

  setIsStreaming(true)

  // Add streaming placeholder
  setChatHistory((prev) => [
    ...prev,
    {
      type: 'assistant',
      content: [],
      isStreaming: true,
      stream: response.body, // Attach the stream
    },
  ])
}
```

**`handleStreamingComplete`**:
```typescript
const handleStreamingComplete = async (finalContent: any) => {
  setIsStreaming(false)
  setIsLoading(false)

  // Fetch updated chat details
  const response = await fetch(`/api/chats/${chatId}`)
  if (response.ok) {
    const chatDetails = await response.json()
    const demoUrl = chatDetails?.latestVersion?.demoUrl || chatDetails?.demo
    
    // Update SWR cache
    mutate(`/api/chats/${chatId}`, {
      ...chatDetails,
      demo: demoUrl,
    }, false)
  }

  // Update chat history with final content
  setChatHistory((prev) => {
    const updated = [...prev]
    const lastIndex = updated.length - 1
    if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
      updated[lastIndex] = {
        ...updated[lastIndex],
        content: finalContent,
        isStreaming: false,
        stream: undefined,
      }
    }
    return updated
  })
}
```

**Streaming Handoff** (from homepage):
```typescript
useEffect(() => {
  if (handoff.chatId === chatId && handoff.stream && handoff.userMessage) {
    // Add user message
    setChatHistory((prev) => [
      ...prev,
      { type: 'user', content: handoff.userMessage! },
    ])

    // Start streaming
    setIsStreaming(true)
    setChatHistory((prev) => [
      ...prev,
      {
        type: 'assistant',
        content: [],
        isStreaming: true,
        stream: handoff.stream,
      },
    ])

    clearHandoff()
  }
}, [chatId, handoff, clearHandoff])
```

---

### 2. `ChatMessages` Component

**Location**: `components/chat/chat-messages.tsx`

**Purpose**: Renders the list of chat messages.

```typescript
export function ChatMessages({
  chatHistory,
  isLoading,
  currentChat,
  onStreamingComplete,
  onChatData,
  onStreamingStarted,
}: ChatMessagesProps) {
  return (
    <Conversation>
      <ConversationContent>
        {chatHistory.map((msg, index) => (
          <Message from={msg.type} key={index}>
            {msg.isStreaming && msg.stream ? (
              <StreamingMessage
                stream={msg.stream}
                messageId={`msg-${index}`}
                role={msg.type}
                onComplete={onStreamingComplete}
                onChatData={onChatData}
                onChunk={(chunk) => {
                  if (onStreamingStarted && !streamingStartedRef.current) {
                    streamingStartedRef.current = true
                    onStreamingStarted()
                  }
                }}
                onError={(error) => console.error('Streaming error:', error)}
                components={sharedComponents}
                showLoadingIndicator={false}
              />
            ) : (
              <MessageRenderer
                content={msg.content}
                role={msg.type}
                messageId={`msg-${index}`}
              />
            )}
          </Message>
        ))}
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader size={16} />
          </div>
        )}
      </ConversationContent>
    </Conversation>
  )
}
```

**Key Points**:
- Uses `@v0-sdk/react` `StreamingMessage` component for streaming messages
- Uses `MessageRenderer` for completed messages
- Handles loading states

---

### 3. `MessageRenderer` Component

**Location**: `components/message-renderer.tsx`

**Purpose**: Renders completed messages (both user and assistant).

```typescript
export function MessageRenderer({
  content,
  messageId,
  role,
}: MessageRendererProps) {
  // User messages or plain text: render as string
  if (typeof content === 'string') {
    return (
      <div>
        <p className="mb-4 text-gray-700 dark:text-gray-200">
          {content}
        </p>
      </div>
    )
  }

  // Assistant messages: Use v0 SDK Message component
  const processedContent = preprocessMessageContent(content)
  
  return (
    <Message
      content={processedContent}
      messageId={messageId}
      role={role}
      components={sharedComponents}
    />
  )
}
```

**Preprocessing**: Removes V0_FILE markers and shell placeholders from content.

---

### 4. `ChatInput` Component

**Location**: `components/chat/chat-input.tsx`

**Purpose**: Input field for sending messages.

**Features**:
- Text input with auto-resize
- Image attachments (drag & drop, file picker)
- Voice input (microphone button)
- Session storage persistence
- Submit button with loading states

```typescript
<PromptInput onSubmit={handleSubmit}>
  <PromptInputImagePreview
    attachments={attachments}
    onRemove={handleRemoveAttachment}
  />
  <PromptInputTextarea
    ref={textareaRef}
    onChange={(e) => setMessage(e.target.value)}
    value={message}
    placeholder="Continue the conversation..."
  />
  <PromptInputToolbar>
    <PromptInputTools>
      <PromptInputImageButton onImageSelect={handleImageFiles} />
    </PromptInputTools>
    <PromptInputTools>
      <PromptInputMicButton
        onTranscript={(transcript) => {
          setMessage(message + (message ? ' ' : '') + transcript)
        }}
      />
      <PromptInputSubmit
        disabled={!message}
        status={isLoading ? 'streaming' : 'ready'}
      />
    </PromptInputTools>
  </PromptInputToolbar>
</PromptInput>
```

---

### 5. Home Page (`HomeClient`)

**Location**: `components/home/home-client.tsx`

**Purpose**: Initial chat creation interface.

#### Flow

1. **User submits message**:
   ```typescript
   const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault()
     const userMessage = message.trim()
     
     // Clear and reset
     setMessage('')
     setAttachments([])
     
     // Show chat interface
     setShowChatInterface(true)
     setChatHistory([{ type: 'user', content: userMessage }])
     setIsLoading(true)

     // Create chat with streaming
     const response = await fetch('/api/chat', {
       method: 'POST',
       body: JSON.stringify({
         message: userMessage,
         streaming: true,
         attachments: currentAttachments.map(att => ({ url: att.dataUrl })),
       }),
     })

     // Add streaming response
     setChatHistory((prev) => [
       ...prev,
       {
         type: 'assistant',
         content: [],
         isStreaming: true,
         stream: response.body,
       },
     ])
   }
   ```

2. **Handle chat data** (extract chat ID):
   ```typescript
   const handleChatData = async (chatData: any) => {
     if (chatData.id) {
       setCurrentChatId(chatData.id)
       setCurrentChat({ id: chatData.id })
       
       // Update URL
       window.history.pushState(null, '', `/chats/${chatData.id}`)
       
       // Create ownership
       await fetch('/api/chat/ownership', {
         method: 'POST',
         body: JSON.stringify({ chatId: chatData.id }),
       })
     }
   }
   ```

3. **Handle streaming complete**:
   ```typescript
   const handleStreamingComplete = async (finalContent: any) => {
     setIsLoading(false)
     
     // Update history
     setChatHistory((prev) => {
       const updated = [...prev]
       const lastIndex = updated.length - 1
       if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
         updated[lastIndex] = {
           ...updated[lastIndex],
           content: finalContent,
           isStreaming: false,
           stream: undefined,
         }
       }
       return updated
     })

     // Fetch demo URL
     if (currentChat?.id) {
       const response = await fetch(`/api/chats/${currentChat.id}`)
       const chatDetails = await response.json()
       const demoUrl = chatDetails?.latestVersion?.demoUrl || chatDetails?.demo
       
       if (demoUrl) {
         setCurrentChat((prev) => prev ? { ...prev, demo: demoUrl } : null)
       }
     }
   }
   ```

---

### 6. Chat Detail Page (`ChatDetailClient`)

**Location**: `components/chats/chat-detail-client.tsx`

**Purpose**: Displays existing chat conversations.

```typescript
export function ChatDetailClient() {
  const params = useParams()
  const chatId = params.chatId as string
  
  const {
    message,
    setMessage,
    currentChat,
    isLoading,
    chatHistory,
    handleSendMessage,
    handleStreamingComplete,
    handleChatData,
  } = useChat(chatId)

  return (
    <div>
      <AppHeader />
      <ResizableLayout
        leftPanel={
          <div>
            <ChatMessages
              chatHistory={chatHistory}
              isLoading={isLoading}
              currentChat={currentChat}
              onStreamingComplete={handleStreamingComplete}
              onChatData={handleChatData}
            />
            <ChatInput
              message={message}
              setMessage={setMessage}
              onSubmit={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        }
        rightPanel={<PreviewPanel currentChat={currentChat} />}
      />
    </div>
  )
}
```

---

## Streaming Implementation

### How Streaming Works

1. **Server-Side** (`/api/chat` route):
   ```typescript
   // Create streaming chat
   const chat = await v0.chats.create({
     message,
     responseMode: 'experimental_stream',
   })

   // Return stream directly
   return new Response(chat as ReadableStream<Uint8Array>, {
     headers: {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache',
       Connection: 'keep-alive',
     },
   })
   ```

2. **Client-Side** (`useChat` hook):
   ```typescript
   // Fetch stream
   const response = await fetch('/api/chat', {
     method: 'POST',
     body: JSON.stringify({ message, streaming: true }),
   })

   // Attach stream to message
   setChatHistory((prev) => [
     ...prev,
     {
       type: 'assistant',
       content: [],
       isStreaming: true,
       stream: response.body, // ReadableStream
     },
   ])
   ```

3. **Rendering** (`ChatMessages` component):
   ```typescript
   <StreamingMessage
     stream={msg.stream}
     onComplete={onStreamingComplete}
     onChatData={onChatData}
     components={sharedComponents}
   />
   ```

The `StreamingMessage` component from `@v0-sdk/react`:
- Reads the stream chunk by chunk
- Parses SSE events
- Updates UI in real-time
- Calls `onComplete` when stream finishes
- Calls `onChatData` when chat metadata is received

---

## State Management

### 1. Local State (React useState)

**Chat History**:
```typescript
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
```

**Message Input**:
```typescript
const [message, setMessage] = useState('')
```

**Loading States**:
```typescript
const [isLoading, setIsLoading] = useState(false)
const [isStreaming, setIsStreaming] = useState(false)
```

### 2. Server State (SWR)

**Current Chat**:
```typescript
const { data: currentChat } = useSWR<Chat>(
  chatId ? `/api/chats/${chatId}` : null
)
```

**Benefits**:
- Automatic caching
- Revalidation on focus
- Optimistic updates
- Error handling

### 3. Context (Streaming Handoff)

**StreamingContext** (`contexts/streaming-context.tsx`):
```typescript
interface StreamingHandoff {
  chatId: string | null
  stream: ReadableStream<Uint8Array> | null
  userMessage: string | null
}

const StreamingContext = createContext<StreamingContextType | null>(null)
```

**Purpose**: Handles streaming continuation when navigating from homepage to chat detail page.

**Usage**:
```typescript
// Home page: Start handoff
startHandoff(chatId, stream, userMessage)

// Chat detail page: Continue streaming
useEffect(() => {
  if (handoff.chatId === chatId && handoff.stream) {
    // Continue streaming...
    clearHandoff()
  }
}, [chatId, handoff])
```

---

## Complete Flow Diagrams

### Flow 1: Creating a New Chat (Homepage)

```
1. User types message → HomeClient
2. User submits → handleSendMessage()
3. POST /api/chat (no chatId)
   ├─ Rate limiting check
   ├─ v0.chats.create({ message, responseMode: 'experimental_stream' })
   └─ Return ReadableStream
4. Frontend receives stream
   ├─ Add user message to chatHistory
   ├─ Add streaming placeholder to chatHistory
   └─ Render StreamingMessage component
5. Stream processing
   ├─ StreamingMessage reads chunks
   ├─ Updates UI in real-time
   ├─ onChatData called → Extract chatId
   │  ├─ Update URL: /chats/{chatId}
   │  └─ POST /api/chat/ownership
   └─ onComplete called → Final content
      ├─ Update chatHistory with final content
      └─ Fetch /api/chats/{chatId} → Get demo URL
```

### Flow 2: Continuing Existing Chat

```
1. User types message → ChatDetailClient
2. User submits → handleSendMessage()
3. POST /api/chat (with chatId)
   ├─ Rate limiting check
   ├─ v0.chats.sendMessage({ chatId, message, responseMode: 'experimental_stream' })
   └─ Return ReadableStream
4. Frontend receives stream
   ├─ Add user message to chatHistory
   ├─ Add streaming placeholder to chatHistory
   └─ Render StreamingMessage component
5. Stream processing
   ├─ StreamingMessage reads chunks
   ├─ Updates UI in real-time
   └─ onComplete called → Final content
      ├─ Update chatHistory with final content
      └─ Fetch /api/chats/{chatId} → Refresh cache
```

### Flow 3: Loading Existing Chat

```
1. Navigate to /chats/{chatId}
2. ChatDetailClient mounts
3. useChat hook initializes
   ├─ SWR fetches /api/chats/{chatId}
   │  └─ GET /api/chats/{chatId}
   │     ├─ Check ownership (if authenticated)
   │     └─ v0.chats.getById({ chatId })
   └─ onSuccess: Update chatHistory with messages
4. Render ChatMessages with existing messages
```

### Flow 4: Streaming Handoff (Home → Chat Detail)

```
1. User creates chat on homepage
2. Stream starts → StreamingMessage renders
3. Chat ID extracted → onChatData called
4. URL updated → /chats/{chatId}
5. Navigation triggered (or user navigates manually)
6. ChatDetailClient mounts
7. useChat hook checks handoff context
   ├─ If handoff.chatId === chatId
   ├─ Add user message to chatHistory
   ├─ Continue streaming with handoff.stream
   └─ clearHandoff()
8. Stream continues seamlessly
```

---

## Step-by-Step Implementation

### Step 1: Database Setup

1. **Create migrations**:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

2. **Verify tables exist**:
   - `users`
   - `chat_ownerships`
   - `anonymous_chat_logs`

### Step 2: Install Dependencies

```bash
bun add v0-sdk @v0-sdk/react drizzle-orm postgres next-auth swr
bun add -d drizzle-kit @types/node
```

### Step 3: Configure v0 SDK Client

```typescript
// lib/v0-client.ts
import { createClient } from 'v0-sdk'

export const v0 = createClient(
  process.env.V0_API_URL ? { baseUrl: process.env.V0_API_URL } : {}
)
```

### Step 4: Create API Routes

1. **`app/api/chat/route.ts`**:
   - Implement POST handler
   - Add rate limiting
   - Handle streaming vs non-streaming
   - Create ownership/logging

2. **`app/api/chats/[chatId]/route.ts`**:
   - Implement GET handler
   - Check ownership
   - Fetch from v0 API

3. **`app/api/chat/ownership/route.ts`**:
   - Implement POST handler
   - Create ownership/logging

### Step 5: Create Frontend Components

1. **`hooks/use-chat.ts`**:
   - Implement chat state management
   - Handle message sending
   - Handle streaming
   - Handle streaming completion

2. **`components/chat/chat-messages.tsx`**:
   - Render message list
   - Handle streaming vs completed messages

3. **`components/chat/chat-input.tsx`**:
   - Input field
   - Attachment handling
   - Submit handling

4. **`components/message-renderer.tsx`**:
   - Render completed messages
   - Handle both string and MessageBinaryFormat

### Step 6: Create Pages

1. **`app/page.tsx`** (Home):
   - Initial chat creation
   - Handle first message
   - Navigate to chat detail

2. **`app/chats/[chatId]/page.tsx`**:
   - Display existing chat
   - Continue conversation

### Step 7: Add Streaming Context

1. **`contexts/streaming-context.tsx`**:
   - Create context
   - Implement handoff logic

2. **Wrap app with provider**:
   ```typescript
   <StreamingProvider>
     {children}
   </StreamingProvider>
   ```

### Step 8: Configure Rate Limiting

1. **`lib/entitlements.ts`**:
   - Define limits per user type

2. **Implement in API routes**:
   - Check limits before processing
   - Return 429 if exceeded

### Step 9: Add Error Handling

1. **`lib/errors.ts`**:
   - Create ChatSDKError class
   - Define error codes and messages

2. **Use in API routes**:
   ```typescript
   if (chatCount >= limit) {
     return new ChatSDKError('rate_limit:chat').toResponse()
   }
   ```

### Step 10: Test Complete Flow

1. **Create new chat**:
   - Submit message from homepage
   - Verify streaming works
   - Verify chat ID extraction
   - Verify ownership creation

2. **Continue chat**:
   - Navigate to chat detail
   - Send additional message
   - Verify streaming works
   - Verify history persists

3. **Load existing chat**:
   - Navigate to /chats/{chatId}
   - Verify messages load
   - Verify ownership check works

---

## Key Implementation Details

### Message Format

**User Messages**:
```typescript
{
  type: 'user',
  content: string  // Plain text
}
```

**Assistant Messages (Streaming)**:
```typescript
{
  type: 'assistant',
  content: [],  // Empty array initially
  isStreaming: true,
  stream: ReadableStream<Uint8Array>
}
```

**Assistant Messages (Completed)**:
```typescript
{
  type: 'assistant',
  content: MessageBinaryFormat | string  // From v0 API
}
```

### Rate Limiting Logic

```typescript
// Authenticated users
const chatCount = await getChatCountByUserId({
  userId: session.user.id,
  differenceInHours: 24,
})

if (chatCount >= entitlementsByUserType[userType].maxMessagesPerDay) {
  return new ChatSDKError('rate_limit:chat').toResponse()
}

// Anonymous users
const chatCount = await getChatCountByIP({
  ipAddress: clientIP,
  differenceInHours: 24,
})

if (chatCount >= anonymousEntitlements.maxMessagesPerDay) {
  return new ChatSDKError('rate_limit:chat').toResponse()
}
```

### Ownership Verification

```typescript
// In GET /api/chats/[chatId]
if (session?.user?.id) {
  const ownership = await getChatOwnership({ v0ChatId: chatId })
  
  if (!ownership) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }
  
  if (ownership.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

### Stream Processing

The `StreamingMessage` component from `@v0-sdk/react` handles:
- Reading SSE stream chunks
- Parsing message deltas
- Updating UI incrementally
- Extracting chat metadata
- Calling completion callbacks

**You don't need to manually parse the stream** - the component handles it automatically.

---

## Environment Variables

```bash
# Required
V0_API_KEY=your_api_key_here
POSTGRES_URL=postgresql://user:password@host:port/database

# Optional
V0_API_URL=https://api.v0.dev  # Custom API URL
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

---

## Common Patterns

### Pattern 1: Optimistic UI Updates

```typescript
// Add user message immediately
setChatHistory((prev) => [...prev, { type: 'user', content: userMessage }])

// Then fetch response
const response = await fetch('/api/chat', { ... })
```

### Pattern 2: Stream Attachment

```typescript
// Attach stream to message object
setChatHistory((prev) => [
  ...prev,
  {
    type: 'assistant',
    content: [],
    isStreaming: true,
    stream: response.body,  // Attach stream here
  },
])
```

### Pattern 3: Update on Completion

```typescript
// Update the last message in history
setChatHistory((prev) => {
  const updated = [...prev]
  const lastIndex = updated.length - 1
  if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
    updated[lastIndex] = {
      ...updated[lastIndex],
      content: finalContent,
      isStreaming: false,
      stream: undefined,
    }
  }
  return updated
})
```

### Pattern 4: SWR Cache Updates

```typescript
// Update cache optimistically
mutate(`/api/chats/${chatId}`, {
  ...chatDetails,
  demo: demoUrl,
}, false)  // false = don't revalidate immediately
```

---

## Troubleshooting

### Issue: Stream not working

**Check**:
1. Response headers include `Content-Type: text/event-stream`
2. `responseMode: 'experimental_stream'` is set
3. Stream is attached to message object correctly
4. `StreamingMessage` component is used for streaming messages

### Issue: Chat ID not extracted

**Check**:
1. `onChatData` callback is provided to `StreamingMessage`
2. Chat metadata is included in stream
3. `handleChatData` function extracts `chatData.id`

### Issue: Ownership check failing

**Check**:
1. Ownership record exists in database
2. User ID matches ownership record
3. Session is properly authenticated

### Issue: Rate limiting not working

**Check**:
1. Database queries are executing correctly
2. IP address extraction works
3. Entitlements are configured correctly
4. Time window calculation is correct

---

## Summary

This implementation provides:

✅ **Real-time streaming** chat responses  
✅ **Rate limiting** for authenticated and anonymous users  
✅ **Ownership tracking** for chat access control  
✅ **Seamless navigation** between homepage and chat detail  
✅ **Stream handoff** for uninterrupted streaming  
✅ **Message persistence** via SWR caching  
✅ **Error handling** with proper error codes  
✅ **Image attachments** support  
✅ **Voice input** support  
✅ **Session storage** for prompt persistence  

The architecture is **scalable**, **maintainable**, and follows **Next.js best practices**.

---

## Additional Resources

- [v0 SDK Documentation](https://v0.dev/docs/api)
- [@v0-sdk/react Components](https://github.com/vercel/v0-sdk/tree/main/packages/react)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [SWR Documentation](https://swr.vercel.app/)

