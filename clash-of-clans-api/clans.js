'use strict'

const LOG = true
const DEBUG = false

const crypto = require('crypto')
const util = require('util')
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
    if (data && data.reason != 'accessDenied' && data.state != 'notInWar') {
      let sha1 = crypto.createHash('sha1')
      let opponentTag = data.opponent.tag
      sha1.update(this.tag + opponentTag + data.preparationStartTime)
      this.warId = sha1.digest('hex')

      this.WarData = ClanStorage.getItemSync(this.warId)
      if (!this.WarData) this.WarData = { lastReportedAttack: 0, prepDayReported: false, battleDayReported: false, lastHourReported: false, finalMinutesReported: false }
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

      // ClanStorage.setItemSync(this.warId, this.WarData)
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

      let TH9v9 = {
        clan: {
          attempt: 0,
          success: 0
        },
        opponent: {
          attempt: 0,
          success: 0
        }
      }
      let TH10v10 = {
        clan: {
          attempt: 0,
          success: 0
        },
        opponent: {
          attempt: 0,
          success: 0
        }
      }
      let TH10v11 = {
        clan: {
          attempt: 0,
          success: 0
        },
        opponent: {
          attempt: 0,
          success: 0
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
        if (clanPlayer.townhallLevel === 9 && opponentPlayer.townhallLevel === 9) {
          if (attack.who === 'clan') {
            TH9v9.clan.attempt++
          } else if (attack.who === 'opponent') {
            TH9v9.opponent.attempt++
          }
          if (attack.stars === 3) {
            if (attack.who === 'clan') {
              TH9v9.clan.success++
            } else if (attack.who === 'opponent') {
              TH9v9.opponent.success++
            }
          }
        } else if (clanPlayer.townhallLevel === 10) {
          if (opponentPlayer.townhallLevel === 10) {
            if (attack.who === 'clan') {
              TH10v10.clan.attempt++
            } else if (attack.who === 'opponent') {
              TH10v10.opponent.attempt++
            }
            if (attack.stars === 3) {
              if (attack.who === 'clan') {
                TH10v10.clan.success++
              } else if (attack.who === 'opponent') {
                TH10v10.opponent.success++
              }
            }
          } else if (opponentPlayer.townhallLevel === 11) {
            if (attack.who === 'clan') {
              TH10v11.clan.attempt++
            } else if (attack.who === 'opponent') {
              TH10v11.opponent.attempt++
            }
            if (attack.stars >= 2) {
              if (attack.who === 'clan') {
                TH10v11.clan.success++
              } else if (attack.who === 'opponent') {
                TH10v11.opponent.success++
              }
            }
          }
        }
      })

      this.WarData.stats = {
        state: data.state,
        endTime: data.endTime,
        startTime: data.startTime,
        hitrate: {
          TH9v9: TH9v9,
          TH10v10: TH10v10,
          TH10v11: TH10v11
        },
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
          })
        })
      }
      if (!this.WarData.finalMinutesReported && remainingTime < config.finalMinutes * 60 * 1000) {
        getClanChannel(this.tag, channels => {
          channels.forEach(channelId => {
            let message = config.messages.finalMinutes
            this.WarData.finalMinutesReported = true
            discordReportMessage(this.warId, this.WarData, this.tag, message, channelId)
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
    } else if (data && data.reason == 'notInWar') {
      log(chalk.orange.bold(clan.tag.toUpperCase().replace(/O/g, '0') + ' Clan is not currently in war.'))
    } else if (data && data.reason == 'accessDenied') {
      log(chalk.red.bold(clan.tag.toUpperCase().replace(/O/g, '0') + ' War Log is not public'))
    }
  }

  fetchCurrentWar(apiQueue, done = () => {}) {
    apiQueue.push({
      url: COC_API_BASE + '/clans/' + encodeURIComponent(this.tag) + '/currentwar',
      done: (data) => {
        if (!data.reason && !data.error) this.parseCurrentWar(data)
        done()
      }
    })
  }
}
