const { Client, GatewayIntentBits } = require('@jubbio/core');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@jubbio/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const BOT_TOKEN = process.env.BOT_TOKEN;
let player = createAudioPlayer();
let connection = null;
let queue = []; // Şarkı kuyruğu

client.on('ready', () => {
  console.log(`✅ ${client.user?.username} is online!`);
  console.log(`✅ Komutlar: !katil, !cal, !dur, !gec, !sira, !yardim`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(' ');
  const command = args[0].toLowerCase();

  // !katil - Ses kanalına katıl
  if (command === 'katil') {
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) return message.reply('❌ Ses kanalına girmelisin!');
    
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });
    await message.reply(`✅ **${voiceChannel.name}** kanalına katıldım!`);
  }

  // !cal - Müzik çal
  else if (command === 'cal') {
    if (!connection) return message.reply('❌ Önce !katil yaz!');
    const url = args[1];
    if (!url) return message.reply('❌ URL ver! Örnek: !cal https://youtu.be/...');
    
    queue.push(url); // Kuyruğa ekle
    
    if (queue.length === 1) { // Sadece bu şarkı varsa hemen çal
      await message.reply('🎵 Müzik yükleniyor...');
      try {
        const resource = createAudioResource(url);
        player.play(resource);
        connection.subscribe(player);
        await message.reply('🎵 Müzik çalıyor!');
      } catch (error) {
        await message.reply('❌ Müzik çalınamadı: ' + error.message);
        queue.shift(); // Hata olursa kuyruktan çıkar
      }
    } else {
      await message.reply(`🎵 Şarkı kuyruğa eklendi! Kuyrukta ${queue.length} şarkı var.`);
    }
  }

  // !dur - Müziği durdur
  else if (command === 'dur') {
    if (!connection) return message.reply('❌ Zaten kanalda değilim!');
    player.stop();
    queue = []; // Kuyruğu temizle
    await message.reply('⏹️ Müzik durduruldu ve kuyruk temizlendi!');
  }

  // !gec - Sonraki şarkıya geç
  else if (command === 'gec') {
    if (!connection) return message.reply('❌ Zaten kanalda değilim!');
    if (queue.length <= 1) {
      queue = [];
      player.stop();
      return message.reply('⏹️ Kuyrukta başka şarkı yok, müzik durduruldu.');
    }
    
    // İlk şarkıyı kuyruktan çıkar
    queue.shift();
    // Sıradaki şarkıyı çal
    const nextUrl = queue[0];
    try {
      const resource = createAudioResource(nextUrl);
      player.play(resource);
      await message.reply('⏭️ Sonraki şarkıya geçildi!');
    } catch (error) {
      await message.reply('❌ Sonraki şarkı çalınamadı: ' + error.message);
    }
  }

  // !sira - Kuyruktaki şarkıları göster
  else if (command === 'sira') {
    if (queue.length === 0) return message.reply('📭 Kuyruk boş!');
    
    let siraList = '';
    queue.forEach((url, index) => {
      siraList += `${index + 1}. ${url.substring(0, 30)}...\n`;
    });
    await message.reply(`📋 **Kuyruktaki şarkılar (${queue.length}):**\n${siraList}`);
  }

  // !yardim - Yardım menüsü
  else if (command === 'yardim') {
    await message.reply(`
📋 **MÜZİK BOTU KOMUTLARI:**
!katil - Ses kanalına katıl
!cal <url> - Müzik çal (YouTube URL'si)
!dur - Müziği durdur ve kuyruğu temizle
!gec - Sonraki şarkıya geç
!sira - Kuyruktaki şarkıları göster
!yardim - Bu menüyü göster
    `);
  }
});

client.login(BOT_TOKEN);
