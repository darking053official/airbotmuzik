module.exports = {
  name: 'stop',
  description: 'Müziği durdurur ve kanaldan çıkar',
  aliases: ['dur', 'leave', 'ayril', 'git'],
  cooldown: 3,
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ **Önce bir ses kanalına girmelisin!**');
    }

    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue) {
      return message.reply('❌ **Çalan müzik yok!**');
    }

    // Kuyruğu temizle, müziği durdur, kanaldan çık
    serverQueue.songs = [];
    serverQueue.player.stop();
    
    if (serverQueue.connection) {
      serverQueue.connection.destroy();
    }
    
    client.queue.delete(message.guild.id);
    
    return message.reply('⏹️ **Müzik durduruldu ve kanaldan çıktım!** 👋');
  }
};
