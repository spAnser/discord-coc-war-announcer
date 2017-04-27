'use strict'

console.log('\x1Bc')

const LOG = true
const DEBUG = false

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
const get = require('simple-get')
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

let Clans = {}
let Players = {}

storage.initSync()

const StarColors = [
  0xff484e,
  0xffbc48,
  0xc7ff48,
  0x4dff48
]

let getClanChannel = (clanTag, done) => {
  config.clans.forEach(clan => {
    if (clan.tag === clanTag) {
      done(clan.channelId)
    }
  })
  return false
}

let discordAttackMessage = (warId, clanTag, opponentTag, attackData, channelId) => {
  debug(clanTag, attackData)
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
    attackMessage += ':leaves:'
  }
  if (attackDir === 'down') {
    attackMessage += ':small_red_triangle_down:'
  } else if (attackDir === 'up') {
    attackMessage += ':small_red_triangle:'
  }
  const embed = new Discord.RichEmbed()
  .setTitle(Clans[clanTag] + ' vs ' + Clans[opponentTag])
  .setColor(StarColors[2])
  .addField(clanPlayer.name, (attackData.who === 'clan') ? attackMessage : defendMessage, true)
  .addField('[' + clanPlayer.mapPosition + '] vs [' + opponentPlayer.mapPosition + ']', emojis.dwastar.repeat(attackData.stars-attackData.newStars) + emojis.dwastarnew.repeat(attackData.newStars) + emojis.dwastarempty.repeat(3 - attackData.stars) + '\n\t\t  ' + attackData.destructionPercentage + '%', true)
  .addField(opponentPlayer.name, (attackData.who === 'clan') ? defendMessage : attackMessage, true)

  storage.setItemSync(warId,{ lastReportedAttack: attackData.order })
  DiscordChannels[channelId].sendEmbed(embed)
}

let discordReady = () => {
  let apiRequest = (task, cb) => {
    get.concat({
      url: task.url,
      method: 'GET',
      headers: {
        'authorization': 'Bearer ' + config.coc.apiKey
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
    getCurrentWar(clan.tag, data => {
      if (data) {
        let sha1 = crypto.createHash('sha1')
        let clanTag = data.clan.tag
        let opponentTag = data.opponent.tag
        sha1.update(clanTag + opponentTag + data.preparationStartTime)
        let warId = sha1.digest('hex')
        let WarData = storage.getItemSync(warId)
        if (!WarData) WarData = { lastReportedAttack: 0 }
        log(warId)
        if (data.clan.name) {
          Clans[clanTag] = data.clan.name
        }
        if (data.opponent.name) {
          Clans[opponentTag] = data.opponent.name
        }
        debug(data.clan.name ? (data.clan.tag + ' ' + data.clan.name) : data.clan.tag)
        debug(data.opponent.name ? (data.opponent.tag + ' ' + data.opponent.name) : data.opponent.tag)
        log(data.state)
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
        let reportFrom = WarData.lastReportedAttack
        debug(util.inspect(attacks.slice(reportFrom), { depth: null, colors: true }))
        attacks.slice(reportFrom).forEach(attack => {
          getClanChannel(clanTag, channelId => {
            discordAttackMessage(warId, clanTag, opponentTag, attack, channelId)
          })
        })

        if (data.state == 'preparation') {
          log('Starts: ' + data.startTime)
        } else if (data.state == 'inWar') {
          log('Ends: ' + data.endTime)
          debug(data.clan.members)
        }
        log()
        done()
      }
      debug(util.inspect(data, { depth: null, colors: true }))
    })
  }, function(err) {
    setTimeout(discordReady, 1000 * config.updateInterval)
  })
}

DiscordClient.on('ready', () => {
  DiscordClient.channels.forEach(channel => {
    DiscordChannels[channel.id] = channel
    DiscordChannelEmojis[channel.id] = {}
    debug(channel.guild.emojis)
    channel.guild.emojis.map(emoji => {
      DiscordChannelEmojis[channel.id][emoji.name] = '<:' + emoji.name + ':' + emoji.id + '>'
    })
  })
  discordReady()
})

DiscordClient.login(config.discord.userToken)
