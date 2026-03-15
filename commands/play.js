const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@jubbio/voice');

module.exports = {
  name: 'play',
  description: 'Müzik çalar',
  cooldown: 5,
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ Önce ses kanalına gir!');
    }

    const url = args[0];
    if (!url) {
      return message.reply('❌ Şu şekilde kullan: !play <youtube-url>');
    }

    // Botun kendisinin kanalda olma izni var mı?
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.reply('❌ Ses kanalında konuşma iznim yok!');
    }

    // Kuyruk oluştur
    const serverQueue = client.queue.get(message.guild.id);
    
    if (!serverQueue) {
      // Yeni kuyruk
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
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator
        });
        
        queueConstruct.connection = connection;
        connection.subscribe(queueConstruct.player);
        
        // Şarkıyı çal
        await playSong(message.guild.id, queueConstruct.songs[0], client);
        
        return message.reply(`🎵 **Müzik çalınıyor:** ${url}`);
      } catch (err) {
        console.error(err);
        client.queue.delete(message.guild.id);
        return message.reply('❌ Kanala bağlanamadım!');
      }
    } else {
      serverQueue.songs.push(url);
      return message.reply(`🎵 Şarkı kuyruğa eklendi! Sırada **${serverQueue.songs.length}** şarkı var.`);
    }
  }
};

async function playSong(guildId, song, client) {
  const serverQueue = client.queue.get(guildId);
  if (!song) {
    serverQueue.connection.destroy();
    client.queue.delete(guildId);
    return;
  }

  try {
    const resource = createAudioResource(song);
    serverQueue.player.play(resource);
    
    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift();
      playSong(guildId, serverQueue.songs[0], client);
    });

    serverQueue.player.on('error', error => {
      console.error(error);
      serverQueue.songs.shift();
      playSong(guildId, serverQueue.songs[0], client);
    });
  } catch (error) {
    console.error(error);
    serverQueue.songs.shift();
    playSong(guildId, serverQueue.songs[0], client);
  }
          }
