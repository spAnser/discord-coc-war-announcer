'use strict'

const LOG = true
const DEBUG = false

const crypto = require('crypto')
const util = require('util')

const chalk = require('chalk')
const nodePersist = require('node-persist');
const parseCurrentWar = require('./parseCurrentWar');

global.ClanStorage = nodePersist.create({
  dir: '.node-persist/clan-storage',
  expiredInterval: 1000 * 60 * 60 * 24 * 9 // Cleanup Files older than a week + 2 days for prep / war day.
})
ClanStorage.initSync();

module.exports = function parseCurrentLeague(data, apiQueue, overrideConfig) {
  if (!data || !data.rounds) return;
  data.rounds.forEach((round) => {
    round.warTags.forEach((war) => {
      this.fetchCurrentLeagueWar(apiQueue, war, (data) => {
        if (data.state === 'inWar' && (data.clan.tag === this.tag || data.opponent.tag === this.tag)) {
          // grab the war data and let parseCurrentWar handle it from there.
          parseCurrentWar.bind(this)(data, overrideConfig);
        }
      });
    });
  });
};
