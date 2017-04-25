'use strict'

const crypto = require('crypto')
const util = require('util')

const async = require('async')
const Discord = require('discord.js')
const get = require('simple-get')

const config = require('./config')
const DiscordClient = new Discord.Client()

const COC_API_BASE = 'https://api.clashofclans.com/v1'

let DiscordChannels = {}

let Clans = {}
let Players = {}
let WarData = {}

console.log('https://discordapp.com/oauth2/authorize?client_id=' + config.discord.clientId + '&scope=bot&permissions=134208')

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

let discordAttackMessage = (clanTag, opponentTag, attackData) => {
  console.log(clanTag, attackData)
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
  let attackMessage = ':crossed_swords:'
  let defendMessage = ':shield:'
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
  .addField('[' + clanPlayer.mapPosition + '] vs [' + opponentPlayer.mapPosition + ']', ':star:'.repeat(attackData.stars-attackData.newStars) + ':star2:'.repeat(attackData.newStars) + '\n\t\t  ' + attackData.destructionPercentage + '%', true)
  .addField(opponentPlayer.name, (attackData.who === 'clan') ? defendMessage : attackMessage, true)

  getClanChannel(clanTag, channelId => {
    // DiscordChannels[channelId].sendEmbed(embed)
  })
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
        if (!WarData[warId]) WarData[warId] = { lastReportedAttack: 0 }
        console.log(warId)
        if (data.clan.name) {
          Clans[clanTag] = data.clan.name
        }
        if (data.opponent.name) {
          Clans[opponentTag] = data.opponent.name
        }
        // console.log(data.clan.name ? (data.clan.tag + ' ' + data.clan.name) : data.clan.tag)
        // console.log(data.opponent.name ? (data.opponent.tag + ' ' + data.opponent.name) : data.opponent.tag)
        console.log(data.state)
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
        // console.log(util.inspect(players, { depth: null, colors: true }))
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
        let reportFrom = WarData[warId].lastReportedAttack
        // console.log(util.inspect(attacks.slice(reportFrom), { depth: null, colors: true }))
        attacks.slice(reportFrom).forEach(attack => {
          discordAttackMessage(clanTag, opponentTag, attack)
        })

        if (data.state == 'preparation') {
          console.log('Starts:', data.startTime)
        } else if (data.state == 'inWar') {
          console.log('Ends:', data.endTime)
          // console.log(data.clan.members)
        }
        console.log()
        done()
      }
      // console.log(util.inspect(data, { depth: null, colors: true }))
    })
  })
}

DiscordClient.on('ready', () => {
  DiscordClient.channels.forEach(channel => {
    DiscordChannels[channel.id] = channel
  })
  discordReady()
})

DiscordClient.login(config.discord.userToken)
