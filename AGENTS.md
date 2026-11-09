# hascii

For UI changes, migrations, debugging or package upgrades, read
`node_modules/svelte-ascii-ui/docs/agents/using.md` for the installed version.
Follow its ownership and feedback rules; publishing an issue requires user
approval of the complete draft. If dependencies are missing, read the matching
package documentation before changing kit-specific UI.

Keep image processing browser-local. The server receives only palette identifiers.
Keep renderer mathematics independent of Svelte state and UI components.
Use public slice entry points for cross-slice imports. Do not add FSD layers solely
to satisfy a directory template.

Before finishing changes, run relevant tests and `npm run verify` for migrations.
The first Git commit preserves the original prototype; `outputs/` and `work/`
are local artifacts, not application source after migration.
