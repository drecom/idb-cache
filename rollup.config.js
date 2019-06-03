import babel from 'rollup-plugin-babel';

const output = [];
const plugins = [];
if(process.env.BROWSER){
  // Browser
  output.push({
    file: 'dist/browser/idb-cache.js',
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
    file: 'dist/cjs/idb-cache.js',
    format: 'cjs',
  });
  // ES Module
  output.push({
    file: 'dist/esm/idb-cache.js',
    format: 'es',
  });
}

export default {
  input: 'dist/tsc/idb-cache.js',
  output: output,
  plugins: plugins,
};
