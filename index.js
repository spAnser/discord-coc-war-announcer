'use strict'

console.log('\x1Bc')

const LOG = true
const DEBUG = false

if (!String.prototype.splice) {
  String.prototype.splice = function(start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount))
  }
}
let fixISO = str => {
  return str.splice(13, 0, ':').splice(11, 0, ':').splice(6, 0, '-').splice(4, 0, '-')
}

let log = message => {
  if (LOG) console.log((message) ? message : '')
}

let debug = message => {
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
const storage = require('node-persist')

console.log(chalk.cyan('-'.repeat(17)))
console.log(chalk.cyan(' Discord War Bot '))
console.log(chalk.cyan('-'.repeat(17)))

const config = require('./config')
log(chalk.bold('Server Permission URL:'))
log(chalk.magenta.bold('https://discordapp.com/oauth2/authorize?client_id=' + config.discord.clientId + '&scope=bot&permissions=134208\n'))

const DiscordClient = new Discord.Client()

const COC_API_BASE = 'https://api.clashofclans.com/v1'

let DiscordChannels = {}
let DiscordChannelEmojis = {}
let DiscordTownHallEmojis = [
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

let Clans = {}
let WarIds = {}
let Players = {}

storage.initSync()

const StarColors = config.starColors

let getClanChannel = (clanTag, done) => {
  config.clans.forEach(clan => {
    if (clan.tag.toUpperCase().replace(/O/g, '0') === clanTag) {
      done(clan.channelId)
    }
  })
  return false
}

let getChannelClan = (channelId, done) => {
  config.clans.forEach(clan => {
    if (clan.channelId === channelId) {
      done(clan.tag.toUpperCase().replace(/O/g, '0'))
    }
  })
  return false
}

let discordAttackMessage = (warId, WarData, clanTag, opponentTag, attackData, channelId) => {
  debug(clanTag)
  debug(attackData)
  let emojis = DiscordChannelEmojis[channelId]
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
  const embed = new Discord.RichEmbed()
  .setTitle(Clans[clanTag] + ' vs ' + Clans[opponentTag])
  .setFooter(WarData.stats.clan.tag + ' vs ' + WarData.stats.opponent.tag)
  .setColor(StarColors[attackData.stars])
  .addField(clanPlayer.name, (attackData.who === 'clan') ? attackMessage : defendMessage, true)
  .addField(DiscordTownHallEmojis[clanPlayer.townhallLevel - 1] + ' ' + clanPlayer.mapPosition + ' vs ' + opponentPlayer.mapPosition + ' ' + DiscordTownHallEmojis[opponentPlayer.townhallLevel - 1], emojis.dwastar.repeat(attackData.stars-attackData.newStars) + emojis.dwastarnew.repeat(attackData.newStars) + emojis.dwastarempty.repeat(3 - attackData.stars) + '\n\t\t' + attackData.destructionPercentage + '%', true)
  .addField(opponentPlayer.name, (attackData.who === 'clan') ? defendMessage : attackMessage, true)

  WarData.lastReportedAttack = attackData.order
  storage.setItemSync(warId, WarData)
  DiscordChannels[channelId].sendEmbed(embed)
}

let discordStatsMessage = (warId, WarData, channelId) => {
  debug(warId)
  debug(WarData)
  let emojis = DiscordChannelEmojis[channelId]
  let extraMessage = ''
  if (WarData.stats.state === 'preparation') {
    extraMessage = '\nWar starts ' + moment(WarData.stats.startTime).fromNow()
  } else if (WarData.stats.state === 'inWar') {
    extraMessage = '\nWar ends ' + moment(WarData.stats.endTime).fromNow()
  } else if (WarData.stats.state === 'warEnded') {
    extraMessage = '\nWar ended ' + moment(WarData.stats.endTime).fromNow()
  }
  const embed = new Discord.RichEmbed()
  .setTitle(WarData.stats.clan.name + ' vs ' + WarData.stats.opponent.name)
  .setDescription(extraMessage)
  .setFooter(WarData.stats.clan.tag + ' vs ' + WarData.stats.opponent.tag)
  .setColor(0x007cff)
  .addField(WarData.stats.clan.attacks + '/' + WarData.stats.clan.memberCount * 2 + ' ' + emojis.dwasword, WarData.stats.clan.destructionPercentage + '%', true)
  .addField(WarData.stats.clan.memberCount + ' v ' + WarData.stats.opponent.memberCount, WarData.stats.clan.stars + ' ' + emojis.dwastarnew + ' vs ' + emojis.dwastarnew + ' ' + WarData.stats.opponent.stars, true)
  .addField(WarData.stats.opponent.attacks + '/' + WarData.stats.opponent.memberCount * 2 + ' ' + emojis.dwasword, WarData.stats.opponent.destructionPercentage + '%', true)

  DiscordChannels[channelId].sendEmbed(embed)
}

let discordReportMessage = (warId, WarData, clanTag, opponentTag, message, channelId) => {
  debug(clanTag)
  let emojis = DiscordChannelEmojis[channelId]
  let clanPlayer
  let opponentPlayer
  const embed = new Discord.RichEmbed()
  .setTitle(Clans[clanTag] + ' vs ' + Clans[opponentTag])
  .setColor(message.color)
  .addField(message.title, message.body)

  storage.setItemSync(warId, WarData)
  DiscordChannels[channelId].sendEmbed(embed)
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

  let apiQueue = async.queue(apiRequest, config.asyncLimit)

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

  async.each(config.clans, (clan, done) => {
    findRemoveSync('.node-persist/storage', { age: { seconds: 60 * 60 * 24 * 9 } }) // Cleanup Files older than a week + 2 days for prep / war day.
    getCurrentWar(clan.tag.toUpperCase().replace(/O/g, '0'), data => {
      if (data && data.reason != 'accessDenied' && data.state != 'notInWar') {
        let sha1 = crypto.createHash('sha1')
        let clanTag = data.clan.tag
        let opponentTag = data.opponent.tag
        sha1.update(clanTag + opponentTag + data.preparationStartTime)
        let warId = sha1.digest('hex')
        WarIds[clanTag] = warId
        let WarData = storage.getItemSync(warId)
        if (!WarData) WarData = { lastReportedAttack: 0, prepDayReported: false, battleDayReported: false, lastHourReported: false, finalMinutesReported: false }
        log('War ID: ' + warId + ' ' + clanTag)
        if (data.clan.name) {
          Clans[clanTag] = data.clan.name
        }
        if (data.opponent.name) {
          Clans[opponentTag] = data.opponent.name
        }
        debug(data.clan.name ? (data.clan.tag + ' ' + data.clan.name) : data.clan.tag)
        debug(data.opponent.name ? (data.opponent.tag + ' ' + data.opponent.name) : data.opponent.tag)
        debug('Tag: ' + data.clan.tag)
        debug('State: ' + data.state)
        debug(util.inspect(data, { depth: null, colors: true }))
        WarData.stats = {
          state: data.state,
          endTime: data.endTime,
          startTime: data.startTime,
          clan: {
            tag: data.clan.tag,
            name: data.clan.name,
            stars: data.clan.stars,
            attacks: data.clan.attacks,
            destructionPercentage: data.clan.destructionPercentage,
            memberCount: data.clan.members.length
          },
          opponent: {
            tag: data.opponent.tag,
            name: data.opponent.name,
            stars: data.opponent.stars,
            attacks: data.opponent.attacks,
            destructionPercentage: data.opponent.destructionPercentage,
            memberCount: data.opponent.members.length
          }
        }
        storage.setItemSync(warId, WarData)
        let tmpAttacks = {}
        data.clan.members.forEach(member => {
          Players[member.tag] = member
          if (member.attacks) {
            member.attacks.forEach(attack => {
              tmpAttacks[attack.order] = Object.assign(attack, {who: 'clan'})
            })
          }
        })
        data.opponent.members.forEach(member => {
          Players[member.tag] = member
          if (member.attacks) {
            member.attacks.forEach(attack => {
              tmpAttacks[attack.order] = Object.assign(attack, {who: 'opponent'})
            })
          }
        })
        debug(util.inspect(Players, { depth: null, colors: true }))
        let attacks = []
        let earnedStars = {}
        let attacked = {}
        Object.keys(tmpAttacks).forEach(k => {
          let attack = tmpAttacks[k]
          let newStars = 0
          let fresh = false
          if (!attacked[attack.defenderTag]) {
            fresh = true
            attacked[attack.defenderTag] = true
          }
          if (earnedStars[attack.defenderTag]) {
            newStars = attack.stars - earnedStars[attack.defenderTag]
            if (newStars < 0) newStars = 0
            if (earnedStars[attack.defenderTag] < attack.stars) earnedStars[attack.defenderTag] = attack.stars
          } else {
            earnedStars[attack.defenderTag] = attack.stars
            newStars = attack.stars
          }
          attacks.push(Object.assign(attack, {newStars: newStars, fresh: fresh}))
        })
        // let prepStartTime = new Date(fixISO(data.preparationStartTime))
        let startTime = new Date(fixISO(data.startTime))
        let endTime = new Date(fixISO(data.endTime))
        let prepTime = startTime - new Date()
        let remainingTime = endTime - new Date()
        if (data.state == 'preparation') {
          if (!WarData.prepDayReported) {
            getClanChannel(clanTag, channelId => {
              let message = config.messages.prepDay
              message.body = message.body.replace('%date%', startTime.toDateString()).replace('%time%', startTime.toTimeString())
              WarData.prepDayReported = true
              discordReportMessage(warId, WarData, clanTag, opponentTag, message, channelId)
            })
          }
        }
        if (!WarData.battleDayReported && startTime < new Date()) {
          getClanChannel(clanTag, channelId => {
            let message = config.messages.battleDay
            WarData.battleDayReported = true
            discordReportMessage(warId, WarData, clanTag, opponentTag, message, channelId)
          })
        }
        if (!WarData.lastHourReported && remainingTime < 60 * 60 * 1000) {
          getClanChannel(clanTag, channelId => {
            let message = config.messages.lastHour
            WarData.lastHourReported = true
            discordReportMessage(warId, WarData, clanTag, opponentTag, message, channelId)
          })
        }
        if (!WarData.finalMinutesReported && remainingTime < config.finalMinutes * 60 * 1000) {
          getClanChannel(clanTag, channelId => {
            let message = config.messages.finalMinutes
            WarData.finalMinutesReported = true
            discordReportMessage(warId, WarData, clanTag, opponentTag, message, channelId)
          })
        }
        let reportFrom = WarData.lastReportedAttack
        debug(util.inspect(attacks.slice(reportFrom), { depth: null, colors: true }))
        attacks.slice(reportFrom).forEach(attack => {
          getClanChannel(clanTag, channelId => {
            discordAttackMessage(warId, WarData, clanTag, opponentTag, attack, channelId)
          })
        })
        done()
      } else if (data && data.reason == 'accessDenied') {
        log(chalk.red.bold(clan.tag.toUpperCase().replace(/O/g, '0') + ' War Log is not public'))
        done()
      }
      debug(util.inspect(data, { depth: null, colors: true }))
    })
  }, function(err) {
    setTimeout(discordReady, 1000 * config.updateInterval)
  })
}

DiscordClient.on('message', message => {
  let messageContent = message.content.trim()
  if (messageContent.slice(0, 1) === '!') {
    let splitMessage = messageContent.split(' ')
    if (splitMessage[0].toLowerCase() === '!warstats') {
      let channelId = message.channel.id
      if (splitMessage[1]) {
        if (Clans[splitMessage[1]]) {
          let clanTag = splitMessage[1]
          let warId = WarIds[clanTag]
          let WarData = storage.getItemSync(warId)
          if (WarData) {
            discordStatsMessage(warId, WarData, channelId)
          } else {
            message.channel.sendMessage('War data is missing try again in a little bit. I might still be fetching the data.')
          }
        } else {
          message.channel.sendMessage('I don\'t appear to have any war data for that clan.')
        }
      } else {
        getChannelClan(channelId, clanTag => {
          let warId = WarIds[clanTag]
          let WarData = storage.getItemSync(warId)
          if (WarData) {
            discordStatsMessage(warId, WarData, channelId)
          } else {
            message.channel.sendMessage('War data is missing try again in a little bit. I might still be fetching the data.')
          }
        })
      }
    }
  }
})

DiscordClient.on('ready', () => {
  DiscordClient.channels.forEach(channel => {
    DiscordChannels[channel.id] = channel
    DiscordChannelEmojis[channel.id] = {}
    if (channel.type === 'text') {
      debug(channel.guild.emojis)
      channel.guild.emojis.map(emoji => {
        DiscordChannelEmojis[channel.id][emoji.name] = '<:' + emoji.name + ':' + emoji.id + '>'
      })
      /* Setup Fallback Emojis */
      if (!DiscordChannelEmojis[channel.id]['dwashield']) {
        DiscordChannelEmojis[channel.id]['dwashield'] = '<:dwashield:306956561266507786>'
      }
      if (!DiscordChannelEmojis[channel.id]['dwashieldbroken']) {
        DiscordChannelEmojis[channel.id]['dwashieldbroken'] = '<:dwashieldbroken:306956561073438720>'
      }
      if (!DiscordChannelEmojis[channel.id]['dwasword']) {
        DiscordChannelEmojis[channel.id]['dwasword'] = '<:dwasword:306956560695951362>'
      }
      if (!DiscordChannelEmojis[channel.id]['dwaswordbroken']) {
        DiscordChannelEmojis[channel.id]['dwaswordbroken'] = '<:dwaswordbroken:306956561073307648>'
      }
      if (!DiscordChannelEmojis[channel.id]['dwastarempty']) {
        DiscordChannelEmojis[channel.id]['dwastarempty'] = '<:dwastarempty:306956560779706370>'
      }
      if (!DiscordChannelEmojis[channel.id]['dwastar']) {
        DiscordChannelEmojis[channel.id]['dwastar'] = '<:dwastar:306956561056530442>'
      }
      if (!DiscordChannelEmojis[channel.id]['dwastarnew']) {
        DiscordChannelEmojis[channel.id]['dwastarnew'] = '<:dwastarnew:306956560855465995>'
      }
    }
  })
  discordReady()
})

DiscordClient.login(config.discord.userToken)
