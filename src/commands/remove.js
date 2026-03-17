module.exports = {
  name: 'remove',
  description: 'Kuyruktan belirtilen sıradaki şarkıyı kaldırır',
  cooldown: 3,
  options: [
    {
      name: 'sira',
      description: 'Kaldırılacak şarkının sırası',
      type: 4,
      required: true,
      min_value: 1
    }
  ],
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue || !serverQueue.songs || serverQueue.songs.length < 2) {
      return interaction.reply({ 
        content: '❌ **Kuyrukta kaldırılacak şarkı yok!**', 
        ephemeral: true 
      });
    }

    const index = interaction.options.getInteger('sira');
    
    if (index >= serverQueue.songs.length) {
      return interaction.reply({ 
        content: `❌ **Geçersiz sıra! Kuyrukta ${serverQueue.songs.length} şarkı var.**`, 
        ephemeral: true 
      });
    }

    const removed = serverQueue.songs.splice(index, 1)[0];
    await interaction.reply(`🗑️ **${index}. sıradaki şarkı kaldırıldı!**`);
  }
};
