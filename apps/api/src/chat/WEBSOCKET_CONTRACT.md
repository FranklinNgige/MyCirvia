# Realtime Chat WebSocket Contract

## Connection
Use Socket.IO and provide JWT access token in one of:
- `handshake.query.token`
- `handshake.auth.token`
- `Authorization: Bearer <token>` header

## Events

### Client -> Server
- `join-chat` `{ chatId }`
- `leave-chat` `{ chatId }`
- `send-message` `{ chatId, contentText, mediaKeys? }`
- `typing-indicator` `{ chatId, isTyping }`
- `message-read` `{ messageId }`

### Server -> Client
- `joined-chat` `{ chatId }`
- `new-message` `{ message, sender }`
- `user-typing` `{ userId, isTyping }`
- `message-read` `{ messageId, readBy }`
- `message-deleted` `{ messageId }`

## REST Endpoints
- `GET /chats/my`
- `GET /chats/:chatId/messages?limit=&cursor=&before=`
- `POST /chats` `{ otherUserId }`
- `DELETE /messages/:messageId`

## Notes
- Socket auth and every event are authorized server-side.
- Message send is rate limited (10/min/user) using Redis-backed counter.
- Identity payloads are resolved through `IdentityResolverService` scoped by chat type.
