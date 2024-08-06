const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;
const SocksProxyAgent = require('socks-proxy-agent'); // Import the socks-proxy-agent library

const config = require('./settings.json');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Bots are running');
});

app.listen(8000, () => {
  console.log('Server started');
});

function createBot(botConfig) {

   const bot = mineflayer.createBot({
      username: botConfig.username,
      password: botConfig.password,
      auth: botConfig.type,
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
   });

   bot.loadPlugin(pathfinder);
   const mcData = require('minecraft-data')(bot.version);
   const defaultMove = new Movements(bot, mcData);
   bot.settings.colorsEnabled = false;

   bot.once('spawn', () => {
      console.log(`\x1b[33m[AfkBot] Bot ${botConfig.username} joined to the server\x1b[0m`);

      if (config.utils['auto-auth'].enabled) {
         console.log('[INFO] Started auto-auth module');

         const password = config.utils['auto-auth'].password;
         setTimeout(() => {
            bot.chat(`/register ${password}`);
            bot.chat(`/login ${password}`);
         }, 500);

         console.log(`[Auth] Authentication commands executed.`);
      }

      if (config.utils['chat-messages'].enabled) {
         console.log('[INFO] Started chat-messages module');
         const messages = config.utils['chat-messages']['messages'];

         if (config.utils['chat-messages'].repeat) {
            const delay = config.utils['chat-messages']['repeat-delay'];
            let i = 0;

            setInterval(() => {
               bot.chat(`${messages[i]}`);
               i = (i + 1) % messages.length;
            }, delay * 1000);
         } else {
            messages.forEach((msg) => bot.chat(msg));
         }
      }

      if (config.position.enabled) {
         console.log(
            `\x1b[32m[Afk Bot] Bot ${botConfig.username} starting to move to target location (${config.position.x}, ${config.position.y}, ${config.position.z})\x1b[0m`
         );
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(new GoalBlock(config.position.x, config.position.y, config.position.z));
      }

      if (config.utils['anti-afk'].enabled) {
         bot.setControlState('jump', true);
         if (config.utils['anti-afk'].sneak) {
            bot.setControlState('sneak', true);
         }
      }
   });

   bot.on('chat', (username, message) => {
      if (config.utils['chat-log']) {
         console.log(`[ChatLog] <${username}> ${message}`);
      }
   });

   bot.on('goal_reached', () => {
      console.log(
         `\x1b[32m[AfkBot] Bot ${botConfig.username} arrived at target location. ${bot.entity.position}\x1b[0m`
      );
   });

   bot.on('death', () => {
      console.log(
         `\x1b[33m[AfkBot] Bot ${botConfig.username} has died and was respawned ${bot.entity.position}\x1b[0m`
      );
   });

   if (config.utils['auto-reconnect']) {
      bot.on('end', () => {
         setTimeout(() => createBot(botConfig), config.utils['auto-recconect-delay']);
      });
   }

   bot.on('kicked', (reason) =>
      console.log(
         `\x1b[33m[AfkBot] Bot ${botConfig.username} was kicked from the server. Reason: \n${reason}\x1b[0m`
      )
   );
   bot.on('error', (err) =>
      console.log(`\x1b[31m[ERROR] ${err.message}\x1b[0m`)
   );
}

// Create bots from the configuration
config.bots.forEach(createBot);
