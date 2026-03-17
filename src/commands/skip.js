module.exports = {
  name: 'skip',
  description: 'Sonraki şarkıya geçer',
  cooldown: 2,
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue || !serverQueue.songs || !serverQueue.songs.length) {
      return interaction.reply({ 
        content: '❌ **Çalan müzik yok!**', 
        ephemeral: true 
      });
    }

    if (serverQueue.songs.length === 1) {
      serverQueue.songs = [];
      serverQueue.player?.stop();
      serverQueue.connection?.destroy();
      client.queue.delete(interaction.guild.id);
      return interaction.reply('⏹️ **Son şarkıydı, müzik durduruldu!**');
    }

    serverQueue.player?.stop();
    await interaction.reply('⏭️ **Sonraki şarkıya geçiliyor...**');
  }
};
