module.exports = {
  name: 'stop',
  description: 'Müziği durdurur ve kanaldan çıkar',
  cooldown: 3,
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue) {
      return interaction.reply({ 
        content: '❌ **Zaten kanalda değilim!**', 
        ephemeral: true 
      });
    }

    serverQueue.songs = [];
    serverQueue.player?.stop();
    serverQueue.connection?.destroy();
    client.queue.delete(interaction.guild.id);
    
    await interaction.reply('⏹️ **Müzik durduruldu ve kanaldan çıktım!** 👋');
  }
};
