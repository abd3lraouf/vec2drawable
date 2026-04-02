# Publishing Guide for vec2drawable

This document details the exact process for publishing updates logic for `@abd3lraouf/vec2drawable` to external package management registries (NPM) and GitHub.

## Pre-Requisites

Before you can publish a new release you must ensure:
1. You have push access to the main `abd3lraouf/vec2drawable` GitHub branch.
2. You hold active Publish/Maintainer credentials for the `@abd3lraouf` npm organization or user scope. 
3. Node NPM registry login is authenticated locally (`npm login`). Ensure you're authenticated with the credentials containing required scopes.

## Publishing Steps (Manual)

Whenever a new stable version is finalized:

### 1. Ensure a Clean Working State & Valid Tests
Always make sure you build clean distributions and that zero tests map any regressions or invalid xml snapshot states:
```bash
bun run build
bun run test
```

### 2. Standard-Version Release Update
This project utilizes [standard-version](https://github.com/conventional-changelog/standard-version) (as originally adopted). It automatically analyzes commits formatting based on `conventional-changelog`, bumps the specific version parameter dynamically in `package.json`, updates our `CHANGELOG.md`, and prepares the commit log/git tags entirely offline.

```bash
# This will execute standard-version (you can also use the local npm script map if desired)
npx standard-version
```

If it expects a specific feature upgrade, bug release, or break, standard version detects semantic prefixes (`feat:`, `fix:`, `chore:`, etc) from the git-history!

### 3. Push Commit and Tags to GitHub
Push the new changelog edits and generated tagging back upstream directly against main:
```bash
git push --follow-tags origin master
```

### 4. Automatic Publishing via GitHub Actions
We have configured a CI pipeline `.github/workflows/publish.yml` that handles publishing to NPM automatically.

When you run `git push --follow-tags`, the pipeline triggers upon detecting any new `v*` tags:
1. It validates the code tests and executes a `bun run build`.
2. It executes `npm publish --access public` utilizing the `NPM_TOKEN` stored in GitHub repository secrets.
3. Automatically maps standard release notes onto GitHub's Release page.

*Note: Please ensure the standard `NPM_TOKEN` GitHub Secret is configured in the repository settings to allow write/publish access to `@abd3lraouf`.*
