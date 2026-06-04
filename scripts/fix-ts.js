const fs = require('fs');
const optHelper = `
/** Safely cast an options value to string (empty string if null/undefined/object). */
const opt = (v: unknown): string => (v != null && typeof v !== "object" ? String(v) : "");

`;

function fixFile(file, replacements) {
    let code = fs.readFileSync(file, 'utf8');
    if (!code.includes('const opt = ')) {
        code = code.replace(/(import .* from "inngest";)/, "$1" + optHelper);
    }
    for (const [search, replace] of replacements) {
        code = code.split(search).join(replace);
    }
    fs.writeFileSync(file, code);
}

fixFile('src/features/executions/components/github/executors/issues-prs.ts', [
    ['config.options?.commentId', 'opt(config.options?.commentId)']
]);

fixFile('src/features/executions/components/github/executors/repository.ts', [
    ['config.options?.newOwner', 'opt(config.options?.newOwner)'],
    ['config.options?.username', 'opt(config.options?.username)'],
    ['config.options?.sha', 'opt(config.options?.sha)']
]);

fixFile('src/features/executions/components/github/executors/search-misc.ts', [
    ['config.options?.codespaceName', 'opt(config.options?.codespaceName)'],
    ['config.options?.secretName', 'opt(config.options?.secretName)'],
    ['body: config.options?.resource || {}', 'body: (config.options?.resource as Record<string, unknown>) || {}']
]);

fixFile('src/features/executions/components/github/executors/workflows.ts', [
    ['encodeURIComponent(config.options.name)', 'encodeURIComponent(opt(config.options.name))']
]);
