'use strict'

const LOG = true
const DEBUG = false

const crypto = require('crypto')
const util = require('util')

const chalk = require('chalk')
const nodePersist = require('node-persist')
const parseCurrentWar = require('./parseCurrentWar');
const parseCurrentLeague = require('./parseCurrentLeague');

global.ClanStorage = nodePersist.create({
  dir: '.node-persist/clan-storage',
  expiredInterval: 1000 * 60 * 60 * 24 * 9 // Cleanup Files older than a week + 2 days for prep / war day.
});

ClanStorage.initSync();

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
    this.discordChannels.forEach((channel) => {
      if (channel != id) {
        tmpChannels.push(channel);
      }
    })
    this.discordChannels = tmpChannels;
  }

  getTag() {
    return this.tag;
  }

  getWarData() {
    return this.WarData;
  }

  fetchCurrentLeagueWar(apiQueue, warId, done = () => {}) {
    apiQueue.push({
      url: `${COC_API_BASE}/clanwarleagues/wars/${encodeURIComponent(warId)}`,
      done: (data) => {
        done(data);
      }
    });
  }

  fetchCurrentWar(apiQueue, done = () => {}, overrideConfig = {}) {
    apiQueue.push({
      url: COC_API_BASE + '/clans/' + encodeURIComponent(this.getTag()) + '/currentwar',
      done: (data) => {
        if (!data.error) parseCurrentWar.bind(this)(data, overrideConfig);
        done();
      }
    });
  }

  fetchCurrentLeague(apiQueue, done = () => {}, overrideConfig = {}) {
    overrideConfig = { ...overrideConfig, ...{ availableAttacks: 1 } }
    apiQueue.push({
      url: `${COC_API_BASE}/clans/${encodeURIComponent(this.getTag())}/currentwar/leaguegroup`,
      done: (data) => {
        if (!data.error) parseCurrentLeague.bind(this)(data, apiQueue, overrideConfig);
        done();
      }
    });
  }
};
