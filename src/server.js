import { WebSocketServer } from 'ws'
import { encode, decode } from 'messagepack'
import { nanoid } from 'nanoid'
import { heartbeat } from './utils.js'
import MessageLists, { createMessage } from './messages.js'

const SEND_RATE = 33.333

export class Server {
  messageLists = new MessageLists()
  running = false

  constructor(expressServer) {
    this.wss = new WebSocketServer({ server: expressServer })
    this.clients = new Map()

    this.wss.on('connection', (ws, req) => {
      const client = { ws, id: nanoid() }
      this.addClient(client)

      ws.on('message', (data) => {
        const messages = decode(data)

        for (const message of messages) {
          this.handleMessage(client, message)
        }
      })

      ws.on('close', () => {
        this.removeClient(client)
      })
    })
  }

  start() {
    if (this.running === false) {
      this.running = true
      heartbeat(() => {
        this.sendMessages()
        return this.running
      }, SEND_RATE)
    }
  }

  stop() {
    this.running = false
  }

  addClient(client) {
    if (this.clients.size === 0) {
      this.start()
    }
    this.clients.set(client.ws, client)
    this.messageLists.addMessageList(client.id)
  }

  removeClient(client) {
    this.messageLists.removeMessageList(client.id)
    this.clients.delete(client.ws)

    if (this.clients.size === 0) {
      this.stop()
    }
  }

  handleMessage(client, message) {
    const { type } = message

    switch (type) {
      case 'connect':
        // This should only happen if the agent isn't already connected.
        this.messageLists.addMessageToAllExcluding(
          client.id,
          createMessage.connected(client.id)
        )
        break
      case 'disconnect':
        // This should only happen if the agent isn't already connected.
        this.messageLists.addMessageToAllExcluding(
          client.id,
          createMessage.disconnected(client.id)
        )
        break
      case 'patch':
        // This is where it needs to talk to the kernal.
        break
    }
  }

  sendMessages() {
    for (const [ws, client] of this.clients) {
      const messages = this.messageLists.getMessages(client.id)
      try {
        ws.send(encode(messages))
        this.messageLists.clearMessages(client.id)
      } catch (err) {
        this.removeClient(session)
      }
    }
  }
}
