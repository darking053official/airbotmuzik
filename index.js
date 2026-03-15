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

// Koleksiyonlar
client.commands = new Collection();
client.queue = new Map();        // Müzik kuyruğu
client.djRoles = new Map();      // DJ rolleri (geçici)
client.cooldowns = new Collection();

// Komutları yükle
const commandsPath = path.join(__dirname, 'commands');
try {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if (command.name) {
      client.commands.set(command.name, command);
      console.log(`✅ Komut yüklendi: ${command.name}`);
    } else {
      console.log(`⚠️ ${file} geçersiz komut formatı`);
    }
  }
  
  console.log(`📊 Toplam ${client.commands.size} komut yüklendi`);
} catch (error) {
  console.error('❌ Komutlar yüklenirken hata:', error.message);
}

// Bot hazır
client.on('ready', () => {
  console.log('=================================');
  console.log('✅ MÜZİK BOTU ÇALIŞIYOR!');
  console.log(`📢 Bot adı: ${client.user?.username}`);
  console.log(`📢 Bot ID: ${client.user?.id}`);
  console.log(`📢 Komut sayısı: ${client.commands.size}`);
  console.log('=================================');
});

// Mesajları dinle
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || 
                  client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  // Cooldown kontrolü
  if (!client.cooldowns.has(command.name)) {
    client.cooldowns.set(command.name, new Collection());
  }

  const now = Date.now();
  const timestamps = client.cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(`⏱️ **${timeLeft.toFixed(1)} saniye** beklemen gerekiyor!`);
    }
  }

  // Komutu çalıştır
  try {
    await command.execute(message, args, client);
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  } catch (error) {
    console.error(`❌ ${command.name} hatası:`, error);
    message.reply('❌ Komut çalıştırılırken bir hata oluştu!').catch(() => {});
  }
});

// Token
const BOT_TOKEN = process.env.BOT_TOKEN || 'c8cdb437d9bff10e41c5cebd4600473ced13285936de75ec6ab4397c50613cc0';
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN bulunamadı!');
  process.exit(1);
}

// Botu başlat
client.login(BOT_TOKEN).then(() => {
  console.log('🔌 Bot başlatılıyor...');
}).catch(err => {
  console.error('❌ Bot başlatılamadı:', err.message);
});

// Hata yakalama
process.on('uncaughtException', (error) => {
  console.error('❌ Beklenmeyen hata:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promise hatası:', error);
});
