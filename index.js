import { Bot } from "@jubbio/core"

const bot = new Bot({ prefix: "!" })

bot.loadCommands("./commands")

bot.start()
