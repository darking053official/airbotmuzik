export default {
  name: "stop",
  permissions: ["ManageChannels"],

  async execute(ctx){
    const dj = ctx.guildSettings.djRole
    if(dj && !ctx.member.roles.includes(dj)) return ctx.reply("❌ Sadece DJ durdurabilir")
    ctx.guildSettings.queue = []
    ctx.guildSettings.isPlaying = false
    ctx.reply("⏹ Müzik durduruldu")
  }
}
