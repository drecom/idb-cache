module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],
    files: ['dist/browser/idb-cache.js', 'test/index.js'],
    browsers: ['ChromeHeadless'],
    reporters: ['mocha'],
    singleRun: true,
  })
}