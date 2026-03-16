const { joinVoiceChannel } = require('@jubbio/voice');

module.exports = {
  name: 'join',
  description: 'Botu ses kanalına çağırır',
  aliases: ['gel', 'katil'],
  
  async execute(message, args, client) {
    // Kullanıcının ses kanalını kontrol et
    const voiceChannel = message.member?.voice?.channel;
    
    console.log('Kullanıcı:', message.author.username);
    console.log('Ses kanalı:', voiceChannel?.name || 'YOK');
    
    if (!voiceChannel) {
      return message.reply('❌ **Ses kanalında değilsin!**');
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });

      if (!client.queue) client.queue = new Map();
      client.queue.set(message.guild.id, {
        connection: connection,
        songs: []
      });

      await message.reply(`✅ **${voiceChannel.name}** kanalına katıldım!`);
      console.log(`✅ ${voiceChannel.name} kanalına katıldım`);
      
    } catch (error) {
      console.error('Join hatası:', error);
      await message.reply(`❌ **Hata:** ${error.message}`);
    }
  }
};
