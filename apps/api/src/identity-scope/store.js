function createStore() {
  return {
    users: new Map(),
    cirvias: new Map(),
    chats: new Map(),
    scopes: new Map(),
    auditLogs: [],
  };
}

module.exports = { createStore };
