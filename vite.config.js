import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// License text of every npm package that ended up in the build. Written to THIRD_PARTY_LICENSES.txt,
// or, for the single-file artifact build, appended to index.html as a comment.
function thirdPartyLicenses({ inline = false } = {}){
  return {
    name: 'third-party-licenses',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle){
      const pkgs = new Map();
      for (const id of this.getModuleIds()){
        const m = id.replace(/^\0/, '').match(/^(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//);
        if (m && !/^(vite|vite-plugin-singlefile)$/.test(m[2])) pkgs.set(m[2], m[1]);
      }
      let out = 'Third-party code bundled in Email X-Ray\n';
      for (const [name, dir] of [...pkgs].sort()){
        const { version, license } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        const lic = fs.readdirSync(dir).find(n => /^licen[sc]e/i.test(n));
        out += `\n${'='.repeat(72)}\n${name}@${version} (${license})\n${'='.repeat(72)}\n`;
        out += lic ? fs.readFileSync(path.join(dir, lic), 'utf8') : 'No license file shipped; see package.json license field.\n';
      }
      if (!inline) return this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_LICENSES.txt', source: out });
      const html = bundle['index.html'];
      html.source = String(html.source) + `\n<!--\n${out.replace(/--/g, '- -')}-->\n`;
    },
  };
}

// `vite build --mode artifact` inlines everything, including the .msg chunk, into one HTML file
// for the claude.ai artifact, which serves a single page.
export default defineConfig(({ mode }) => ({
  root: 'src',
  // Relative asset paths so the build works under any GitHub Pages subpath.
  base: './',
  build: { outDir: mode === 'artifact' ? '../dist-artifact' : '../dist', emptyOutDir: true },
  // ASCII-only output keeps characters like U+FFFD (used by iconv-lite) as escapes, which the artifact publisher requires.
  esbuild: mode === 'artifact' ? { charset: 'ascii' } : undefined,
  plugins: mode === 'artifact' ? [viteSingleFile(), thirdPartyLicenses({ inline: true })] : [thirdPartyLicenses()],
  test: {
    root: '.',
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
}));
