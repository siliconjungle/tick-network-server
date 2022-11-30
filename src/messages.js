export const createMessage = {
  connected: (agentId) => ({
    type: 'connect',
    agentId,
  }),
  disconnected: (agentId) => ({
    type: 'disconnect',
    agentId,
  }),
  patch: (ops) => ({
    type: 'patch',
    ops,
  }),
}

class MessageLists {
  messageLists = {}

  addMessageList (listId) {
    this.messageLists[listId] = []
  }

  addMessage (listId, message) {
    this.messageLists[listId].push(message)
  }

  addMessageToAll (message) {
    for (const listId in this.messageLists) {
      this.addMessage(listId, message)
    }
  }

  addMessageToAllExcluding (listId, message) {
    for (const id in this.messageLists) {
      if (id !== listId) {
        this.addMessage(id, message)
      }
    }
  }

  getMessages (listId) {
    return this.messageLists[listId] ?? []
  }

  clearMessages (listId) {
    this.messageLists[listId] = []
  }

  removeAllMessageLists () {
    this.messageLists = {}
  }

  removeMessageList (listId) {
    delete this.messageLists[listId]
  }
}

export default MessageLists
