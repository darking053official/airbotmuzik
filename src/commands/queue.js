const config = require('../../config');

module.exports = {
  name: 'queue',
  description: 'Kuyruktaki şarkıları gösterir',
  aliases: ['sira', 'q', 'liste'],
  cooldown: 5,
  
  async execute(message, args, client) {
    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply(config.messages.queueEmpty);
    }

    let queueList = `${config.emojis.queue} **Kuyruktaki şarkılar:**\n\n`;
    const maxShow = Math.min(serverQueue.songs.length, 10);
    
    for (let i = 0; i < maxShow; i++) {
      const song = serverQueue.songs[i];
      const shortUrl = song.length > 50 ? song.substring(0, 50) + '...' : song;
      
      if (i === 0) {
        queueList += `${config.emojis.play} **Şu an:** ${shortUrl}\n`;
      } else {
        queueList += `   ${i}. ${shortUrl}\n`;
      }
    }
    
    if (serverQueue.songs.length > 10) {
      queueList += `\n...ve **${serverQueue.songs.length - 10} şarkı** daha.`;
    }
    
    queueList += `\n\n📊 **Toplam:** ${serverQueue.songs.length} şarkı`;
    return message.reply(queueList);
  }
};
