const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@jubbio/voice');

module.exports = {
  name: 'play',
  description: 'Müzik çalar',
  aliases: ['p', 'cal', 'oynat'],
  cooldown: 3,
  
  async execute(message, args, client) {
    // Ses kanalı kontrolü
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ **Önce bir ses kanalına girmelisin!**');
    }

    // URL kontrolü
    const url = args[0];
    if (!url) {
      return message.reply('❌ **Lütfen bir YouTube URL\'si ver!**\nÖrnek: `!play https://youtu.be/...`');
    }

    // Botun yetkilerini kontrol et
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      return message.reply('❌ **Ses kanalına bağlanma iznim yok!**');
    }
    if (!permissions.has('SPEAK')) {
      return message.reply('❌ **Ses kanalında konuşma iznim yok!**');
    }

    try {
      // Kuyruk sistemini kontrol et
      if (!client.queue) client.queue = new Map();
      const serverQueue = client.queue.get(message.guild.id);

      // Yeni kuyruk oluştur
      if (!serverQueue) {
        const queueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
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
            selfDeaf: false,
            selfMute: false
          });

          queueConstruct.connection = connection;
          connection.subscribe(queueConstruct.player);

          // İlk şarkıyı çal
          await playSong(message.guild.id, queueConstruct.songs[0], client);

          return message.reply(`🎵 **Müzik çalınıyor!**\n🔗 ${url}`);
          
        } catch (err) {
          console.error('Bağlantı hatası:', err);
          client.queue.delete(message.guild.id);
          return message.reply('❌ **Ses kanalına bağlanamadım!**');
        }
      } 
      // Var olan kuyruğa ekle
      else {
        serverQueue.songs.push(url);
        return message.reply(`🎵 **Şarkı kuyruğa eklendi!**\n📋 **Sırada:** ${serverQueue.songs.length} şarkı`);
      }
      
    } catch (error) {
      console.error('Play komutu hatası:', error);
      return message.reply('❌ **Bir hata oluştu!**');
    }
  }
};

// Şarkı çalma fonksiyonu
async function playSong(guildId, song, client) {
  const serverQueue = client.queue.get(guildId);
  
  // Kuyruk boşsa çık
  if (!song) {
    if (serverQueue) {
      serverQueue.connection?.destroy();
      client.queue.delete(guildId);
    }
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
    serverQueue.textChannel.send(`▶️ **Şimdi çalıyor:** ${song.substring(0, 50)}...`);
    
  } catch (error) {
    console.error('Şarkı çalma hatası:', error);
    serverQueue.songs.shift();
    playSong(guildId, serverQueue.songs[0], client);
  }
        }
