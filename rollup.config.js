import babel from 'rollup-plugin-babel';

export default {
  input: 'dist/idb-cache.js',
  output: {
    intro: '/* @author Drecom Co.,Ltd. http://www.drecom.co.jp/ */',
    file: 'dist/idb-cache.js',
    format: 'umd',
    name: 'IDBCache',
    sourcemap: true,
  },
  plugins: [
    babel({
      babelrc: false,
      presets: ['es2015-rollup']
    })
  ],
};