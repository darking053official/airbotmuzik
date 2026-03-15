module.exports = {
  name: 'skip',
  description: 'Sonraki şarkıya geçer',
  aliases: ['gec', 'next', 's'],
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

    // Sadece bir şarkı varsa durdur
    if (serverQueue.songs.length === 1) {
      serverQueue.songs = [];
      serverQueue.player.stop();
      serverQueue.connection?.destroy();
      client.queue.delete(message.guild.id);
      return message.reply('⏹️ **Son şarkıydı, müzik durduruldu!**');
    }

    // Sonraki şarkıya geç
    serverQueue.player.stop(); // Bu idle eventini tetikleyip sonraki şarkıya geçecek
    return message.reply('⏭️ **Sonraki şarkıya geçiliyor...**');
  }
};
