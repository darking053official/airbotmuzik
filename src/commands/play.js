const { createAudioPlayer, createAudioResource } = require('@jubbio/voice');
const { Room, AudioTrack } = require('livekit-client');

module.exports = {
  name: 'play',
  description: 'Müzik çalar',
  options: [
    {
      name: 'url',
      description: 'YouTube URL',
      type: 3,
      required: true
    }
  ],
  
  async execute(interaction, client) {
    const url = interaction.options.getString('url');
    const serverQueue = client.queue.get(interaction.guild.id);

    if (!serverQueue || !serverQueue.connection) {
      return interaction.reply('❌ Önce /join yaz!');
    }

    if (!serverQueue.player) {
      serverQueue.player = createAudioPlayer();
      serverQueue.connection.subscribe(serverQueue.player);
    }

    if (!serverQueue.songs) serverQueue.songs = [];
    serverQueue.songs.push(url);

    if (serverQueue.songs.length === 1) {
      await interaction.reply(`▶️ Müzik çalıyor: ${url}`);
      playSong(interaction.guild.id, client);
    } else {
      await interaction.reply(`📋 Kuyruğa eklendi! (${serverQueue.songs.length} şarkı)`);
    }
  }
};

async function playSong(guildId, client) {
  const serverQueue = client.queue.get(guildId);
  if (!serverQueue || !serverQueue.songs.length) return;

  try {
    const resource = createAudioResource(serverQueue.songs[0]);
    serverQueue.player.play(resource);
  } catch (error) {
    console.error('Play hatası:', error);
    serverQueue.songs.shift();
    playSong(guildId, client);
  }
  }
