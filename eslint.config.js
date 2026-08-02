import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// UTC everywhere (design.md D2). A local-time accessor reads the clock of
		// whatever machine happens to be running — in production, a Worker in UTC;
		// in a test, a laptop in whatever zone its owner is in. Both are wrong, and
		// the second hides the first. The UTC accessors (getUTCDay and friends) are
		// deliberately not restricted, and neither is Date.UTC.
		//
		// This applies inside londonParts too: it reads its values from
		// formatToParts, not from any accessor.
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'MemberExpression[property.name=/^(getDate|getDay|getFullYear|getHours|getMilliseconds|getMinutes|getMonth|getSeconds|getTimezoneOffset)$/]',
					message:
						'Local-time accessors are a defect in this codebase — everything is UTC. Use the getUTC* equivalent, or londonParts() if you genuinely need the household wall clock.'
				},
				{
					selector: 'MemberExpression[property.name=/^(toLocaleDateString|toLocaleTimeString)$/]',
					message:
						'Locale/zone-dependent formatting is a defect in this codebase. Format from zone-free date strings, or use londonParts() for the render stamp.'
				}
			]
		}
	}
);
