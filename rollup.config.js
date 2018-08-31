import babel from 'rollup-plugin-babel';

const output = [];
const plugins = [];
if(process.env.BROWSER){
  // Browser
  output.push({
    file: 'dist/idb-cache.js',
    format: 'iife',
    intro: '// idb-cache - https://github.com/drecom/idb-cache',
    name: 'IDBCache',
    sourcemap: true,
  });
  // Babel
  plugins.push(
    babel({
      babelrc: false,
      presets: [[
        '@babel/preset-env', {
          targets:{
            browsers:[
              "iOS >= 10.0",
              "Android >= 5.0",
            ]
          }
        }
      ]]
    })
  );
}else{
  // CommonJS Module
  output.push({
    file: 'lib/idb-cache.js',
    format: 'cjs',
  });
  // ES Module
  output.push({
    file: 'lib/idb-cache.mjs',
    format: 'es',
  });
}

export default {
  input: 'tsc/idb-cache.js',
  output: output,
  plugins: plugins,
};