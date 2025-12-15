import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/trvzb-scheduler-card.js',
    format: 'es',
    sourcemap: !production  // Only enable sourcemaps in development
  },
  plugins: [
    resolve(),
    typescript({
      sourceMap: !production,  // Only enable sourcemaps in development
      inlineSources: !production
    }),
    production && terser({
      format: {
        comments: false
      },
      compress: {
        drop_console: false
      }
    })
  ].filter(Boolean)
};
