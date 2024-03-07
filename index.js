import { Client, Intents, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import cheerio from "cheerio";
import dotenv from "dotenv";
import { Server, createServer } from "http";
dotenv.config();

const server = createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(`
    <html>
      <head>
        <title>Bot is alive!</title>
      </head>
      <body style="margin: 0; padding: 0;">
      <p>scenexe2bot is alive!</p>
      </body>
    </html>`);
});

server.listen(3000, () => {
  console.log("Web view server started on port 3000");
});

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const prefix = "f!";
const commandCooldowns = new Map();
const serverPrefixes = {};

client.once("ready", () => {
  console.log("Bot is ready!");
  client.user.setStatus("online");
  const guildCount = client.guilds.cache.size;
  client.user.setActivity(`over ${guildCount} servers`, {
    type: "WATCHING",
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const serverPrefix = serverPrefixes[message.guild.id] || prefix;
  if (!message.content.startsWith(serverPrefix)) return;

  const args = message.content.slice(serverPrefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const userId = message.author.id;
  if (
    commandCooldowns.has(userId) &&
    Date.now() - commandCooldowns.get(userId) < 3000
  ) {
    return message.reply("Please wait 3 seconds before using another command.");
  }

  commandCooldowns.set(userId, Date.now());
  if (command === "setprefix") {
    if (
      !message.member.permissions.has("MANAGE_GUILD") &&
      !message.member.permissions.has("ADMINISTRATOR")
    ) {
      return message.reply("You don't have permission to use this command!");
    }
    if (!args[0]) {
      return message.reply("Please provide a new prefix.");
    }
    serverPrefixes[message.guild.id] = args[0];
    message.reply(`Prefix has been set to \`${args[0]}\``);
    return;
  }
  commandCooldowns.set(userId, Date.now());
  if (command === "user") {
    const username = message.content.split(" ")[1];

    if (!username) {
      return message.reply("Please provide a username.");
    }

    try {
      const response = await fetch(`https://scenexe2.io/account?u=${username}`);
      const data = await response.json();

      const userName = data.username;
      const stars = formatNumber(data.stars);
      const description = data.description;
      const ascensions = data.ascensions;
      const maxScore = formatNumber(data.maxScore);
      const celestialKills = data.celestialKills;
      const achievements = formatAchievements(data.achievements);
      const timePlayed = formatTimePlayed(data.timePlayed);

      const userEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle(`\`${username}'s Profile\``)
        .setURL(`https://scenexe2.io/account?u=${username}`);

      function addFieldIfNotTooLong(embed, name, value) {
        const valueStr = String(value);
        if (valueStr && valueStr.length <= 1024) {
          embed.addField(name, valueStr, true);
        } else {
          const chunks = valueStr.match(/.{1,1024}/g) || [];
          chunks.forEach((chunk, index) => {
            embed.addField(`${name} (${index + 1})`, chunk, true);
          });
        }
      }

      addFieldIfNotTooLong(userEmbed, "`⭐Stars`", stars);
      addFieldIfNotTooLong(userEmbed, "`🎯Highest Score`", maxScore);
      addFieldIfNotTooLong(userEmbed, "`🌌Ascensions`", ascensions);
      addFieldIfNotTooLong(userEmbed, "`🗡️Celestials Killed`", celestialKills);
      addFieldIfNotTooLong(userEmbed, "`🏆Achievements`", `\`${achievements}\``);
      addFieldIfNotTooLong(userEmbed, "`⏰Play Time`", timePlayed);

      message.reply({ embeds: [userEmbed] });
    } catch (error) {
      console.error(error);
      message.reply("An error occurred while fetching the data.");
    }
  } else if (command === "playercount") {
    try {
      const response = await fetch("https://scenexe2.io/playercount");
      const data = await response.json();

      const playerCountEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("Player Count")
        .setDescription(
          Object.entries(data)
            .map(([server, count]) => `\`${server}: ${count}\``)
            .join("\n"),
        );

      message.reply({ embeds: [playerCountEmbed] });
    } catch (error) {
      console.error(error);
      message.reply("An error occurred while fetching the player count data.");
    }
  } else if (command === "servers") {
    const requiredRoleId = "1213862182798762044";

    if (message.member.roles.cache.has(requiredRoleId)) {
      const guilds = await Promise.all(
        client.guilds.cache.map(async (guild) => {
          let owner = guild.owner;
          if (owner) {
            return `${guild.name} (Owned by ${owner.user.username}#${owner.user.discriminator})`;
          } else {
            return `${guild.name} (Owner not known)`;
          }
        }),
      );

      const serversEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("Servers")
        .setDescription(guilds.join("\n"));

      message.reply({ embeds: [serversEmbed] });
    } else {
      message.reply("You do not have permission to use this command.");
    }
  } else if (command === "help") {
    function createHelpEmbed(prefix) {
      const helpEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("Help")
        .setDescription("List of available commands:")
        .addField(
          `\`${prefix}user <username>\``,
          "Fetches user profile information.",
        )
        .addField(
          `\`${prefix}top <score/stars>\``,
          "Displays top users by score/stars",
        )
        .addField(`\`${prefix}playercount\``, "Shows the player count.")
        .addField(`\`${prefix}reddit\``, "Shows latest reddit post")
        .addField(`\`${prefix}invite\``, "Sends the bot's invite link.")
        .addField(`\`${prefix}say <message>\``, "Sends the message inputed.")
        .addField(`\`${prefix}flip\``, "Flips a coin and sends the output.");

      return helpEmbed;
    }
    message.reply({ embeds: [createHelpEmbed(serverPrefix)] });
  } else if (message.content.startsWith(`${prefix}invite`)) {
    message.author
      .send(
        "https://discord.com/oauth2/authorize?client_id=1211532503060316210&scope=bot&permissions=1099511496703",
      )
      .catch(console.error);
  } else if (command === "reddit") {
    const url = "https://pastebin.com/raw/wDj4K1eC";

    try {
      const response = await fetch(url);
      const html = await response.text();

      const maxMessageLength = 2000;
      let messageContent = html;

      if (messageContent.length > maxMessageLength) {
        const messageParts = [];
        while (messageContent.length > maxMessageLength) {
          messageParts.push(messageContent.substring(0, maxMessageLength));
          messageContent = messageContent.substring(maxMessageLength);
        }
        messageParts.push(messageContent);

        for (const part of messageParts) {
          await message.reply(part);
        }
      } else {
        message.reply(messageContent);
      }
    } catch (error) {
      console.error(error);
      message.reply("An error occurred while fetching the webpage.");
    }
  } else if (command === "say") {
    if (
      !message.member.permissions.has("MANAGE_MESSAGES") &&
      !message.member.permissions.has("ADMINISTRATOR")
    ) {
      return message.channel.send(
        "You don't have permission to use this command!",
      );
    }

    const textToSay = message.content.slice(`${prefix}say`.length).trim();

    if (textToSay) {
      message.reply(textToSay);
    } else {
      message.reply("You didn't say anything!");
    }
  } else if (command === "flip") {
    const result = Math.random();
    const outcome = result > 0.5 ? "Heads" : "Tails";
    message.reply(`The coin landed on **${outcome}**!`);
  } else if (command === "top") {
        const leaderboardType = args[0];
        let leaderboardUrl, leaderboardTitle, leaderboardDescription;

        if (leaderboardType === "score") {
          leaderboardUrl = "https://scenexe2.io/leaderboard?m=10&i=2";
          leaderboardTitle = "Top 10 Score Leaderboard";
          leaderboardDescription = "";
        } else if (leaderboardType === "stars") {
          leaderboardUrl = "https://scenexe2.io/leaderboard?m=10&i=0";
          leaderboardTitle = "Top 10 Stars Leaderboard";
          leaderboardDescription = "";
        } else {
          return message.reply("Please specify either 'score' or 'stars' after the 'top' command.");
        }

        try {
          const response = await fetch(leaderboardUrl);
          const data = await response.json();

          for (let index = 0; index < 10; index++) {
            const user = data[index];
            const rank = index + 1;
            const username = user.username;
            const scoreOrStars = leaderboardType === "score" ? formatNumber(user.maxScore) : formatNumber(user.stars);

            leaderboardDescription += `\`${rank}. ${username} - ${scoreOrStars}\`\n`;
          }

          const leaderboardEmbed = new MessageEmbed()
            .setColor("#0099ff")
            .setTitle(leaderboardTitle)
            .setDescription(leaderboardDescription);

          message.reply({ embeds: [leaderboardEmbed] });
        } catch (error) {
          console.error(error);
          message.reply("An error occurred while fetching the leaderboard data.");
        }
     } else if (command === "getipv4") {
   if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.reply("You do not have permission to use this command.");
   }

   const userMention = message.mentions.users.first();
   const userId = args[0]; 

   let user;
   if (userMention) {
      user = userMention;
   } else if (userId) {
      user = await client.users.fetch(userId).catch(() => null);
      if (!user) {
        return message.reply("User not found.");
      }
   } else {
      return message.reply("Please mention a user or provide a user ID.");
   }

   const ipAddress = getIPv4();
   const ipEmbed = new MessageEmbed()
      .setTitle(`${user.username}'s IPv4 Address`)
      .setDescription(`||${ipAddress}||`)
      .setColor("#0099ff");

   message.reply({ embeds: [ipEmbed] });
  } else if (command === "getipv6") {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
          return message.reply("You do not have permission to use this command.");
        }

        const userMention = message.mentions.users.first();
        const userId = args[0]; 

        let user;
        if (userMention) {
          user = userMention;
        } else if (userId) {
          user = await client.users.fetch(userId).catch(() => null); 
          if (!user) {
            return message.reply("User not found.");
          }
        } else {
          return message.reply("Please mention a user or provide a user ID.");
        }

        const ipv6Address = getIPv6();

        const ipv6Embed = new MessageEmbed()
          .setTitle(`${user.username}'s IPv6 Address'`)
          .setDescription(`||${ipv6Address}||`)
          .setColor("#0099ff");

        message.reply({ embeds: [ipv6Embed] });
     } else if (command === "ship") {
    if (message.mentions.users.size !== 2) {
      return message.reply("Please mention exactly two users.");
    }

    const user1 = message.mentions.users.first();
    const user2 = message.mentions.users.last();

    const percentage = Math.floor(Math.random() * 100) + 1;

    let messageText;
    if (percentage > 90) {
      messageText = "Meant to be together!";
    } else if (percentage > 70) {
      messageText = "Have a strong connection!";
    } else if (percentage > 50) {
      messageText = "Are a good match!";
    } else if (percentage > 30) {
      messageText = "Might work out!";
    } else {
      messageText = "Are not a good match.";
    }

    const shipEmbed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle(`Ship Compatibility`)
      .setDescription(`${user1.username} ${percentage}% ${user2.username}\n${messageText}`)
      .setFooter("Ship command powered by randomness!");

    message.reply({ embeds: [shipEmbed] });
 }
});

client.on("guildCreate", async (guild) => {
  console.log(`Joined new guild: ${guild.name} (id: ${guild.id})`);
  const targetGuildId = "1213809008129998868";
  const channelId = "1213809049104285737";

  const targetGuild = client.guilds.cache.get(targetGuildId);

  if (targetGuild) {
    const channel = targetGuild.channels.cache.get(channelId);

    if (channel && channel.isText()) {
      try {
        const inviter = guild.inviter;
        if (inviter) {
          await channel.send(
            `Joined server ${guild.name} invited by ${inviter.username}#${inviter.discriminator}`,
          );
        } else {
          await channel.send(
            `Joined server ${guild.name} but the inviter is not available.`,
          );
        }
      } catch (error) {
        console.error(
          `Failed to send message to channel ${channelId} in guild ${targetGuild.name}. Error:`,
          error,
        );
      }
    } else {
      console.error(
        `Channel with ID ${channelId} not found in guild ${targetGuild.name}.`,
      );
    }
  } else {
    console.error(`Guild with ID ${targetGuildId} not found.`);
  }
});

function getIPv6() {
 let ipv6 = '';
 for (let i = 0; i < 8; i++) {
    ipv6 += Math.floor(Math.random() * 65536).toString(16);
    if (i < 7) ipv6 += ':';
 }
 return ipv6;
}

function getIPv4() {
 return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function formatNumber(value) {
  if (value >= 1000000000000000000000) {
     return (value / 1000000000000000000000).toFixed(1) + "sx";
  } else if (value >= 1000000000000000000) {
     return (value / 1000000000000000000).toFixed(1) + "qi";
  } else if (value >= 1000000000000000) {
     return (value / 1000000000000000).toFixed(1) + "qa";
  } else if (value >= 1000000000000) {
     return (value / 1000000000000).toFixed(1) + "t";
  } else if (value >= 1000000000) {
     return (value / 1000000000).toFixed(1) + "b";
  } else if (value >= 1000000) {
     return (value / 1000000).toFixed(1) + "m";
  } else if (value >= 1000) {
     return (value / 1000).toFixed(1) + "k";
  } else {
     return value;
  }
 }

function formatAchievements(achievements) {
  const achievementNames = {
    0: "Hunter",
    1: "Self-Sufficient",
    2: "Scavenger",
    3: "Ascended",
    4: "Dimensional Traveler",
    5: "Prime",
    6: "Shiny!",
    7: "Defender",
    8: "Excursionist",
    9: "Demolitionist",
    10: "Classic",
    11: "Titan",
    13: "Oh Node!",
    15: "Ethereal",
    16: "Billionaire",
    17: "Trespasser",
    18: "Jackpot!",
    19: "Galactic Guardian",
    22: "Divine",
    24: "Pristine",
  };

  return achievements
    .map((achievement) => achievementNames[achievement.id])
    .join(", ");
}

function formatTimePlayed(seconds) {
  let hours = Math.floor(seconds / 3600);
  let minutes = Math.floor((seconds % 3600) / 60);
  let remainingSeconds = seconds % 60;

  let formattedTime = "";
  if (hours > 0) {
    formattedTime = `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    formattedTime = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else if (remainingSeconds > 0) {
    formattedTime = `${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
  }

  return formattedTime;
}

client.login(process.env.bot);
