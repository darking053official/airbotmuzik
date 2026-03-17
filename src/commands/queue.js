module.exports = {
  name: 'queue',
  description: 'Kuyruktaki şarkıları gösterir',
  cooldown: 5,
  
  async execute(interaction, client) {
    const serverQueue = client.queue.get(interaction.guild.id);
    
    if (!serverQueue || !serverQueue.songs || !serverQueue.songs.length) {
      return interaction.reply('📭 **Kuyruk boş!**');
    }

    let queueList = '📋 **Kuyruktaki şarkılar:**\n\n';
    const maxShow = Math.min(serverQueue.songs.length, 10);
    
    for (let i = 0; i < maxShow; i++) {
      const song = serverQueue.songs[i];
      const shortUrl = song.length > 50 ? song.substring(0, 50) + '...' : song;
      
      if (i === 0) {
        queueList += `▶️ **Şu an çalıyor:** ${shortUrl}\n`;
      } else {
        queueList += `   ${i}. ${shortUrl}\n`;
      }
    }
    
    if (serverQueue.songs.length > 10) {
      queueList += `\n...ve **${serverQueue.songs.length - 10} şarkı** daha.`;
    }
    
    queueList += `\n\n📊 **Toplam şarkı:** ${serverQueue.songs.length}`;
    
    await interaction.reply(queueList);
  }
};
