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
            sourcemap: true,
            external: [
                ...builtinModules,
                ...builtinModules.map(m => `node:${m}`),
                'fsevents', // problematic on windows/linux crossing
                'sharp'     // binary dependency
            ],
            loader: {
                '.node': 'copy',
            },
            define: {
                'process.env.NODE_ENV': '"production"'
            }
        });
        
        // Copy package.json to dist-bundle for pkg to read version
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        fs.writeFileSync('dist-bundle/package.json', JSON.stringify({
            name: pkg.name,
            version: pkg.version,
            type: 'commonjs',
            main: 'index.cjs'
        }, null, 2));

        console.log('Successfully bundled to dist-bundle/index.cjs');
    } catch (error) {
        console.error('Bundle failed:', error);
        process.exit(1);
    }
}

bundle();
