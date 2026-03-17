const { Client, GatewayIntentBits } = require('@jubbio/core');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const BOT_TOKEN = '9ad08124af59f0853aeda02a62ac722c26c43d7578e0981d8927d3b9e26ad900';

client.on('ready', async () => {
  console.log(`✅ ${client.user?.username} çalışıyor!`);
  
  await client.application.commands.set([
    { name: 'ping', description: 'Bot test' },
    { name: 'join', description: 'Ses kanalına katıl' },
    { name: 'play', description: 'Müzik çalar', options: [{ name: 'url', description: 'YouTube URL', type: 3, required: true }] }
  ]);
  console.log('✅ Slash komutlar hazır!');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  
  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong!');
  }
  
  if (interaction.commandName === 'join') {
    await interaction.reply('✅ Bot ses kanalında (test)');
  }
  
  if (interaction.commandName === 'play') {
    const url = interaction.options.getString('url');
    await interaction.reply(`▶️ Müzik çalınıyor: ${url}`);
  }
});

client.login(BOT_TOKEN);
