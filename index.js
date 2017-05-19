'use strict'

console.log('\x1Bc')

const LOG = true
const DEBUG = false

let cleanArray = actual => {
  if (actual && actual.constructor === Array) {
    let j = 0
    for (let i = 0; i < actual.length; i++) {
      if (actual[i]) {
        actual[j++] = actual[i]
      }
    }
    actual.length = j
    return actual
  }
  return []
}

global.fixISO = str => {
  return str.substr(0,4) + "-" + str.substr(4,2) + "-" + str.substr(6,5) + ":" + str.substr(11,2) + ":" +  str.substr(13)
}

global.log = message => {
  if (LOG) console.log((message) ? message : '')
}

global.debug = message => {
  if (DEBUG) console.log(chalk.yellow('DEBUG:'), message)
}

const crypto = require('crypto')
const util = require('util')

const async = require('async')
const chalk = require('chalk')
const Discord = require('discord.js')
const findRemoveSync = require('find-remove')
const get = require('simple-get')
const moment = require('moment')
const nodePersist = require('node-persist')
const os = require('os-utils')

const Clan = require('./clash-of-clans-api/clans')

console.log(chalk.cyan('-'.repeat(17)))
console.log(chalk.cyan(' Discord War Bot '))
console.log(chalk.cyan('-'.repeat(17)))

global.config = require('./config')
log(chalk.bold('Server Permission URL:'))
log(chalk.magenta.bold('https://discordapp.com/oauth2/authorize?client_id=' + config.discord.clientId + '&scope=bot&permissions=134208\n'))

const DiscordClient = new Discord.Client()

const COC_API_BASE = 'https://api.clashofclans.com/v1'

global.DiscordChannelEmojis = {
  'dwashield': '<:dwashield:306956561266507786>',
  'dwashieldbroken': '<:dwashieldbroken:306956561073438720>',
  'dwasword': '<:dwasword:306956560695951362>',
  'dwaswordbroken': '<:dwaswordbroken:306956561073307648>',
  'dwastarempty': '<:dwastarempty:306956560779706370>',
  'dwastar': '<:dwastar:306956561056530442>',
  'dwastarnew': '<:dwastarnew:306956560855465995>',
}
global.DiscordTownHallEmojis = [
  '<:townhall1:307293097405054976>',
  '<:townhall2:307293097748987904>',
  '<:townhall3:307293098260824085>',
  '<:townhall4:307293098495442945>',
  '<:townhall5:307293098592174083>',
  '<:townhall6:307293098797563906>',
  '<:townhall7:307293099028119552>',
  '<:townhall8:307293099145822208>',
  '<:townhall9:307293099162599424>',
  '<:townhall10:307293099808260096>',
  '<:townhall11:307293099174920192>',
]
global.DiscordTroopEmojis = {
  'Barbarian': '<:barbarian:310230295901372418>',
  'Archer': '<:archer:310230294085107734>',
  'Goblin': '<:goblin:310230297180504064>',
  'Giant': '<:giant:310230296488443915>',
  'Wall Breaker': '<:wallbreaker:310230296740102144>',
  'Balloon': '<:ballooncoc:310230296580718603>',
  'Wizard': '<:wizard:310230297834815488>',
  'Healer': '<:healer:310230296572461057>',
  'Dragon': '<:dragoncoc:310230297570705408>',
  'P.E.K.K.A': '<:pekka:310230296689639434>',
  'Minion': '<:minion:310230296584912896>',
  'Hog Rider': '<:hogrider:310230295896915969>',
  'Valkyrie': '<:valkyrie:310230296379260929>',
  'Golem': '<:golem:310230296761204736>',
  'Witch': '<:witch:310230296568135680>',
  'Lava Hound': '<:lavahound:310230296765267968>',
  'Bowler': '<:bowler:310230295905566722>',
  'Baby Dragon': '<:babydragon:310230294475309057>',
  'Miner': '<:miner:310230297167921153>',
}
global.DiscordSpellEmojis = {
  'Lightning Spell': '<:lightningspell:310230391489429506>',
  'Healing Spell': '<:healingspell:310230391497687042>',
  'Rage Spell': '<:ragespell:310230391187308545>',
  'Jump Spell': '<:jumpspell:310230391002759179>',
  'Freeze Spell': '<:freezespell:310230391569252352>',
  'Poison Spell': '<:poisonspell:310230391074193411>',
  'Earthquake Spell': '<:earthquakespell:310230390059040769>',
  'Haste Spell': '<:hastespell:310230391317331968>',
  'Clone Spell': '<:clonespell:310230390407430144>',
  'Skeleton Spell': '<:skeletonspell:310230391262937094>',
}
global.DiscordHeroEmojis = {
  'Barbarian King': '<:barbarianking:310230422481141760>',
  'Archer Queen': '<:archerqueen:310230422455975936>',
  'Grand Warden': '<:grandwarden:310230422560964608>',
}

global.Clans = {}
global.Players = {}

global.Storage = nodePersist.create()
Storage.initSync()

global.AnnounceClans = Storage.getItemSync('AnnounceClans')
AnnounceClans = cleanArray(AnnounceClans)
Storage.setItemSync('AnnounceClans', AnnounceClans)
if (!AnnounceClans) AnnounceClans = []

const StarColors = config.starColors

global.announcingClan = (clanTag) => {
  let count = 0
  let match
  AnnounceClans.forEach(clan => {
    if (clan.tag === clanTag.toUpperCase().replace(/O/g, '0')) {
      match = count
    }
    count++
  })
  return match
}

global.getClanChannel = (clanTag, done) => {
  AnnounceClans.forEach(clan => {
    if (clan.tag === clanTag.toUpperCase().replace(/O/g, '0')) {
      done(clan.channels)
    }
  })
}

global.getChannelClan = (channelId, done) => {
  AnnounceClans.forEach(clan => {
    if (clan.channels.indexOf(channelId) > -1) {
      done(clan.tag)
    }
  })
}

global.getChannelById = (channelId, done) => {
  DiscordClient.channels.forEach(channel => {
    if (channel.id == channelId) done(channel)
  })
  done()
}

global.getAnnouncerStats = () => {
  let announcerStats = {
    clanCount: AnnounceClans.length
  }
  let channels = []
  AnnounceClans.forEach(announceClan => {
    announceClan.channels.forEach(channel => {
      if (channels.indexOf(channel) === -1) {
        channels.push(channel)
      }
    })
  })
  announcerStats.channelCount = channels.length
  return announcerStats
}

global.discordAttackMessage = (warId, WarData, clanTag, opponentTag, attackData, channelId) => {
  debug(clanTag)
  debug(attackData)
  let emojis = DiscordChannelEmojis
  let clanPlayer
  let opponentPlayer
  let attackDir = 'across'
  if (attackData.who === 'clan') {
    clanPlayer = Players[attackData.attackerTag]
    opponentPlayer = Players[attackData.defenderTag]
    if (clanPlayer.townhallLevel > opponentPlayer.townhallLevel) {
      attackDir = 'down'
    } else if (clanPlayer.townhallLevel < opponentPlayer.townhallLevel) {
      attackDir = 'up'
    }
  } else if (attackData.who === 'opponent') {
    opponentPlayer = Players[attackData.attackerTag]
    clanPlayer = Players[attackData.defenderTag]
    if (clanPlayer.townhallLevel < opponentPlayer.townhallLevel) {
      attackDir = 'down'
    } else if (clanPlayer.townhallLevel > opponentPlayer.townhallLevel) {
      attackDir = 'up'
    }
  } else {
    return
  }
  let attackMessage = (attackData.stars > 0) ? emojis.dwasword : emojis.dwaswordbroken
  let defendMessage = (attackData.stars > 0) ? emojis.dwashieldbroken : emojis.dwashield
  if (attackData.fresh) {
    attackMessage += '\uD83C\uDF43' // 🍃
  }
  if (attackDir === 'up') {
    attackMessage += '\uD83D\uDD3A' // 🔺
  } else if (attackDir === 'down') {
    attackMessage += '\uD83D\uDD3B' // 🔻
  }
  attackMessage += '\n' + attackData.attackerTag
  defendMessage += '\n' + attackData.defenderTag
  const embed = new Discord.RichEmbed()
  .setFooter(WarData.stats.clan.tag + ' vs ' + WarData.stats.opponent.tag)
  .setColor(StarColors[attackData.stars])
  .addField(clanPlayer.name, (attackData.who === 'clan') ? attackMessage : defendMessage, true)
  .addField(DiscordTownHallEmojis[clanPlayer.townhallLevel - 1] + ' ' + clanPlayer.mapPosition + ' vs ' + opponentPlayer.mapPosition + ' ' + DiscordTownHallEmojis[opponentPlayer.townhallLevel - 1], emojis.dwastar.repeat(attackData.stars-attackData.newStars) + emojis.dwastarnew.repeat(attackData.newStars) + emojis.dwastarempty.repeat(3 - attackData.stars) + '\n\t\t' + attackData.destructionPercentage + '%', true)
  .addField(opponentPlayer.name, (attackData.who === 'clan') ? defendMessage : attackMessage, true)
  .addField(WarData.stats.clan.name + ' vs ' + WarData.stats.opponent.name, '\u200b')

  WarData.lastReportedAttack = attackData.order
  ClanStorage.setItemSync(warId, WarData)
  getChannelById(channelId, discordChannel => {
    if (discordChannel) discordChannel.send({embed}).then(debug).catch(log)
  })
}

global.discordHitrateMessage = (WarData, channelId) => {
  debug(WarData)
  if (WarData.stats.state === 'inWar' || WarData.stats.state === 'warEnded') {
    let emojis = DiscordChannelEmojis
    const embed = new Discord.RichEmbed()
    .setTitle('Attack Hitrate')
    .setFooter(WarData.stats.clan.tag + ' vs ' + WarData.stats.opponent.tag)
    .setColor(0x007cff)
    
    if (WarData.stats.hitrate.TH9v9.clan.attempt > 0 || WarData.stats.hitrate.TH9v9.opponent.attempt > 0) {
      let clan9v9 = 'n/a'
      if (WarData.stats.hitrate.TH9v9.clan.attempt > 0) clan9v9 = WarData.stats.hitrate.TH9v9.clan.success + '/' + WarData.stats.hitrate.TH9v9.clan.attempt + ' - ' + Math.round(WarData.stats.hitrate.TH9v9.clan.success / WarData.stats.hitrate.TH9v9.clan.attempt * 100, 2) + '%'
      let opponent9v9 = 'n/a'
      if (WarData.stats.hitrate.TH9v9.opponent.attempt > 0) opponent9v9 = WarData.stats.hitrate.TH9v9.opponent.success + '/' + WarData.stats.hitrate.TH9v9.opponent.attempt + ' - ' + Math.round(WarData.stats.hitrate.TH9v9.opponent.success / WarData.stats.hitrate.TH9v9.opponent.attempt * 100, 2) + '%'
      embed.addField(DiscordTownHallEmojis[8] + ' vs ' + DiscordTownHallEmojis[8], clan9v9, true)
      embed.addField(DiscordTownHallEmojis[8] + ' vs ' + DiscordTownHallEmojis[8], opponent9v9, true)
      embed.addBlankField(true)
    }
    if (WarData.stats.hitrate.TH10v10.clan.attempt > 0 || WarData.stats.hitrate.TH10v10.opponent.attempt > 0) {
      let clan10v10 = 'n/a'
      if (WarData.stats.hitrate.TH10v10.clan.attempt > 0) clan10v10 = WarData.stats.hitrate.TH10v10.clan.success + '/' + WarData.stats.hitrate.TH10v10.clan.attempt + ' - ' + Math.round(WarData.stats.hitrate.TH10v10.clan.success / WarData.stats.hitrate.TH10v10.clan.attempt * 100, 2) + '%'
      let opponent10v10 = 'n/a'
      if (WarData.stats.hitrate.TH10v10.opponent.attempt > 0) opponent10v10 = WarData.stats.hitrate.TH10v10.opponent.success + '/' + WarData.stats.hitrate.TH10v10.opponent.attempt + ' - ' + Math.round(WarData.stats.hitrate.TH10v10.opponent.success / WarData.stats.hitrate.TH10v10.opponent.attempt * 100, 2) + '%'
      embed.addField(DiscordTownHallEmojis[9] + ' vs ' + DiscordTownHallEmojis[9], clan10v10, true)
      embed.addField(DiscordTownHallEmojis[9] + ' vs ' + DiscordTownHallEmojis[9], opponent10v10, true)
      embed.addBlankField(true)
    }
    if (WarData.stats.hitrate.TH10v11.clan.attempt > 0 || WarData.stats.hitrate.TH10v11.opponent.attempt > 0) {
      let clan10v11 = 'n/a'
      if (WarData.stats.hitrate.TH10v11.clan.attempt > 0) clan10v11 = WarData.stats.hitrate.TH10v11.clan.success + '/' + WarData.stats.hitrate.TH10v11.clan.attempt + ' - ' + Math.round(WarData.stats.hitrate.TH10v11.clan.success / WarData.stats.hitrate.TH10v11.clan.attempt * 100, 2) + '%'
      let opponent10v11 = 'n/a'
      if (WarData.stats.hitrate.TH10v11.opponent.attempt > 0) opponent10v11 = WarData.stats.hitrate.TH10v11.opponent.success + '/' + WarData.stats.hitrate.TH10v11.opponent.attempt + ' - ' + Math.round(WarData.stats.hitrate.TH10v11.opponent.success / WarData.stats.hitrate.TH10v11.opponent.attempt * 100, 2) + '%'
      embed.addField(DiscordTownHallEmojis[9] + ' vs ' + DiscordTownHallEmojis[10], clan10v11, true)
      embed.addField(DiscordTownHallEmojis[9] + ' vs ' + DiscordTownHallEmojis[10], opponent10v11, true)
      embed.addBlankField(true)
    }
    embed.addField(WarData.stats.clan.name + ' vs ' + WarData.stats.opponent.name, '\u200b')

    getChannelById(channelId, discordChannel => {
      if (discordChannel) discordChannel.send({embed}).then(debug).catch(log)
    })
  } else {
    getChannelById(channelId, discordChannel => {
      if (discordChannel) discordChannel.send('No hitrate stats for this war check back later.').then(debug).catch(log)
    })
  }
}

global.discordStatsMessage = (WarData, channelId) => {
  debug(WarData)
  let emojis = DiscordChannelEmojis
  let extraMessage = ''
  if (WarData.stats.state === 'preparation') {
    extraMessage = '\nWar starts ' + moment(WarData.stats.startTime).fromNow()
  } else if (WarData.stats.state === 'inWar') {
    extraMessage = '\nWar ends ' + moment(WarData.stats.endTime).fromNow()
  } else if (WarData.stats.state === 'warEnded') {
    extraMessage = '\nWar ended ' + moment(WarData.stats.endTime).fromNow()
  }
  const embed = new Discord.RichEmbed()
  .setFooter(WarData.stats.clan.tag + ' vs ' + WarData.stats.opponent.tag)
  .setColor(0x007cff)
  .addField(WarData.stats.clan.attacks + '/' + WarData.stats.clan.memberCount * 2 + ' ' + emojis.dwasword, WarData.stats.clan.destructionPercentage + '%', true)
  .addField(WarData.stats.clan.memberCount + ' v ' + WarData.stats.opponent.memberCount, WarData.stats.clan.stars + ' ' + emojis.dwastarnew + ' vs ' + emojis.dwastarnew + ' ' + WarData.stats.opponent.stars, true)
  .addField(WarData.stats.opponent.attacks + '/' + WarData.stats.opponent.memberCount * 2 + ' ' + emojis.dwasword, WarData.stats.opponent.destructionPercentage + '%', true)
  .addField(WarData.stats.clan.name + ' vs ' + WarData.stats.opponent.name, extraMessage)

  getChannelById(channelId, discordChannel => {
    if (discordChannel) discordChannel.send({embed}).then(debug).catch(log)
  })
}

global.discordReportMessage = (warId, WarData, clanTag, message, channelId) => {
  debug(clanTag)
  let emojis = DiscordChannelEmojis
  let clanPlayer
  let opponentPlayer
  // console.log(WarData)
  // console.log(Clans[clanTag])
  const embed = new Discord.RichEmbed()
  .setTitle(Clans[clanTag].name + ' vs ' + Clans[clanTag].opponent.name)
  .setColor(message.color)
  .addField(message.title, message.body)

  ClanStorage.setItemSync(warId, WarData)
  getChannelById(channelId, discordChannel => {
    if (discordChannel) discordChannel.send({embed}).then(debug).catch(log)
  })
}

let playerReport = (channel, data) => {
  // log(data)

  let embed = new Discord.RichEmbed()
  .setTitle(data.name + ' ' + data.tag)
  .setDescription(data.clan.name + '\n' + data.clan.tag)
  .setThumbnail('https://coc.guide/static/imgs/other/town-hall-' + data.townHallLevel + '.png')
  
  let troopLevels = ''
  let count = 0
  data.troops.forEach(troop => {
    troopLevels += DiscordTroopEmojis[troop.name] + ' ' + troop.level
    if (count > 0 && count % 7 === 0) {
      if (troop.level === troop.maxLevel) {
        troopLevels += '*\n'
      } else {
        troopLevels += '\n'
      }
    } else {
      if (troop.level === troop.maxLevel) {
        troopLevels += '*\u2002'
      } else {
        troopLevels += '\u2002\u2002'
      }
    }
    count++
  })
  embed.addField('Troop Levels', troopLevels.slice(0, troopLevels.length - 2))

  let spellLevels = ''
  count = 0
  data.spells.forEach(spell => {
    spellLevels += DiscordSpellEmojis[spell.name] + ' ' + spell.level
    if (count > 0 && count % 7 === 0) {
      spellLevels += '\n'
    } else {
      if (spell.level === spell.maxLevel) {
        spellLevels +=  '*\u2002'
      } else {
        spellLevels +=  '\u2002\u2002'
      }
    }
    count++
  })
  embed.addField('Spell Levels', spellLevels.slice(0, spellLevels.length - 2))

  let heroLevels = ''
  count = 0
  data.heroes.forEach(hero => {
    heroLevels += DiscordHeroEmojis[hero.name] + ' ' + hero.level
    if (count > 0 && count % 7 === 0) {
      heroLevels += '\n'
    } else {
      if (hero.level === hero.maxLevel) {
        heroLevels +=  '*\u2002'
      } else {
        heroLevels +=  '\u2002\u2002'
      }
    }
    count++
  })
  embed.addField('Hero Levels', heroLevels.slice(0, heroLevels.length - 2))

  channel.send({embed}).then(debug).catch(log)
}

let discordReady = () => {
  let apiRequest = (task, cb) => {
    get.concat({
      url: task.url,
      method: 'GET',
      headers: {
        'authorization': 'Bearer ' + config.coc.apiKey,
        'Cache-Control':'no-cache'
      }
    }, function (err, res, jsonBuffer) {
      cb()
      if (jsonBuffer.length > 0) {
        let data = JSON.parse(jsonBuffer)
        task.done(data)
      } else {
        task.done(false)
      }
    })
  }

  global.apiQueue = async.queue(apiRequest, config.asyncLimit)

  let getCurrentWar = (clanTag, done = () => {}) => {
    apiQueue.push({
      url: COC_API_BASE + '/clans/' + encodeURIComponent(clanTag) + '/currentwar',
      done: done
    })
  }

  let getWarLog = (clanTag, done = () => {}) => {
    apiQueue.push({
      url: COC_API_BASE + '/clans/' + encodeURIComponent(clanTag) + '/warlog',
      done: done
    })
  }

  global.getPlayer = (playerTag, done = () => {}) => {
    playerTag = playerTag.toUpperCase().replace(/O/g, '0')
    if (playerTag.match(/^#[0289PYLQGRJCUV]+$/)) {
      apiQueue.push({
        url: COC_API_BASE + '/players/' + encodeURIComponent(playerTag),
        done: done
      })
    } else {
      done('Invalid Tag')
    }
  }

  async.each(AnnounceClans, (clan, done) => {
    try {
      let newClan = new Clan(clan.tag)
      // console.log(newClan)
      clan.channels.forEach(id => {
        newClan.addChannel(id)
      })
      newClan.fetchCurrentWar(apiQueue, done)
      Clans[newClan.getTag()] = newClan
    } catch (err) {
      if (err === 'missingTag') {
        console.log('Attempted to create a Clan() with no tag.')
      } else if (err === 'emptyTag') {
        console.log('Attempted to create a Clan() with an empty string.')
      } else {
        console.log(err)
      }
    }
  }, function(err) {
    setTimeout(discordReady, 1000 * config.updateInterval)
  })
}

DiscordClient.on('message', message => {
  let messageContent = message.content.trim()
  let prefix = config.commandPrefix
  if (messageContent.slice(0, 1) === prefix) {
    let channelId = message.channel.id
    let splitMessage = messageContent.split(' ')
    if (splitMessage[0].toLowerCase() === prefix + 'info') {
      let announcerStats = getAnnouncerStats()
      const embed = new Discord.RichEmbed()
      .setFooter('Announcing wars since April 29th 2017 (' + moment('2017-04-29').fromNow() + ')')
      .setColor(0x007cff)
      .addField('Instance Owned By', config.owner, true)
      .addField('Node Version', '[' + process.version + '](https://nodejs.org)', true)
      .addField('Discord.JS Version', '[' + Discord.version + '](https://github.com/hydrabolt/discord.js)', true)
      .addField('Tracking Stats', 'Announcing stats for ' + announcerStats.clanCount + ' clan' + ((announcerStats.clanCount != 1) ? 's' : '') + ' across ' + announcerStats.channelCount + ' channel' + ((announcerStats.channelCount != 1) ? 's' : ''))
      .addField('Load Average', os.loadavg(10), true)
      .addField('Process Started', moment().subtract(os.processUptime(), 's').fromNow(), true)
      .addField('Free Memory', Math.round(os.freemem()) + 'MB', true)
      .addField('Clash of Clans War Announcer', 'This is an instance of [Discord CoC War Announcer](https://github.com/spAnser/discord-coc-war-announcer). A node.js discord bot written to monitor the Clash of Clans API and announce war attacks to a discord channel.')

      message.channel.send({embed}).then(debug).catch(log)
    } else if (splitMessage[0].toLowerCase() === prefix + 'help') {
      message.channel.send('1. `' + prefix + 'announce #CLANTAG` Assign a clan to announce in a channel.\n2. `' + prefix + 'unannounce #CLANTAG` Stop a clan from announcing in a channel.\n3. `' + prefix + 'warstats #CLANTAG` Display war stats for a clan that is tracked by The Announcer. If not provided with a clan tag it will display war stats for all clans assigned to the channel the command was run in.\n4. `' + prefix + 'hitrate #CLANTAG` Display hit rate stats for a clan that is tracked by The Announcer. If not provided with a clan tag it will display hit rate stats for all clans assigned to the channel the command was run in.\n5. `' + prefix + 'playerstats #PLAYERTAG` Display player stats for any player tag provided.\n6. `' + prefix + 'info` Display bot information.').then(debug).catch(log)
    } else if (splitMessage[0].toLowerCase() === prefix + 'announce') {
      if (message.member.hasPermission('MANAGE_CHANNELS')) {
        if (splitMessage[1]) {
          let clanTag = splitMessage[1].toUpperCase().replace(/O/g, '0')
          if (clanTag.match(/^#[0289PYLQGRJCUV]+$/)) {
            if (!Clans[clanTag]) {
              let newClan = new Clan(clanTag)
              newClan.addChannel(message.channel.id)
              newClan.fetchCurrentWar(apiQueue)
              Clans[newClan.getTag()] = newClan
            } else {
              Clans[clanTag].addChannel(message.channel.id)
            }
            let announcingIndex = announcingClan(clanTag)
            if (typeof announcingIndex === 'undefined') {
              AnnounceClans.push({
                tag: clanTag,
                channels: [
                  channelId
                ]
              })
              message.channel.send('War announcements for ' + clanTag + ' registered in this channel.').then(debug).catch(log)
            } else {
              if (AnnounceClans[announcingIndex].channels.indexOf(channelId) > -1) {
                message.channel.send('Provided clanTag is already registered to this channel.').then(debug).catch(log)
              } else {
                AnnounceClans[announcingIndex].channels.push(channelId)
                message.channel.send('War announcements for ' + clanTag + ' registered in this channel.').then(debug).catch(log)
              }
            }
            AnnounceClans = cleanArray(AnnounceClans)
            Storage.setItemSync('AnnounceClans', AnnounceClans)
          } else {
            message.channel.send('Please provide a valid clan tag to announce. Valid tag characters are: \n```\n0289PYLQGRJCUV\n```').then(debug).catch(log)
          }
        } else {
          message.channel.send('Please provide a clan tag to start announcements for.\n```\n!announce #clanTag\n```').then(debug).catch(log)
        }
      } else {
        message.channel.send('Someone with the permissions to manage channels needs to run that command.').then(debug).catch(log)
      }
    } else if (splitMessage[0].toLowerCase() === prefix + 'unannounce') {
      if (message.member.hasPermission('MANAGE_CHANNELS')) {
        if (splitMessage[1]) {
          let clanTag = splitMessage[1].toUpperCase().replace(/O/g, '0')
          let announcingIndex = announcingClan(clanTag)
          if (typeof announcingIndex !== 'undefined') {
            let channelIndex = AnnounceClans[announcingIndex].channels.indexOf(channelId)
            if (channelIndex > -1) {
              if (AnnounceClans[announcingIndex].channels.length > 1) {
                let tmpChannels = []
                AnnounceClans[announcingIndex].channels.forEach(cId => {
                  if (cId != channelId) {
                    tmpChannels.push(cId)
                  }
                })
                AnnounceClans[announcingIndex].channels = tmpChannels
              } else {
                let tmpAnnounceClans = []
                Object.keys(AnnounceClans).forEach(aId => {
                  if (aId != announcingIndex) {
                    tmpAnnounceClans[aId] = AnnounceClans[aId]
                  }
                })
                AnnounceClans = tmpAnnounceClans
              }
              message.channel.send('War announcements for ' + clanTag + ' have been stopped in this channel.').then(debug).catch(log)
            } else {
              message.channel.send('War announcements for ' + clanTag + ' were not registered in this channel.').then(debug).catch(log)
            }
            if (Clans[clanTag]) {
              Clans[clanTag].removeChannel(channelId)
            }
          }
          AnnounceClans = cleanArray(AnnounceClans)
          Storage.setItemSync('AnnounceClans', AnnounceClans)
        } else {
          message.channel.send('Please provide a clan tag to stop announcements for.\n```\n!unannounce #clanTag\n```').then(debug).catch(log)
        }
      } else {
        message.channel.send('Someone with the permissions to manage channels needs to run that command.').then(debug).catch(log)
      }
    } else if (splitMessage[0].toLowerCase() === prefix + 'warstats') {
      if (splitMessage[1]) {
        let clanTag = splitMessage[1].toUpperCase().replace(/O/g, '0')
        if (Clans[clanTag]) {
          let WarData = Clans[clanTag].getWarData()
          if (WarData) {
            discordStatsMessage(WarData, channelId)
          } else {
            message.channel.send('War data is missing try again in a little bit. I might still be fetching the data.').then(debug).catch(log)
          }
        } else {
          message.channel.send('I don\'t appear to have any war data for that clan.').then(debug).catch(log)
        }
      } else {
        getChannelClan(channelId, clanTag => {
          let WarData = Clans[clanTag].getWarData()
          if (WarData) {
            discordStatsMessage(WarData, channelId)
          } else {
            message.channel.send('War data is missing try again in a little bit. I might still be fetching the data.').then(debug).catch(log)
          }
        })
      }
    } else if (splitMessage[0].toLowerCase() === prefix + 'hitrate') {
      if (splitMessage[1]) {
        let clanTag = splitMessage[1].toUpperCase().replace(/O/g, '0')
        if (Clans[clanTag]) {
          let clanTag = splitMessage[1]
          let WarData = Clans[clanTag].getWarData()
          if (WarData) {
            discordHitrateMessage(WarData, channelId)
          } else {
            message.channel.send('War data is missing try again in a little bit. I might still be fetching the data.').then(debug).catch(log)
          }
        } else {
          message.channel.send('I don\'t appear to have any war data for that clan.').then(debug).catch(log)
        }
      } else {
        getChannelClan(channelId, clanTag => {
          let WarData = Clans[clanTag].getWarData()
          if (WarData) {
            discordHitrateMessage(WarData, channelId)
          } else {
            message.channel.send('War data is missing try again in a little bit. I might still be fetching the data.').then(debug).catch(log)
          }
        })
      }
    } else if (splitMessage[0].toLowerCase() === prefix + 'playerstats') {
      if (splitMessage[1]) {
        getPlayer(splitMessage[1], data => {
          if (data === 'Invalid Tag') {
            message.channel.send('Please provide a valid player tag to look up. Valid tag characters are: \n```\n0289PYLQGRJCUV\n```').then(debug).catch(log)
          } else if (data && !data.hasOwnProperty('reason')) {
            playerReport(message.channel, data)
          }
        })
      } else {
        message.channel.send('Please provide a player tag to look up.\n```\n!playerstats #playertag\n```').then(debug).catch(log)
      }
    }
  }
})

DiscordClient.on('ready', () => {
  discordReady()
})

DiscordClient.login(config.discord.userToken)
