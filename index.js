const { Client, GatewayIntentBits, Collection } = require('@jubbio/core');
const fs = require('fs');
const path = require('path');

// FETCH POLYFILL - Node.js eski versiyonları için
try {
  if (!globalThis.fetch) {
    globalThis.fetch = require('node-fetch');
    console.log('✅ fetch polyfill yüklendi');
  }
} catch (e) {
  console.log('⚠️ node-fetch yüklü değil, fetch kullanılamayacak');
  // Alternatif fetch tanımı
  globalThis.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

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

// Komutları src/commands klasöründen yükle
const commandsPath = path.join(__dirname, 'src', 'commands');
console.log(`📁 Komutlar yükleniyor: ${commandsPath}`);

try {
  if (!fs.existsSync(commandsPath)) {
    console.error('❌ src/commands klasörü bulunamadı!');
    process.exit(1);
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  if (commandFiles.length === 0) {
    console.error('❌ src/commands klasöründe .js dosyası bulunamadı!');
    process.exit(1);
  }

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      
      if (command.name) {
        client.commands.set(command.name, command);
        console.log(`✅ Yüklendi: ${command.name}`);
      } else {
        console.log(`⚠️ ${file} geçersiz komut formatı`);
      }
    } catch (err) {
      console.error(`❌ ${file} yüklenirken hata:`, err.message);
    }
  }
  
  console.log(`📊 Toplam ${client.commands.size} komut yüklendi`);
  
} catch (error) {
  console.error('❌ Komutlar yüklenirken hata:', error.message);
  process.exit(1);
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
    console.error(`❌ ${commandName} hatası:`, error);
    message.reply('❌ **Hata oluştu!**');
  }
});

// YENİ TOKEN BURADA
const BOT_TOKEN = '9ad08124af59f0853aeda02a62ac722c26c43d7578e0981d8927d3b9e26ad900';

if (!BOT_TOKEN) {
  console.error('❌ Token bulunamadı!');
  process.exit(1);
}

client.login(BOT_TOKEN).catch(err => {
  console.error('❌ Bot başlatılamadı:', err.message);
  process.exit(1);
});
