# Discord Clash of Clans War Details

A node.js discord bot written to monitor the Clash of Clans API and announce war attacks to a discord channel. It will also announce when prep day has started and when war day begins. There is also a reminder message 1 hour before war ends. Also by default there is a final message that pings `@everyone` 15 minutes, by default, before war ends to get their war attacks in if they haven't. All messages are configrable withom the config file as well as the final minutes timer that pings `@everyone`.

![Screenshot](/screenshot.png)

# Installation

1. Clone this repository.
1. Make sure you have [Node.JS](https://nodejs.org/en/) installed.
1. Run `npm i` to install the node modules.
1. Duplicate and rename `config.example.js` to `config.js`.
1. You will need a api key from [Clash of Clans API](https://developer.clashofclans.com/) which should be placed inside `config.js` under `coc->apiKey`.
1. You will need an app from [Discord My Apps](https://discordapp.com/developers/applications/me). You will need the apps ***Client ID*** and ***Bot Token*** these belong inside `config.js` under `discord->clientId` and `discord->userToken`.
1. The bot needs you clan tag and a *Channel ID* to post the announcements in. The clan will need a public war log. To get the *Channel ID* follow [this guide](https://support.discordapp.com/hc/en-us/articles/206346498-Where-can-I-find-my-server-ID).
1. Give the bot permissions on your server using this url `https://discordapp.com/oauth2/authorize?client_id=__CLIENT_ID__&scope=bot&permissions=134208` and replace `__CLIENT_ID__` with your bot's client id
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

## Multiple Clan Announcements
To run multiple announcements for multiple clans simply follow the layout below. It demonstrats 3 clans to announce. Each clan will need an *Channel ID* to post annoucements to
```javascript
  clans: [
    {
      tag: '',
      channelId: ''
    },
    {
      tag: '',
      channelId: ''
    },
    {
      tag: '',
      channelId: ''
    }
  ],
```
