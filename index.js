const { Client, GatewayIntentBits, Collection } = require('@jubbio/core');
const fs = require('fs');
const path = require('path');

// FETCH POLYFILL
try {
  if (!globalThis.fetch) {
    globalThis.fetch = require('node-fetch');
    console.log('✅ fetch polyfill yüklendi');
  }
} catch (e) {
  console.log('⚠️ node-fetch yüklü değil');
  globalThis.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
client.queue = new Map();
client.cooldowns = new Collection();

// Komutları yükle
const commandsPath = path.join(__dirname, 'src', 'commands');
console.log(`📁 Komutlar yükleniyor: ${commandsPath}`);

try {
  if (!fs.existsSync(commandsPath)) {
    console.error('❌ src/commands klasörü bulunamadı!');
    process.exit(1);
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if (command.name) {
      client.commands.set(command.name, command);
      console.log(`✅ Yüklendi: ${command.name}`);
    }
  }
  
  console.log(`📊 Toplam ${client.commands.size} komut yüklendi`);
} catch (error) {
  console.error('❌ Komutlar yüklenirken hata:', error.message);
  process.exit(1);
}

// Token
const BOT_TOKEN = '9ad08124af59f0853aeda02a62ac722c26c43d7578e0981d8927d3b9e26ad900';

// REST API ile slash komutlarını kaydet
async function registerSlashCommands() {
  try {
    console.log('📡 REST API ile slash komutlar kaydediliyor...');
    
    const commands = [];
    client.commands.forEach(cmd => {
      commands.push({
        name: cmd.name,
        description: cmd.description || `${cmd.name} komutu`,
        options: cmd.options || []
      });
    });

    // Jubbio API endpoint'i - BURAYI JUBBIO'YA GÖRE AYARLA
    const response = await fetch('https://gateway.jubbio.com/api/v1/applications/@me/commands', {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${data.length} slash komut REST API ile kaydedildi!`);
    } else {
      const text = await response.text();
      console.log(`❌ REST API hatası (${response.status}):`, text);
      
      // Alternatif endpoint dene
      console.log('🔄 Alternatif endpoint deneniyor...');
      const altResponse = await fetch(`https://gateway.jubbio.com/api/v1/applications/552486601809203200/commands`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands)
      });
      
      if (altResponse.ok) {
        console.log(`✅ ${commands.length} slash komut kaydedildi!`);
      } else {
        console.log('❌ Alternatif de çalışmadı');
      }
    }
  } catch (error) {
    console.error('❌ REST API bağlantı hatası:', error.message);
  }
}

// Bot hazır
client.once('ready', () => {
  console.log('=================================');
  console.log('✅ MÜZİK BOTU ÇALIŞIYOR!');
  console.log(`📢 Bot adı: ${client.user?.username}`);
  console.log(`📢 Bot ID: ${client.user?.id}`);
  console.log('=================================');
  
  // 3 saniye bekle, sonra REST API ile komutları kaydet
  setTimeout(registerSlashCommands, 3000);
});

// Slash komutlarını dinle
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  // Cooldown
  if (!client.cooldowns.has(command.name)) {
    client.cooldowns.set(command.name, new Collection());
  }

  const now = Date.now();
  const timestamps = client.cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 2) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply({ 
        content: `⏱️ **${timeLeft.toFixed(1)} saniye** beklemelisin!`, 
        ephemeral: true 
      });
    }
  }

  try {
    await command.execute(interaction, client);
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
  } catch (error) {
    console.error(`❌ /${command.name} hatası:`, error);
    const errorMsg = { content: '❌ **Hata oluştu!**', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
});

// Botu başlat
client.login(BOT_TOKEN).catch(err => {
  console.error('❌ Bot başlatılamadı:', err.message);
  process.exit(1);
});
