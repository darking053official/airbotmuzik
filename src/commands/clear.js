module.exports = {
  name: 'clear',
  description: 'Kuyruktaki tüm şarkıları temizler',
  cooldown: 5,
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue || !serverQueue.songs || serverQueue.songs.length < 2) {
      return interaction.reply({ 
        content: '❌ **Temizlenecek şarkı yok!**', 
        ephemeral: true 
      });
    }

    const currentSong = serverQueue.songs[0];
    serverQueue.songs = [currentSong];

    await interaction.reply(`🧹 **Kuyruktaki ${serverQueue.songs.length - 1} şarkı temizlendi!**`);
  }
};
