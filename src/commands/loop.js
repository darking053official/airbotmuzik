module.exports = {
  name: 'loop',
  description: 'Şarkı döngüsünü ayarlar',
  cooldown: 3,
  options: [
    {
      name: 'mod',
      description: 'Döngü modu',
      type: 3,
      required: true,
      choices: [
        { name: 'Kapalı', value: 'off' },
        { name: 'Tek şarkı', value: 'single' },
        { name: 'Tüm kuyruk', value: 'queue' }
      ]
    }
  ],
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue || !serverQueue.songs || !serverQueue.songs.length) {
      return interaction.reply({ 
        content: '❌ **Çalan müzik yok!**', 
        ephemeral: true 
      });
    }

    const mod = interaction.options.getString('mod');
    
    if (mod === 'off') {
      serverQueue.loop = false;
      serverQueue.loopQueue = false;
      await interaction.reply('🔁 **Döngü kapatıldı!**');
    } else if (mod === 'single') {
      serverQueue.loop = true;
      serverQueue.loopQueue = false;
      await interaction.reply('🔂 **Tek şarkı döngüye alındı!**');
    } else if (mod === 'queue') {
      serverQueue.loop = false;
      serverQueue.loopQueue = true;
      await interaction.reply('🔁 **Tüm kuyruk döngüye alındı!**');
    }
  }
};
