import { copyFile, mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await copyFile('styles.css', 'dist/styles.css');
await writeFile('dist/.nojekyll', '');
