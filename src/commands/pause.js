module.exports = {
  name: 'pause',
  description: 'Çalan müziği duraklatır',
  aliases: ['dur', 'bekle'],
  cooldown: 3,
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ **Önce bir ses kanalına girmelisin!**');
    }

    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply('❌ **Çalan müzik yok!**');
    }

    serverQueue.player.pause();
    return message.reply('⏸️ **Müzik duraklatıldı!** Devam etmek için `!devam` yaz.');
  }
};
