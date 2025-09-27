const mineflayer = require('mineflayer')

const SERVER = process.env.MC_SERVERS?.split(',')[0] || 'play.phoenixsmp.qzz.io:20722'
const [host, port] = SERVER.split(':')
const USERNAME = process.env.MC_USERNAME || 'PhoenixSMPBot'
const AUTH = process.env.MC_AUTH || 'offline'

let bot
let afkInterval
let chatInterval
let retryCount = 0

function timestamp() {
  return new Date().toISOString().split('T')[1].split('.')[0]
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
    if (/hi bot/i.test(message)) bot.chat(`Hello ${username}! 👋`)
    if (/afk\??/i.test(message)) bot.chat(`Yes, I'm keeping the server alive ⛏️`)
    if (message === '!vanish on') bot.chat('/vanish on')
    if (message === '!vanish off') bot.chat('/vanish off')
    if (message === '!state') bot.chat('✅ I am online and AFK.')
  })

  bot.on('playerJoined', player => {
    if (player.username !== USERNAME) {
      console.log(`[${timestamp()}] 👀 Real player joined: ${player.username}, enabling vanish`)
      bot.chat('/vanish on')
    }
  })

  bot.on('playerLeft', player => {
    console.log(`[${timestamp()}] 👋 Player left: ${player.username}`)
  })

  bot.on('end', () => {
    console.log(`[${timestamp()}] ❌ Bot disconnected from ${host}:${port || 25565}`)
    stopAFK()
    stopAFKChat()
    retryCount++
    const delay = Math.min(60000, retryCount * 20000)
    console.log(`[${timestamp()}] 🔄 Reconnecting in ${delay/1000}s...`)
    setTimeout(createBot, delay)
  })

  bot.on('error', err => {
    console.log(`[${timestamp()}] ⚠️ Error: ${err.message}`)
  })

  bot.on('kicked', reason => {
    console.log(`[${timestamp()}] ⚠️ Kicked: ${reason}`)
  })
}

// Randomized AFK movement
function startAFK() {
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return
    bot.setControlState('forward', Math.random() < 0.7)
    bot.setControlState('left', Math.random() < 0.5)
    bot.setControlState('right', Math.random() < 0.5)
    bot.setControlState('jump', Math.random() < 0.3)
    bot.setControlState('sneak', Math.random() < 0.2)
    bot.look(Math.random() * 360, Math.random() * 180 - 90)
  }, 5000)
}

function stopAFK() {
  clearInterval(afkInterval)
  if (bot) bot.clearControlStates()
}

// Random chat while AFK
function startAFKChat() {
  const messages = [
    "Keeping the server alive!",
    "AFK but online 😎",
    "Hello everyone!",
    "I'm a bot 🤖",
    "Ping me if you need me!"
  ]
  chatInterval = setInterval(() => {
    if (!bot || !bot.entity) return
    const msg = messages[Math.floor(Math.random() * messages.length)]
    bot.chat(msg)
  }, 10 * 60 * 1000)
}

function stopAFKChat() {
  clearInterval(chatInterval)
}

// Start the bot
createBot()
