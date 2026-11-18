import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const js = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const css = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
if (!js || !css) throw new Error('Build do Vite não encontrado no formato esperado.');
const bundle = fs.readFileSync(path.join(root, 'dist', js[1]), 'utf8');
if (/\bimport\s*\(/.test(bundle)) throw new Error('O HTML portátil exige um único bundle sem imports dinâmicos.');
const styles = fs.readFileSync(path.join(root, 'dist', css[1]), 'utf8');
html = html.replace(js[0], () => `<script type="module">${bundle.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(css[0], () => `<style>${styles}</style>`);
fs.writeFileSync(path.join(root, 'prototipo.html'), html);
console.log(`HTML portátil gerado: prototipo.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
