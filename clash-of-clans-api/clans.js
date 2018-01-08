'use strict'

const LOG = true
const DEBUG = false

const crypto = require('crypto')
const util = require('util')

const chalk = require('chalk')
const nodePersist = require('node-persist')

global.ClanStorage = nodePersist.create({
  dir: '.node-persist/clan-storage',
  expiredInterval: 1000 * 60 * 60 * 24 * 9 // Cleanup Files older than a week + 2 days for prep / war day.
})
ClanStorage.initSync()

const COC_API_BASE = 'https://api.clashofclans.com/v1'

module.exports = class Clan {
  constructor(clanTag, options = {}) {
    if (typeof clanTag === 'undefined') throw 'missingTag'
    if (clanTag === '') throw 'emptyTag'

    const defaults = {}

    this.options = Object.assign(defaults, options)
    this.tag = clanTag.toUpperCase().replace(/O/g, '0')
    this.discordChannels = []
  }

  getChannels() {
    return this.discordChannels
  }

  addChannel(id) {
    if (this.discordChannels.indexOf(id) === -1) {
      this.discordChannels.push(id)
    }
  }

  removeChannel(id) {
    let tmpChannels = []
    this.discordChannels.forEach(channel => {
      if (channel != id) {
        tmpChannels.push(channel)
      }
    })
    this.discordChannels = tmpChannels
  }

  getTag() {
    return this.tag
  }

  getWarData() {
    return this.WarData
  }

  parseCurrentWar(data) {
    if (data && !data.reason && data.state != 'notInWar') {
      let sha1 = crypto.createHash('sha1')
      let opponentTag = data.opponent.tag
      sha1.update(this.tag + opponentTag + data.preparationStartTime)
      this.warId = sha1.digest('hex')

      let defaultWarData = { lastReportedAttack: 0, prepDayReported: false, battleDayReported: false, lastHourReported: false, finalMinutesReported: false, endStatsReported: false }
      this.WarData = ClanStorage.getItemSync(this.warId) || {}
      this.WarData = Object.assign(defaultWarData, this.WarData)
      log('War ID: ' + this.warId + ' ' + this.tag)
      if (data.clan.name) {
        this.name = data.clan.name
      }
      if (data.opponent.name) {
        this.opponent = {
          tag: data.opponent.tag,
          name: data.opponent.name
        }
      }
      debug(data.clan.name ? (data.clan.tag + ' ' + data.clan.name) : data.clan.tag)
      debug(data.opponent.name ? (data.opponent.tag + ' ' + data.opponent.name) : data.opponent.tag)
      debug('Tag: ' + data.clan.tag)
      debug('State: ' + data.state)
      debug(data, true)

      let PlayersMissingAtack = []
      // ClanStorage.setItemSync(this.warId, this.WarData)
      let tmpAttacks = {}
      data.clan.members.forEach(member => {
        Players[member.tag] = member
        if (member.attacks) {
          if (member.attacks.length != 2) {
            PlayersMissingAtack.push(member)
          }
          member.attacks.forEach(attack => {
            tmpAttacks[attack.order] = Object.assign(attack, {who: 'clan'})
          })
        } else {
          PlayersMissingAtack.push(member)
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
      let defaultHitRate = {
        clan: {
          attempt: 0,
          success: 0
        },
        opponent: {
          attempt: 0,
          success: 0
        }
      }
      let hitrate = {}
      for (let th = 3; th <= 11; th++) {
        hitrate['TH' + th + 'v' + th] = JSON.parse(JSON.stringify(defaultHitRate))
        if (th === 9) {
          hitrate['TH' + th + 'v' + (th+1)] = JSON.parse(JSON.stringify(defaultHitRate))
        } else if (th === 10) {
          hitrate['TH' + th + 'v' + (th+1)] = JSON.parse(JSON.stringify(defaultHitRate))
        } else if (th === 11) {
          hitrate['TH' + th + 'v' + (th-1)] = JSON.parse(JSON.stringify(defaultHitRate))
        }
      }
      Object.keys(tmpAttacks).forEach(k => {
        let attack = tmpAttacks[k]
        let clanPlayer
        let opponentPlayer
        if (attack.who === 'clan') {
          clanPlayer = Players[attack.attackerTag]
          opponentPlayer = Players[attack.defenderTag]
        } else if (attack.who === 'opponent') {
          opponentPlayer = Players[attack.attackerTag]
          clanPlayer = Players[attack.defenderTag]
        }
        for (let th = 1; th <= 11; th++) {
          if (clanPlayer.townhallLevel === th && opponentPlayer.townhallLevel === th) {
            if (attack.who === 'clan') {
              hitrate['TH' + th + 'v' + th].clan.attempt++
            } else if (attack.who === 'opponent') {
              hitrate['TH' + th + 'v' + th].opponent.attempt++
            }
            if (attack.stars === 3) {
              if (attack.who === 'clan') {
                hitrate['TH' + th + 'v' + th].clan.success++
              } else if (attack.who === 'opponent') {
                hitrate['TH' + th + 'v' + th].opponent.success++
              }
            }
          }
          if (th === 10) {
            if (clanPlayer.townhallLevel === th && opponentPlayer.townhallLevel === th+1 && attack.who === 'clan') {
              hitrate['TH' + th + 'v' + (th+1)].clan.attempt++
              if (attack.stars >= 2) {
                hitrate['TH' + th + 'v' + (th+1)].clan.success++
              }
            } else if (clanPlayer.townhallLevel === th+1 && opponentPlayer.townhallLevel === th && attack.who === 'opponent') {
              hitrate['TH' + th + 'v' + (th+1)].opponent.attempt++
              if (attack.stars >= 2) {
                hitrate['TH' + th + 'v' + (th+1)].opponent.success++
              }
            }
          }
          if (th === 11) {
            if (clanPlayer.townhallLevel === th && opponentPlayer.townhallLevel === th-1 && attack.who === 'clan') {
              hitrate['TH' + th + 'v' + (th-1)].clan.attempt++
              if (attack.stars === 3) {
                hitrate['TH' + th + 'v' + (th-1)].clan.success++
              }
            } else if (clanPlayer.townhallLevel === th-1 && opponentPlayer.townhallLevel === th && attack.who === 'opponent') {
              hitrate['TH' + th + 'v' + (th-1)].opponent.attempt++
              if (attack.stars === 3) {
                hitrate['TH' + th + 'v' + (th-1)].opponent.success++
              }
            }
          }
        }
      })

      this.WarData.stats = {
        state: data.state,
        endTime: data.endTime,
        startTime: data.startTime,
        hitrate: hitrate,
        clan: {
          tag: data.clan.tag,
          name: data.clan.name,
          badge: data.clan.badgeUrls,
          stars: data.clan.stars,
          attacks: data.clan.attacks,
          destructionPercentage: data.clan.destructionPercentage,
          memberCount: data.clan.members.length
        },
        opponent: {
          tag: data.opponent.tag,
          name: data.opponent.name,
          badge: data.opponent.badgeUrls,
          stars: data.opponent.stars,
          attacks: data.opponent.attacks,
          destructionPercentage: data.opponent.destructionPercentage,
          memberCount: data.opponent.members.length
        }
      }
      debug(Players, true)
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
        if (!this.WarData.prepDayReported) {
          getClanChannel(this.tag, channels => {
            channels.forEach(channelId => {
              let message = config.messages.prepDay
              message.body = message.body.replace('%date%', startTime.toDateString()).replace('%time%', startTime.toTimeString())
              this.WarData.prepDayReported = true
              discordReportMessage(this.warId, this.WarData, this.tag, message, channelId)
            })
          })
        }
      }
      if (!this.WarData.battleDayReported && startTime < new Date()) {
        getClanChannel(this.tag, channels => {
          channels.forEach(channelId => {
            let message = config.messages.battleDay
            this.WarData.battleDayReported = true
            discordReportMessage(this.warId, this.WarData, this.tag, message, channelId)
          })
        })
      }
      if (!this.WarData.lastHourReported && remainingTime < 60 * 60 * 1000) {
        getClanChannel(this.tag, channels => {
          channels.forEach(channelId => {
            let message = config.messages.lastHour
            this.WarData.lastHourReported = true
            discordReportMessage(this.warId, this.WarData, this.tag, message, channelId)
            if (PlayersMissingAtack.length > 0) {
              discordMissingAttackMessage(this.tag, channelId, PlayersMissingAtack)
            }
          })
        })
      }
      if (!this.WarData.finalMinutesReported && remainingTime < config.finalMinutes * 60 * 1000) {
        getClanChannel(this.tag, channels => {
          channels.forEach(channelId => {
            let message = config.messages.finalMinutes
            this.WarData.finalMinutesReported = true
            discordReportMessage(this.warId, this.WarData, this.tag, message, channelId)
            if (PlayersMissingAtack.length > 0) {
              discordMissingAttackMessage(this.tag, message, channelId, PlayersMissingAtack)
            }
          })
        })
      }
      let reportFrom = this.WarData.lastReportedAttack
      debug(util.inspect(attacks.slice(reportFrom), { depth: null, colors: true }))
      attacks.slice(reportFrom).forEach(attack => {
        getClanChannel(this.tag, channels => {
          channels.forEach(channelId => {
            discordAttackMessage(this.warId, this.WarData, this.tag, opponentTag, attack, channelId)
          })
        })
      })
      if (!this.WarData.endStatsReported && data.state == 'warEnded') {
        this.WarData.endStatsReported = true
        ClanStorage.setItemSync(this.warId, this.WarData)
        getClanChannel(this.tag, channels => {
          channels.forEach(channelId => {
            discordStatsMessage(this.WarData, channelId)
          })
        })
      }
    }
    if (data) {
      let announcingIndex = announcingClan(this.tag)
      AnnounceClans[announcingIndex].reason = data.reason
      AnnounceClans[announcingIndex].state = data.state

      if (data.state == 'notInWar') {
        log(chalk.yellow.bold(this.tag.toUpperCase().replace(/O/g, '0') + ' Clan is not currently in war.'))
      }
      if (data.reason == 'accessDenied' && !AnnounceClans[announcingIndex].notPublicReported) {
        AnnounceClans[announcingIndex].notPublicReported = true
        getClanChannel(this.tag, channels => {
          channels.forEach(channelId => {
            getChannelById(channelId, discordChannel => {
              if (discordChannel) discordChannel.send(this.tag + '\'s war log is not public.').then(debug).catch(log)
            })
          })
        })
        log(chalk.red.bold(this.tag.toUpperCase().replace(/O/g, '0') + ' War Log is not public'))
      } else if (data.reason != 'accessDenied') {
        AnnounceClans[announcingIndex].notPublicReported = undefined
      }

      AnnounceClans = cleanArray(AnnounceClans)
      Storage.setItemSync('AnnounceClans', AnnounceClans)
    }
  }

  fetchCurrentWar(apiQueue, done = () => {}) {
    apiQueue.push({
      url: COC_API_BASE + '/clans/' + encodeURIComponent(this.tag) + '/currentwar',
      done: (data) => {
        if (!data.error) this.parseCurrentWar(data)
        done()
      }
    })
  }
}
