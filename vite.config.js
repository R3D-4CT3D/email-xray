import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

// Writes THIRD_PARTY_LICENSES.txt next to the build with the license of every npm package that ended up in it.
function thirdPartyLicenses(){
  return {
    name: 'third-party-licenses',
    apply: 'build',
    generateBundle(_, bundle){
      const pkgs = new Map();
      for (const chunk of Object.values(bundle)){
        for (const id of Object.keys(chunk.modules || {}).map(i => i.replace(/^\0/, ''))){
          const m = id.match(/^(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//);
          if (m) pkgs.set(m[2], m[1]);
        }
      }
      let out = 'Third-party code bundled in Email X-Ray\n';
      for (const [name, dir] of [...pkgs].sort()){
        const { version, license } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        const lic = fs.readdirSync(dir).find(n => /^licen[sc]e/i.test(n));
        out += `\n${'='.repeat(72)}\n${name}@${version} (${license})\n${'='.repeat(72)}\n`;
        out += lic ? fs.readFileSync(path.join(dir, lic), 'utf8') : 'No license file shipped; see package.json license field.\n';
      }
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_LICENSES.txt', source: out });
    },
  };
}

export default defineConfig({
  root: 'src',
  // Relative asset paths so the build works under any GitHub Pages subpath.
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [thirdPartyLicenses()],
  test: {
    root: '.',
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
});
