module.exports = {
  name: 'shuffle',
  description: 'Kuyruktaki şarkıları karıştırır',
  cooldown: 5,
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue || !serverQueue.songs || serverQueue.songs.length < 2) {
      return interaction.reply({ 
        content: '❌ **Karıştırmak için en az 2 şarkı olmalı!**', 
        ephemeral: true 
      });
    }

    const currentSong = serverQueue.songs.shift();
    for (let i = serverQueue.songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [serverQueue.songs[i], serverQueue.songs[j]] = [serverQueue.songs[j], serverQueue.songs[i]];
    }
    serverQueue.songs.unshift(currentSong);

    await interaction.reply('🔀 **Kuyruk karıştırıldı!**');
  }
};
