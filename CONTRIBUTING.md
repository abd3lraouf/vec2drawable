# Contributing to vec2drawable

Thank you for your interest in contributing to `@abd3lraouf/vec2drawable`! We appreciate all contributions, whether it's reporting bugs, suggesting new features, improving documentation, or submitting pull requests.

## Setup for Local Development

To set up the project locally for development, follow these steps:

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/abd3lraouf/vec2drawable.git
   cd vec2drawable
   ```

2. **Install dependencies:**
   We recommend using `bun` for the fastest installation and building, but `npm` and `pnpm` are perfectly supported.
   ```bash
   bun install
   # or
   npm install
   ```

3. **Build the project:**
   Convert the TypeScript source code into the Node JS output:
   ```bash
   bun run build
   # or
   npm run build
   ```
   To actively re-build files during development, use:
   ```bash
   bun run dev
   ```

4. **Run the testing suite:**
   We use Jest for our test suites and rely heavily on snapshot matchers testing Android XML file generation.
   ```bash
   bun run test
   ```
   If your new code knowingly alters the generated XML formats (or fixes a bug where the past XML snapshot was incorrect), you can update the expected snapshots automatically:
   ```bash
   bun run test -- -u
   ```

## Contribution Process

### 1. Creating a Pull Request (PR)
- *Note: Please ensure the standard `NPM_TOKEN` GitHub Secret is configured in the repository settings to allow write/publish access to `@abd3lraouf`.*
- Please ensure you branch off from `master` and give your branch a descriptive title (`fix/color-inheritance`, `feature/recursive-group-transform`, etc)
- Thoroughly test your changes using the local test suite. Add new elements to the `.svg` test fixture files specifically aiming to cover the edge-case your code targets.
- Clearly describe what the PR modifies and provides in the main PR text, including referencing any potential Issue IDs. 

### 2. Code style requirements
We use `prettier` locally to enforce our code styles. Please make sure not to alter major config variables in tsconfig or jest if unrelated.

### 3. Architecture notes
* **`src/svg-to-vd.ts`**: The main parser orchestrating standard SVG XML DOM node mapping to Vector Drawable logical trees.
* **`src/path-converter.ts`**: Pure logic function stripping raw SVG SVG `d` paths and converting formats into proper Android VectorDrawable path representations via formatting and regex.
* **`src/vd-xml-writer.ts`**: Evaluates the TypeScript representations generated into the raw `android:pathData=` `.xml` output formats, wrapping it within the typical `<vector>` parent.

## Issues and Feature Requests

Got a bug report or a feature suggestion?
Check the existing repository Issues carefully to ensure it hasn't been submitted yet. When filing an issue, please describe:
1. The bug and expected behavior
2. Node Environment specs (Node version, Bun/NPM/PNPM version)
3. Provide the specific SVG that causes problems so we can replicate and append it to our fixture test suites.
