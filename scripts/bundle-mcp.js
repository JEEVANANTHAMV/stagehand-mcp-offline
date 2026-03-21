import * as esbuild from 'esbuild';
import { builtinModules } from 'module';
import fs from 'fs';
import path from 'path';

async function bundle() {
    console.log('Bundling MCP server to CJS...');
    
    try {
        await esbuild.build({
            entryPoints: ['src/program.ts'],
            bundle: true,
            platform: 'node',
            target: 'node18',
            outfile: 'dist-bundle/index.cjs',
            format: 'cjs',
            sourcemap: false,
            minify: false,
            alias: {
                'sharp': './scripts/sharp-stub.cjs'
            },
            external: [
                ...builtinModules,
                ...builtinModules.map(m => `node:${m}`),
                'fsevents'
            ],
            banner: {
                js: `
// ESM Polyfills for CJS bundle
const { fileURLToPath } = require('url');
const { dirname } = require('path');
if (typeof __filename === 'undefined') {
    globalThis.__filename = '/snapshot/innosynth-mcp/index.cjs';
    globalThis.__dirname = '/snapshot/innosynth-mcp';
}
if (typeof import.meta === 'undefined') {
    globalThis.import = { meta: { url: 'file:///snapshot/innosynth-mcp/index.cjs' } };
}
`
            },
            define: {
                'process.env.NODE_ENV': '"production"',
                'import.meta.url': '"file:///snapshot/innosynth-mcp/index.cjs"'
            }
        });
        
        // Copy package.json to dist-bundle for pkg to read version
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        fs.writeFileSync('dist-bundle/package.json', JSON.stringify({
            name: pkg.name,
            version: pkg.version,
            type: 'commonjs',
            main: 'index.cjs',
            bin: 'index.cjs'
        }, null, 2));

        console.log('Successfully bundled to dist-bundle/index.cjs');
    } catch (error) {
        console.error('Bundle failed:', error);
        process.exit(1);
    }
}

bundle();
