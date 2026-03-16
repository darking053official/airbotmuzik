module.exports = {
  name: 'leave',
  description: 'Botu ses kanalından çıkarır',
  aliases: ['çık', 'git', 'ayrıl'],
  
  async execute(message, args, client) {
    const serverQueue = client.queue.get(message.guild.id);
    
    if (!serverQueue || !serverQueue.connection) {
      return message.reply('❌ **Zaten ses kanalında değilim!**');
    }

    try {
      serverQueue.connection.destroy();
      client.queue.delete(message.guild.id);
      await message.reply('👋 **Kanal terk edildi!**');
    } catch (error) {
      await message.reply(`❌ **Hata:** ${error.message}`);
    }
  }
};
