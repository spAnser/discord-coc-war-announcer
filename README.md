# Discord Clash of Clans War Details

A node.js discord bot written to monitor the Clash of Clans API and announce war attacks to a discord channel. It will also announce when prep day has started and when war day begins. There is also a reminder message 1 hour before war ends. There is a final message that announces 15 minutes, by default, before war ends.

# Support
No longer maintained feel free to fork and edit the code. It is provided as is.

# Installation

1. [Authorize Announcer](https://discordapp.com/oauth2/authorize?client_id=307275616179322881&scope=bot&permissions=396352) on your server.
1. Have someone that has `Manage Channel` permissions for the server assign a clan with the command `!announce #CLANTAG` in the channel you want messages in.
1. To stop messages in a channel use the command `!unannounce #CLANTAG` requires the same permission as the `!announce` command.

# Commands

1. `!announce #CLANTAG` Assign a clan to announce in a channel.
1. `!unannounce #CLANTAG` Stop a clan from announcing in a channel.
1. `!warstats #CLANTAG` Display war stats for a clan that is tracked by The Announcer. If not provided with a clan tag it will display war stats for all clans assigned to the channel the command was run in.
1. `!hitrate #CLANTAG` Display hit rate stats for a clan that is tracked by The Announcer. If not provided with a clan tag it will display hit rate stats for all clans assigned to the channel the command was run in.
1. `!playerstats #PLAYERTAG` Display player stats for any player tag provided.
1. `!style [1-6](+)` Choose a style to use for war attacks in this channel. Requires a number to select style type, optionally append a + if you want war stats included in every message.
1. `!styletest` Show a preview of all styles.
1. `!showmissing [yes,no]` Show missing attacks with final hours and final minutes messages. Default value is no.
1. `!info` Display bot information.
1. `!help` Display list of commands.

![Screenshot](/screenshot.png)

# Self Hosted Installation

1. Clone this repository.
1. Make sure you have [Node.JS](https://nodejs.org/en/) 6.10.x or newer installed.
1. Run `npm i` to install the node modules.
1. Duplicate and rename `config.example.js` to `config.js`.
1. You will need a api key from [Clash of Clans API](https://developer.clashofclans.com/) which should be placed inside `config.js` under `coc->apiKey`.
1. You will need an app from [Discord My Apps](https://discordapp.com/developers/applications/me). You will need the apps ***Client ID*** and ***Bot Token*** these belong inside `config.js` under `discord->clientId` and `discord->userToken`.
1. The bot needs you clan tag and a *Channel ID* to post the announcements in. The clan will need a public war log. To get the *Channel ID* follow [this guide](https://support.discordapp.com/hc/en-us/articles/206346498-Where-can-I-find-my-server-ID).
1. Give the bot permissions on your server using this url `https://discordapp.com/oauth2/authorize?client_id=__CLIENT_ID__&scope=bot&permissions=396352` and replace `__CLIENT_ID__` with your bot's client id
1. The clan being monitored will need their war log set to public.
1. Run `node index.js` to start the bot.
1. If you need the bot to be kept alive look into [PM2](https://github.com/Unitech/pm2)

## FAQ

1. ***Q:*** *Why do the icons not show up on android?*  
***A:*** There is currently a [bug](https://feedback.discordapp.com/forums/326712-discord-dream-land/suggestions/18524065-fix-emojis-inside-embeds-on-android) with the android version of the app that prevents emojis in RichEmbeds from appearing
1. ***Q:*** *I saw an attack in game but the bot hasn't said anything in chat about it yet.*  
***A:*** Currently the Clash of Clans API only updates every 10 minutes. So it can take anywhere from immediately to 10 minutes for an attack to show up in chat.
1. ***Q:*** *How many clans can the **Announcer** monitor?*  
***A:*** The bot should be able handle as many clans as you configure it for.
1. ***Q:*** *What does 🍃 mean?*  
***A:*** A leaf icons stands for a fresh attack. An attack on a base not yet attacked in this war.
1. ***Q:*** *What does 🔺 and 🔻 mean?*  
***A:*** When a Town Hall 9 attacks a Town Hall 10 it displays a 🔺. When a Town Hall 10 attacks a Town Hall 9 it displays a 🔻.
1. ***Q:*** *Can I get info about the current/upcoming war from the bot?*  
***A:*** Yes just type `!warstats` into chat. If you have multiple clan's attacks showing up in a single channel you can use `!warstats #CLANTAG` to get stats for a specific clan.
1. ***Q:*** *Can I customize the emojis the bot uses?*  
***A:*** Yes you can by uploading you own emojis and using the names below

    |Name | Meaning|
    |-|-|
    |dwasword | Attack Success|
    |dwaswordbroken | Attack Failed|
    |dwashield | Defend Success|
    |dwashieldbroken | Defend Failed|
    |dwastar | Star|
    |dwastarnew | New Star|
    |dwastarempty | Empty Star|
1. ***Q:*** *Can I use this bot to call bases?*  
***A:*** No not at this time.
1. ***Q:*** *Will this bot keep detailed statistics of our wars?*  
***A:*** No not at this time.
