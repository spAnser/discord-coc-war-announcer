'use strict'

const get = require('simple-get')

let config = require('./config')

let getCurrentWar = (clanTag, done = () => {}) => {
  get.concat({
    url: 'https://api.clashofclans.com/v1/clans/' + encodeURIComponent(clanTag) + '/currentWar',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + config.API_KEY
    }
  }, function (err, res, jsonBuffer) {
    if (jsonBuffer.length > 0) {
      let data = JSON.parse(jsonBuffer)
      done(data)
    } else {
      done(false)
    }
  })
}

let getWarLog = (clanTag, done = () => {}) => {
  get.concat({
    url: 'https://api.clashofclans.com/v1/clans/' + encodeURIComponent(clanTag) + '/warlog',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + config.API_KEY
    }
  }, function (err, res, jsonBuffer) {
    let data = JSON.parse(jsonBuffer)
    done(data)
  })
}

config.clanTags.forEach(clanTag => {
  getCurrentWar(clanTag, data => {
    console.log(data)
  })
})
