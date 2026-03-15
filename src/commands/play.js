const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@jubbio/voice');
const config = require('../../config');

module.exports = {
  name: 'play',
  description: 'Müzik çalar',
  aliases: ['p', 'cal', 'oynat'],
  cooldown: 2,
  
  async execute(message, args, client) {
    // SES KANALI KONTROLÜ
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ **Önce bir ses kanalına girmelisin!**');
    }

    // URL KONTROLÜ
    const url = args[0];
    if (!url) {
      return message.reply('❌ **Lütfen bir YouTube URL\'si ver!**\nÖrnek: `!play https://youtu.be/...`');
    }

    // YETKİ KONTROLÜ
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      return message.reply('❌ **Ses kanalına bağlanma iznim yok!**');
    }
    if (!permissions.has('SPEAK')) {
      return message.reply('❌ **Ses kanalında konuşma iznim yok!**');
    }

    try {
      // KUYRUK SİSTEMİ
      if (!client.queue) client.queue = new Map();
      let serverQueue = client.queue.get(message.guild.id);

      // EĞER KUYRUK YOKSA YENİ OLUŞTUR
      if (!serverQueue) {
        // KANALA BAĞLAN
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });

        // KUYRUK YAPISI
        const queueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: connection,
          songs: [],
          volume: 50,
          playing: true,
          player: createAudioPlayer()
        };

        connection.subscribe(queueConstruct.player);
        client.queue.set(message.guild.id, queueConstruct);
        serverQueue = queueConstruct;
        
        await message.reply(`✅ **${voiceChannel.name}** kanalına katıldım!`);
      }

      // ŞARKIYI KUYRUĞA EKLE
      serverQueue.songs.push(url);
      
      // EĞER ÇALAN ŞARKI YOKSA BAŞLAT
      if (serverQueue.songs.length === 1) {
        await message.reply('⏳ **Müzik yükleniyor...**');
        await playSong(message.guild.id, serverQueue.songs[0], client);
        return message.reply(`▶️ **Müzik çalıyor!**\n${url}`);
      } else {
        return message.reply(`📋 **Şarkı kuyruğa eklendi!** (Sırada: ${serverQueue.songs.length} şarkı)`);
      }

    } catch (error) {
      console.error('Play hatası:', error);
      return message.reply(`❌ **Hata:** ${error.message}`);
    }
  }
};

// ŞARKI ÇALMA FONKSİYONU
async function playSong(guildId, song, client) {
  const serverQueue = client.queue.get(guildId);
  
  if (!serverQueue) return;
  if (!song) {
    if (serverQueue.connection) serverQueue.connection.destroy();
    client.queue.delete(guildId);
    return;
  }

  try {
    const resource = createAudioResource(song);
    serverQueue.player.play(resource);

    // ŞARKI BİTTİĞİNDE
    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift();
      playSong(guildId, serverQueue.songs[0], client);
    });

    // HATA OLURSA
    serverQueue.player.once('error', (error) => {
      console.error('Player hatası:', error);
      serverQueue.songs.shift();
      playSong(guildId, serverQueue.songs[0], client);
    });

  } catch (error) {
    console.error('Şarkı çalma hatası:', error);
    serverQueue.songs.shift();
    playSong(guildId, serverQueue.songs[0], client);
  }
  }
