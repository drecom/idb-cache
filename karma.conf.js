module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],
    files: ['dist/idb-cache.js', 'test/index.js'],
    browsers: ['ChromeHeadless'],
    reporters: ['mocha'],
    singleRun: true,
  })
}