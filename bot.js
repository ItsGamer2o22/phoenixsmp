const mineflayer = require('mineflayer')

const SERVER = process.env.MC_SERVERS?.split(',')[0] || 'play.phoenixsmp.qzz.io:20722'
const [host, port] = SERVER.split(':')
const USERNAME = process.env.MC_USERNAME || 'PhoenixSMPBot'
const AUTH = process.env.MC_AUTH || 'offline'

let bot
let afkInterval
let chatInterval
let retryCount = 0
let realPlayersOnline = 0

function timestamp() {
  return new Date().toISOString().split('T')[1].split('.')[0]
}

// Safe wrapper for setControlState
function safeSetControl(state, value) {
  if (bot && bot.entity && bot._client && !bot._client.destroyed) {
    try {
      bot.setControlState(state, value)
    } catch (err) {
      console.log(`[${timestamp()}] ⚠️ safeSetControl error: ${err.message}`)
    }
  }
}

// Safe wrapper for chat
function safeChat(msg) {
  if (bot && bot._client && !bot._client.destroyed) {
    try {
      bot.chat(msg)
    } catch(err) {
      console.log(`[${timestamp()}] ⚠️ chat error: ${err.message}`)
    }
  }
}

function stopAFK() {
  clearInterval(afkInterval)
  ['forward','back','left','right','jump','sneak'].forEach(dir => safeSetControl(dir,false))
}

function startAFK() {
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return
    safeSetControl('forward', Math.random() < 0.7)
    safeSetControl('left', Math.random() < 0.5)
    safeSetControl('right', Math.random() < 0.5)
    safeSetControl('jump', Math.random() < 0.3)
    safeSetControl('sneak', Math.random() < 0.2)
    try {
      bot.look(Math.random() * 360, Math.random() * 180 - 90)
    } catch {}
  }, 5000)
}

function stopAFKChat() { clearInterval(chatInterval) }

function startAFKChat() {
  const messages = [
    "Keeping the server alive!",
    "AFK but online 😎",
    "Hello everyone!",
    "I'm a bot 🤖",
    "Ping me if you need me!"
  ]
  chatInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return
    safeChat(messages[Math.floor(Math.random() * messages.length)])
  }, 10 * 60 * 1000)
}

function createBot() {
  console.log(`[${timestamp()}] 🤖 Connecting to ${host}:${port || 25565} as ${USERNAME} (${AUTH})...`)

  bot = mineflayer.createBot({
    host,
    port: port ? parseInt(port) : 25565,
    username: USERNAME,
    auth: AUTH,
    version: false
  })

  bot.once('spawn', () => {
    console.log(`[${timestamp()}] ✅ Bot joined ${host}:${port || 25565}`)
    retryCount = 0
    startAFK()
    startAFKChat()
  })

  bot.on('chat', (username, message) => {
    if (username === USERNAME) return
    if (/hi bot/i.test(message)) safeChat(`Hello ${username}! 👋`)
    if (/afk\??/i.test(message)) safeChat("Yes, I'm keeping the server alive ⛏️")
    if (message === '!vanish on') safeChat('/vanish on')
    if (message === '!vanish off') safeChat('/vanish off')
    if (message === '!state') safeChat('✅ I am online and AFK.')
  })

  bot.on('playerJoined', player => {
    if (player.username !== USERNAME) {
      realPlayersOnline++
      console.log(`[${timestamp()}] 👀 Real player joined: ${player.username}, enabling vanish`)
      safeChat('/vanish on')
    }
  })

  bot.on('playerLeft', player => {
    if (player.username !== USERNAME) {
      realPlayersOnline = Math.max(0, realPlayersOnline - 1)
      console.log(`[${timestamp()}] 👋 Player left: ${player.username}`)
      if (realPlayersOnline === 0) safeChat('/vanish off')
    }
  })

  bot.on('end', () => {
    console.log(`[${timestamp()}] ❌ Bot disconnected`)
    stopAFK()
    stopAFKChat()
    retryCount++
    const delay = Math.min(120000, retryCount * 20000)
    console.log(`[${timestamp()}] 🔄 Reconnecting in ${delay/1000}s...`)
    setTimeout(createBot, delay)
  })

  bot.on('error', err => {
    console.log(`[${timestamp()}] ⚠️ Error: ${err.message}`)
    if (['ECONNRESET','ETIMEDOUT'].includes(err.code)) {
      console.log(`[${timestamp()}] 🔄 Network error, reconnecting...`)
      stopAFK()
      stopAFKChat()
      if (bot && bot._client && !bot._client.destroyed) bot.end()
      const delay = Math.min(120000, retryCount * 20000)
      setTimeout(createBot, delay)
    }
  })

  bot.on('kicked', reason => {
    let msg = reason?.toString ? reason.toString() : JSON.stringify(reason)
    console.log(`[${timestamp()}] ⚠️ Kicked: ${msg}`)
  })
}

createBot()
