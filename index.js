const { Client, GatewayIntentBits, Collection } = require('@jubbio/core');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();
client.queue = new Map();

// Komutları yükle
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.name) {
    client.commands.set(command.name, command);
    console.log(`✅ Yüklendi: ${command.name}`);
  }
}

client.on('ready', () => {
  console.log(`✅ ${client.user?.username} çalışıyor!`);
  console.log(`📢 Komutlar: ${client.commands.map(c => c.name).join(', ')}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    message.reply('❌ **Hata oluştu!**');
  }
});

const BOT_TOKEN = '9ad08124af59f0853aeda02a62ac722c26c43d7578e0981d8927d3b9e26ad900';
client.login(BOT_TOKEN);
