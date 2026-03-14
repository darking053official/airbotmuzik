const { Client, GatewayIntentBits } = require('@jubbio/core');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@jubbio/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

// TOKEN BURADA - DIREKT GÖMÜLÜ
const BOT_TOKEN = 'c8cdb437d9bff10e41c5cebd4600473ced13285936de75ec6ab4397c50613cc0';

let player = createAudioPlayer();
let connection = null;
let queue = [];

client.on('ready', () => {
  console.log(`✅ ${client.user?.username} is online!`);
  console.log(`✅ Bot ID: ${client.user?.id}`);
  console.log(`✅ Komutlar: !katil, !cal, !dur, !gec, !sira, !yardim`);
});

// MESAJ KOMUTLARI
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(' ');
  const command = args[0].toLowerCase();

  // !katil - Ses kanalına katıl
  if (command === 'katil') {
    try {
      if (!message.guild) {
        return message.reply('❌ Bu komut sadece sunucularda kullanılabilir!');
      }

      const member = await message.guild.members.fetch(message.author.id);
      
      if (!member) {
        return message.reply('❌ Üye bilgisi alınamadı!');
      }

      const voiceChannel = member.voice.channel;
      
      if (!voiceChannel) {
        return message.reply('❌ Önce bir ses kanalına girmelisin!');
      }

      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      await message.reply(`✅ **${voiceChannel.name}** kanalına katıldım!`);
      
    } catch (error) {
      console.error('❌ Katılma hatası:', error);
      await message.reply(`❌ Kanala katılamadım: ${error.message}`);
    }
  }

  // !cal - Müzik çal
  else if (command === 'cal') {
    if (!connection) {
      return message.reply('❌ Önce !katil yazıp beni kanala çağır!');
    }

    const url = args[1];
    if (!url) {
      return message.reply('❌ Lütfen bir YouTube URL\'si ver! Örnek: !cal https://youtu.be/...');
    }

    queue.push(url);
    
    if (queue.length === 1) {
      await message.reply('🎵 Müzik yükleniyor...');
      try {
        const resource = createAudioResource(url);
        player.play(resource);
        connection.subscribe(player);
        await message.reply('🎵 Müzik çalıyor!');
      } catch (error) {
        await message.reply('❌ Müzik çalınamadı: ' + error.message);
        queue.shift();
      }
    } else {
      await message.reply(`🎵 Şarkı kuyruğa eklendi! Kuyrukta ${queue.length} şarkı var.`);
    }
  }

  // !dur - Müziği durdur
  else if (command === 'dur') {
    player.stop();
    queue = [];
    await message.reply('⏹️ Müzik durduruldu ve kuyruk temizlendi!');
  }

  // !gec - Sonraki şarkıya geç
  else if (command === 'gec') {
    if (queue.length <= 1) {
      queue = [];
      player.stop();
      return message.reply('⏹️ Kuyrukta başka şarkı yok, müzik durduruldu.');
    }
    
    queue.shift();
    const nextUrl = queue[0];
    try {
      const resource = createAudioResource(nextUrl);
      player.play(resource);
      await message.reply('⏭️ Sonraki şarkıya geçildi!');
    } catch (error) {
      await message.reply('❌ Sonraki şarkı çalınamadı: ' + error.message);
    }
  }

  // !sira - Kuyruğu göster
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
!cal <url> - Müzik çal (YouTube)
!dur - Müziği durdur
!gec - Sonraki şarkıya geç
!sira - Kuyruğu göster
!yardim - Bu menü
    `);
  }
});

client.login(BOT_TOKEN);
