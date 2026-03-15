const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@jubbio/voice');
const config = require('../../config');

module.exports = {
  name: 'play',
  description: 'Müzik çalar veya kuyruğa ekler',
  aliases: ['p', 'cal', 'oynat'],
  cooldown: 2,
  
  async execute(message, args, client) {
    // Ses kanalı kontrolü
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply(config.messages.notInVoiceChannel);
    }

    // URL kontrolü
    const url = args[0];
    if (!url) {
      return message.reply(`${config.emojis?.error || '❌'} **Lütfen bir YouTube URL'si ver!**\nÖrnek: \`${config.prefix}play https://youtu.be/...\``);
    }

    // URL formatı kontrolü
    if (!url.includes('youtu.be/') && !url.includes('youtube.com/') && !url.includes('youtube.com/shorts/')) {
      return message.reply(`${config.emojis?.error || '❌'} **Geçersiz YouTube URL'si!**\nSadece YouTube linkleri destekleniyor.`);
    }

    // Bot yetkilerini kontrol et
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      return message.reply(`${config.emojis?.error || '❌'} **Ses kanalına bağlanma iznim yok!**`);
    }
    if (!permissions.has('SPEAK')) {
      return message.reply(`${config.emojis?.error || '❌'} **Ses kanalında konuşma iznim yok!**`);
    }

    try {
      // Kuyruk sistemini başlat
      if (!client.queue) client.queue = new Map();
      let serverQueue = client.queue.get(message.guild.id);

      // Eğer kuyruk yoksa veya bağlantı yoksa yeni oluştur
      if (!serverQueue || !serverQueue.connection) {
        // Varsa eski bağlantıyı temizle
        const oldConnection = getVoiceConnection(message.guild.id);
        if (oldConnection) {
          oldConnection.destroy();
        }

        // Yeni bağlantı oluştur
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: config.voice?.selfDeaf || false,
          selfMute: config.voice?.selfMute || false
        });

        // Yeni kuyruk oluştur
        const queueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: connection,
          songs: [],
          volume: config.defaultVolume || 50,
          playing: true,
          player: createAudioPlayer(),
          loop: false,
          loopQueue: false
        };

        connection.subscribe(queueConstruct.player);
        client.queue.set(message.guild.id, queueConstruct);
        serverQueue = queueConstruct;
        
        // Katılma mesajı
        await message.reply(`${config.emojis?.success || '✅'} **${voiceChannel.name}** kanalına katıldım!`);
      }

      // Kuyruk limiti kontrolü
      if (serverQueue.songs.length >= (config.maxQueueSize || 100)) {
        return message.reply(`${config.emojis?.error || '❌'} **Kuyruk maksimum ${config.maxQueueSize || 100} şarkıya ulaştı!**`);
      }

      // Şarkıyı kuyruğa ekle
      serverQueue.songs.push(url);
      
      // Eğer çalan şarkı yoksa hemen başlat
      if (serverQueue.songs.length === 1) {
        await message.reply(`${config.emojis?.loading || '⏳'} **Müzik yükleniyor...**`);
        playSong(message.guild.id, serverQueue.songs[0], client);
        return message.reply(`${config.emojis?.play || '▶️'} **Müzik çalıyor!**\n${url}`);
      } else {
        return message.reply(`${config.emojis?.queue || '📋'} **Şarkı kuyruğa eklendi!**\n📊 **Sıradaki şarkı sayısı:** ${serverQueue.songs.length}`);
      }

    } catch (error) {
      console.error('❌ Play komutu hatası:', error);
      return message.reply(`${config.emojis?.error || '❌'} **Bir hata oluştu:** ${error.message}`);
    }
  }
};

// Şarkı çalma fonksiyonu
async function playSong(guildId, song, client) {
  const serverQueue = client.queue.get(guildId);
  
  // Kuyruk veya şarkı yoksa çık
  if (!serverQueue) return;
  if (!song) {
    if (config.voice?.leaveOnFinish && serverQueue.connection) {
      serverQueue.connection.destroy();
    }
    client.queue.delete(guildId);
    if (serverQueue.textChannel) {
      serverQueue.textChannel.send(config.messages?.queueEmpty || '📭 **Kuyruk boş!**').catch(() => {});
    }
    return;
  }

  try {
    // Ses kaynağı oluştur
    const resource = createAudioResource(song);
    
    // Şarkıyı çal
    serverQueue.player.play(resource);

    // Şarkı başladığında
    serverQueue.player.removeAllListeners(AudioPlayerStatus.Playing);
    serverQueue.player.once(AudioPlayerStatus.Playing, () => {
      if (serverQueue.textChannel) {
        const nowPlayingMsg = config.messages?.nowPlaying || '▶️ **Şimdi çalıyor:**';
        serverQueue.textChannel.send(`${nowPlayingMsg} ${song.substring(0, 50)}...`).catch(() => {});
      }
    });

    // Şarkı bittiğinde
    serverQueue.player.removeAllListeners(AudioPlayerStatus.Idle);
    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
      // Loop kontrolü
      if (serverQueue.loop) {
        // Tek şarkıyı tekrar oynat
        playSong(guildId, serverQueue.songs[0], client);
      } else if (serverQueue.loopQueue) {
        // Kuyruğu döngüye al
        const firstSong = serverQueue.songs.shift();
        serverQueue.songs.push(firstSong);
        playSong(guildId, serverQueue.songs[0], client);
      } else {
        // Normal sıradaki şarkıya geç
        serverQueue.songs.shift();
        playSong(guildId, serverQueue.songs[0], client);
      }
    });

    // Hata olursa
    serverQueue.player.removeAllListeners('error');
    serverQueue.player.once('error', (error) => {
      console.error('❌ Player hatası:', error);
      serverQueue.songs.shift();
      playSong(guildId, serverQueue.songs[0], client);
    });

  } catch (error) {
    console.error('❌ Şarkı çalma hatası:', error);
    serverQueue.songs.shift();
    playSong(guildId, serverQueue.songs[0], client);
  }
        }
