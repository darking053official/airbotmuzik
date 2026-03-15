const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@jubbio/voice');
const config = require('../config');

module.exports = {
  name: 'play',
  description: 'Müzik çalar',
  aliases: ['p', 'cal', 'oynat'],
  cooldown: 3,
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply(config.messages.notInVoiceChannel);
    }

    const url = args[0];
    if (!url) {
      return message.reply('❌ **Lütfen bir YouTube URL\'si ver!**\nÖrnek: `!play https://youtu.be/...`');
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.reply('❌ **Ses kanalında konuşma iznim yok!**');
    }

    try {
      if (!client.queue) client.queue = new Map();
      const serverQueue = client.queue.get(message.guild.id);

      if (!serverQueue) {
        const queueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: config.defaultVolume,
          playing: true,
          player: createAudioPlayer()
        };

        client.queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(url);

        try {
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: config.voice.selfDeaf,
            selfMute: config.voice.selfMute
          });

          queueConstruct.connection = connection;
          connection.subscribe(queueConstruct.player);
          await playSong(message.guild.id, queueConstruct.songs[0], client);
          return message.reply(`${config.messages.nowPlaying} ${url}`);
          
        } catch (err) {
          console.error('Bağlantı hatası:', err);
          client.queue.delete(message.guild.id);
          return message.reply('❌ **Ses kanalına bağlanamadım!**');
        }
      } else {
        if (serverQueue.songs.length >= config.maxQueueSize) {
          return message.reply(`❌ **Kuyruk maksimum ${config.maxQueueSize} şarkıya ulaştı!**`);
        }
        serverQueue.songs.push(url);
        return message.reply(`${config.messages.addedToQueue} (${serverQueue.songs.length} şarkı)`);
      }
      
    } catch (error) {
      console.error('Play komutu hatası:', error);
      return message.reply(config.messages.commandError);
    }
  }
};

async function playSong(guildId, song, client) {
  const serverQueue = client.queue.get(guildId);
  
  if (!song) {
    if (config.voice.leaveOnEmpty && serverQueue?.connection) {
      serverQueue.connection.destroy();
    }
    client.queue.delete(guildId);
    return;
  }

  try {
    const resource = createAudioResource(song);
    serverQueue.player.play(resource);

    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift();
      playSong(guildId, serverQueue.songs[0], client);
    });

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
