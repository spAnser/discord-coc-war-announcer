module.exports = {
  owner: '', // Put your user id here. Try typing \@User#tag to get your id.
  asyncLimit: 5,
  updateInterval: 60 * 2, // 2 Minutes
  commandPrefix: '!',
  coc: {
    apiKey: '',
  },
  discord: {
    clientId: '',
    userToken: ''
  },
  starColors: [
    0xff484e, // 0 Stars
    0xffbc48, // 1 Star
    0xc7ff48, // 2 Stars
    0x4dff48  // 3 Stars
  ],
  finalMinutes: 15,
  messages: {
    prepDay: {
      title: 'War has been declared',
      body: 'The battle begins %date%\n@ %time%',
      color: 0x007cff
    },
    battleDay: {
      title: 'The war has begun!',
      body: 'Attack!',
      color: 0x007cff
    },
    lastHour: {
      title: 'The final hour is upon us!',
      body: 'If you haven\'t made both of your attacks you better get on it.',
      color: 0x007cff
    },
    finalMinutes: {
      title: 'The final minutes are here!',
      body: 'If you haven\'t made both of your attacks you better get on it.',
      color: 0x007cff
    }
  }
}
