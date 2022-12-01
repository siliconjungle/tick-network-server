import { WebSocketServer } from 'ws'
import { encode, decode } from 'messagepack'
import { nanoid } from 'nanoid'
import { performance } from 'perf_hooks'
import { heartbeat } from './utils.js'
import MessageLists, { createMessage } from './messages.js'
import Kernal from './kernal.js'

const SEND_RATE = 33.333

export class Server {
  messageLists = new MessageLists()
  running = false
  kernal = new Kernal()

  constructor(expressServer) {
    this.wss = new WebSocketServer({ server: expressServer })
    this.clients = new Map()

    this.wss.on('connection', (ws, req) => {
      const client = { ws, id: nanoid(), latestSeq: -1, latestServerSeq: -1, latestAck: -1, lastReceived: null }
      this.addClient(client)

      ws.on('message', (data) => {
        const messageList = decode(data)

		    client.latestSeq = messageList.seq
        client.latestAck = messageList.serverSeq
        // messageList.delay
        // client.lastReceived = Date.now()
        client.lastReceived = performance.now()

		    const messages = messageList.messages

        // const messages = decode(data)

        for (const message of messages) {
          this.handleMessage(client, message)
        }
      })

      ws.on('close', () => {
        console.log('_CLOSE_')
        this.removeClient(client)
      })
    })
  }

  start() {
    console.log('_START_')
    if (this.running === false) {
      this.running = true
      heartbeat(() => {
        this.sendMessages()
        return this.running
      }, SEND_RATE)
    }
  }

  stop() {
    console.log('_STOP_')
    this.running = false
  }

  addClient(client) {
    console.log('_ADD_CLIENT_')
    console.log(this.clients.size)
    if (this.clients.size === 0) {
      this.start()
    }
    this.clients.set(client.ws, client)
    this.messageLists.addMessageList(client.id)
    this.handleConnect(client)
  }

  removeClient(client) {
    console.log('_REMOVE_CLIENT_')
    this.messageLists.removeMessageList(client.id)
    this.handleDisconnect(client)
    this.clients.delete(client.ws)

    if (this.clients.size === 0) {
      this.stop()
    }
  }

  handleConnect(client) {
    console.log('_HANDLE_CONNECT_')
    this.messageLists.addMessageToAllExcluding(
      client.id,
      createMessage.connected(client.id)
    )
    const snapshotOps = this.kernal.getSnapshotOps()
    console.log('_SNAPSHOT_OPS_', JSON.stringify(snapshotOps, null, 2))
    if (snapshotOps.length > 0) {
      this.messageLists.addMessage(client.id, createMessage.patch(snapshotOps))
    }
  }

  handleDisconnect(client) {
    console.log('_HANDLE_DISCONNECT_')
    this.messageLists.addMessageToAllExcluding(
      client.id,
      createMessage.disconnected(client.id)
    )
  }

  // The client doesn't really need to send a *connect* or *disconnect* message.
  // They should happen automatically.
  handleMessage(client, message) {
    const { type } = message

    switch (type) {
      // case 'connect':
      //   // This should only happen if the agent isn't already connected.
      //   this.messageLists.addMessageToAllExcluding(
      //     client.id,
      //     createMessage.connected(client.id)
      //   )
      //   const snapshotOps = this.kernal.getSnapshotOps()
      //   if (snapshotOps.length > 0) {
      //     this.messageLists.addMessage(client.id, createMessage.patch(snapshotOps))
      //   }
      //   break
      // case 'disconnect':
      //   // This should only happen if the agent isn't already connected.
      //   this.messageLists.addMessageToAllExcluding(
      //     client.id,
      //     createMessage.disconnected(client.id)
      //   )
      //   break
      case 'patch':
        // Validation should be done to the ops first.
        const appliedOps = this.kernal.applyOps(message.ops)
        if (appliedOps.length > 0) {
          this.messageLists.addMessageToAllExcluding(
            client.id,
            createMessage.patch(appliedOps)
          )
        }
        break
    }
  }

  sendMessages() {
    for (const [ws, client] of this.clients) {
      const messages = this.messageLists.getMessages(client.id)
      try {
        // this.latestSeq++
        // const delay = client.lastReceived ? Date.now() - client.lastReceived : 0
        const delay = client.lastReceived ? performance.now() - client.lastReceived : 0

        client.latestServerSeq++
			  const messageList = {
				  seq: client.latestSeq,
				  serverSeq: client.latestServerSeq,
				  messages: messages,
          delay,
			  }
			  ws.send(encode(messageList))

        // ws.send(encode(messages))
        this.messageLists.clearMessages(client.id)
      } catch (err) {
        this.removeClient(session)
      }
    }
  }
}
