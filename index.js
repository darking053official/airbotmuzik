const { Client, GatewayIntentBits } = require('@jubbio/core');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const BOT_TOKEN = process.env.BOT_TOKEN || 'c8cdb437d9bff10e41c5cebd4600473ced13285936de75ec6ab4397c50613cc0';

client.on('ready', () => {
  console.log('✅ BOT ÇALIŞIYOR!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.content === '!ping') {
    await message.reply('🏓 PONG!');
  }
});

client.login(BOT_TOKEN);
