const { joinVoiceChannel } = require('@jubbio/voice');

module.exports = {
  name: 'join',
  description: 'Botu ses kanalına çağırır',
  cooldown: 2,
  
  async execute(interaction, client) {
    // ===== GÜVENLİ KONTROL =====
    if (!interaction.guild) {
      return interaction.reply({ 
        content: '❌ Bu komut sadece sunucularda kullanılabilir.', 
        ephemeral: true 
      });
    }

    await interaction.deferReply();
    
    try {
      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.editReply('❌ Önce bir ses kanalına girmelisin!');
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      if (!client.queue) client.queue = new Map();
      client.queue.set(interaction.guild.id, { connection, songs: [] });

      await interaction.editReply(`✅ **${voiceChannel.name}** kanalına katıldım!`);
    } catch (error) {
      console.error('Join hatası:', error);
      await interaction.editReply(`❌ Hata: ${error.message}`);
    }
  }
};
