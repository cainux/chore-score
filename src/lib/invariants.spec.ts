import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The design bends around naming Europe/London exactly once (design.md D2), and
// the value of that is entirely in the "once". A second occurrence is how the
// rule starts loosening — first to "one module", then to wherever it is
// convenient — so it is asserted rather than trusted.
//
// The companion half of this invariant, banning local-time accessors, is an
// ESLint rule: it belongs at the call site, where the error can name the fix.
//
// The zone is assembled rather than written out, so this file can scan itself.
const ZONE = ['Europe', 'London'].join('/');

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SCANNED_DIRS = ['src'];
const SCANNED_FILES = ['vite.config.ts', 'vitest.workers.config.ts', 'eslint.config.js'];

async function sourceFiles(): Promise<string[]> {
	const found: string[] = [];
	for (const dir of SCANNED_DIRS) {
		const entries = await readdir(path.join(ROOT, dir), {
			recursive: true,
			withFileTypes: true
		});
		for (const entry of entries) {
			if (!entry.isFile()) continue;
			if (!/\.(ts|js|svelte)$/.test(entry.name)) continue;
			found.push(path.relative(ROOT, path.join(entry.parentPath, entry.name)));
		}
	}
	return [...found, ...SCANNED_FILES];
}

async function read(file: string): Promise<string> {
	return readFile(path.join(ROOT, file), 'utf8');
}

describe('the timezone is named in exactly one place', () => {
	it('scans a source tree that is actually there', async () => {
		const files = await sourceFiles();
		// Guards the tests below from passing vacuously if the globbing breaks.
		expect(files).toContain(path.join('src', 'lib', 'dates.ts'));
	});

	it('quotes the zone in one file only', async () => {
		const files = await sourceFiles();
		const naming: string[] = [];
		for (const file of files) {
			if ((await read(file)).includes(`'${ZONE}'`)) naming.push(file);
		}
		expect(naming).toEqual([path.join('src', 'lib', 'dates.ts')]);
	});

	it('quotes it exactly once within that file', async () => {
		const source = await read(path.join('src', 'lib', 'dates.ts'));
		const occurrences = source.split(`'${ZONE}'`).length - 1;
		expect(occurrences).toBe(1);
	});

	it('passes no other timeZone anywhere', async () => {
		const files = await sourceFiles();
		const offenders: string[] = [];
		for (const file of files) {
			for (const match of (await read(file)).matchAll(/timeZone:\s*'([^']*)'/g)) {
				if (match[1] !== ZONE) offenders.push(`${file}: ${match[1]}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});
