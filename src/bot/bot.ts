import { Telegraf } from "telegraf";

const bot = new Telegraf("8750003133:AAGXU_web3I9nIXFxRVmWBOYd-dES8mzCsU");

bot.start((ctx) => {
  ctx.reply("Добро пожаловать в Bars 👕", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Открыть магазин",
            web_app: {
              url: "https://frontend-one-zeta-45.vercel.app", // фронтенд
            },
          },
        ],
      ],
    },
  });
});

bot.launch();

console.log("Bot started 🤖");