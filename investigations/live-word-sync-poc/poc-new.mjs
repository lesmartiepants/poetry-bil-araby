import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const pocPath = resolve(root, 'poc.js');
const indexPath = resolve(root, 'index.html');
const experimentsPath = resolve(root, 'experiments');

function parseArgs(argumentsList) {
  const options = { base: 'branch-transcript-moras', dryRun: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--dry-run') options.dryRun = true;
    else if (['--id', '--label', '--description', '--base'].includes(argument)) {
      options[argument.slice(2)] = argumentsList[++index];
    } else {
      throw new Error(
        'Usage: npm run poc:new -- --id <kebab-case> --label <label> --description <note> [--base <existing-method>] [--dry-run]'
      );
    }
  }
  if (!/^[a-z][a-z0-9-]*$/.test(options.id || '')) {
    throw new Error('--id must be lowercase kebab-case.');
  }
  if (!options.label?.trim() || !options.description?.trim()) {
    throw new Error('--label and --description are required.');
  }
  return options;
}

function jsString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}

function htmlText(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function profileEntry(source, id) {
  const entryStart = source.indexOf(`  '${id}': {`);
  if (entryStart === -1) throw new Error(`Base profile ${id} was not found in poc.js.`);
  const objectStart = source.indexOf('{', entryStart);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = objectStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        const end = source[index + 1] === ',' ? index + 2 : index + 1;
        return source.slice(entryStart, end);
      }
    }
  }
  throw new Error(`Could not parse base profile ${id}.`);
}

function insertAtMarker(source, marker, addition) {
  if (!source.includes(marker)) throw new Error(`Missing generator marker ${marker}.`);
  return source.replace(marker, `${marker}\n${addition}`);
}

const options = parseArgs(process.argv.slice(2));
const [pocSource, indexSource] = await Promise.all([
  readFile(pocPath, 'utf8'),
  readFile(indexPath, 'utf8'),
]);
const briefPath = resolve(experimentsPath, `${options.id}.md`);

if (pocSource.includes(`'${options.id}'`) || indexSource.includes(`value="${options.id}"`)) {
  throw new Error(`Method ${options.id} is already registered.`);
}
try {
  await access(briefPath);
  throw new Error(`Experiment brief already exists: experiments/${options.id}.md`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const copiedProfile = profileEntry(pocSource, options.base).replace(
  `  '${options.base}':`,
  `  '${options.id}':`
);
const nextPoc = insertAtMarker(
  insertAtMarker(
    insertAtMarker(pocSource, '// POC_NEW_METHODS_ACTIVE', `  '${options.id}',`),
    '// POC_NEW_METHODS_NOTES',
    `  '${options.id}': '${jsString(options.description)}',`
  ),
  '// POC_NEW_METHODS_PROFILES',
  copiedProfile
);
const nextIndex = insertAtMarker(
  indexSource,
  '<!-- POC_NEW_METHODS_OPTIONS -->',
  `            <label><input type="radio" name="mode" value="${options.id}" /> ${htmlText(options.label)}</label>`
);
const brief = `# ${options.label}\n\n## Hypothesis\n\n${options.description}\n\n## Registered baseline\n\nThis profile starts as a copy of \`${options.base}\`. Modify its profile in \`poc.js\` to implement the mechanism, then keep the profile beside \`branch-transcript-moras\` in a captured comparison.\n\n## Falsification\n\nState the exact metric and threshold that would reject this idea before running it.\n`;

if (options.dryRun) {
  console.log(
    JSON.stringify(
      {
        action: 'dry-run',
        id: options.id,
        base: options.base,
        files: ['poc.js', 'index.html', `experiments/${options.id}.md`],
      },
      null,
      2
    )
  );
  process.exit(0);
}

await mkdir(experimentsPath, { recursive: true });
await Promise.all([
  writeFile(pocPath, nextPoc),
  writeFile(indexPath, nextIndex),
  writeFile(briefPath, brief),
]);
console.log(
  `Registered ${options.id}. Next: edit its copied profile, then run npm run poc:compare.`
);
