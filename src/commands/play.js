const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@jubbio/voice');
const config = require('../../config');

module.exports = {
  name: 'play',
  description: 'Müzik çalar',
  aliases: ['p', 'cal', 'oynat'],
  cooldown: 3,
  
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
    if (!url.includes('youtu.be/') && !url.includes('youtube.com/')) {
      return message.reply(`${config.emojis?.error || '❌'} **Geçersiz YouTube URL'si!**`);
    }

    // Bot yetkileri kontrolü
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
      const serverQueue = client.queue.get(message.guild.id);

      // Yeni kuyruk oluştur
      if (!serverQueue) {
        const queueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: config.defaultVolume || 50,
          playing: true,
          player: createAudioPlayer()
        };

        client.queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(url);

        try {
          // Ses kanalına bağlan
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: config.voice?.selfDeaf || false,
            selfMute: config.voice?.selfMute || false
          });

          queueConstruct.connection = connection;
          connection.subscribe(queueConstruct.player);
          
          // İlk şarkıyı çal
          await playSong(message.guild.id, queueConstruct.songs[0], client);
          
          return message.reply(`${config.emojis?.play || '▶️'} **Müzik çalınıyor!**\n${url}`);
          
        } catch (err) {
          console.error('Bağlantı hatası:', err);
          client.queue.delete(message.guild.id);
          return message.reply(`${config.emojis?.error || '❌'} **Ses kanalına bağlanamadım!**`);
        }
      } 
      // Var olan kuyruğa ekle
      else {
        // Kuyruk limiti kontrolü
        if (serverQueue.songs.length >= (config.maxQueueSize || 100)) {
          return message.reply(`${config.emojis?.error || '❌'} **Kuyruk maksimum ${config.maxQueueSize || 100} şarkıya ulaştı!**`);
        }
        
        serverQueue.songs.push(url);
        return message.reply(`${config.emojis?.queue || '📋'} **Şarkı kuyruğa eklendi!**\n📊 **Sırada:** ${serverQueue.songs.length} şarkı`);
      }
      
    } catch (error) {
      console.error('Play komutu hatası:', error);
      return message.reply(config.messages?.commandError || '❌ **Bir hata oluştu!**');
    }
  }
};

// Şarkı çalma fonksiyonu
async function playSong(guildId, song, client) {
  const serverQueue = client.queue.get(guildId);
  
  // Kuyruk boşsa çık
  if (!song) {
    if (config.voice?.leaveOnFinish && serverQueue?.connection) {
      serverQueue.connection.destroy();
    }
    if (serverQueue?.textChannel) {
      serverQueue.textChannel.send(config.messages?.queueEmpty || '📭 **Kuyruk boş!**').catch(() => {});
    }
    client.queue.delete(guildId);
    return;
  }

  try {
    // Ses kaynağı oluştur
    const resource = createAudioResource(song);
    
    // Şarkıyı çal
    serverQueue.player.play(resource);

    // Şarkı bittiğinde
    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift(); // Çalan şarkıyı kuyruktan çıkar
      playSong(guildId, serverQueue.songs[0], client); // Sonraki şarkıyı çal
    });

    // Hata olursa
    serverQueue.player.once('error', (error) => {
      console.error('Player hatası:', error);
      serverQueue.songs.shift();
      playSong(guildId, serverQueue.songs[0], client);
    });

    // Şarkı başladığında kanala mesaj gönder
    if (serverQueue.textChannel) {
      serverQueue.textChannel.send(`${config.emojis?.play || '▶️'} **Şimdi çalıyor:** ${song.substring(0, 50)}...`).catch(() => {});
    }
    
  } catch (error) {
    console.error('Şarkı çalma hatası:', error);
    serverQueue.songs.shift();
    playSong(guildId, serverQueue.songs[0], client);
  }
      }
