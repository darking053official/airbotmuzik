module.exports = {
  name: 'nowplaying',
  description: 'Şu an çalan şarkıyı gösterir',
  aliases: ['np'],
  cooldown: 2,
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue || !serverQueue.songs || !serverQueue.songs.length) {
      return interaction.reply({ 
        content: '❌ **Şu an müzik çalmıyor!**', 
        ephemeral: true 
      });
    }

    const currentSong = serverQueue.songs[0];
    await interaction.reply(`▶️ **Şu an çalıyor:** ${currentSong}`);
  }
};
