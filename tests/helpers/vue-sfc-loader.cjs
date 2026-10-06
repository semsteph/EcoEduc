// Chargeur minimal de composants .vue pour les tests Node (sans Vite) :
// compile le script et le template avec @vue/compiler-sfc, puis convertit
// les imports ES en require CommonJS. Suffisant pour les composants
// Options API du tuteur, qui n'importent que Vue et d'autres .vue.
const fs = require('node:fs');
const Module = require('node:module');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');

function esmToCjs(code) {
  return code
    .replace(/import\s+(\w+)\s*,\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/g,
      (_, def, named, src) => `const ${def} = require(${JSON.stringify(src)}).default;\nconst {${named.replace(/\s+as\s+/g, ': ')}} = require(${JSON.stringify(src)});`)
    .replace(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/g,
      (_, named, src) => `const {${named.replace(/\s+as\s+/g, ': ')}} = require(${JSON.stringify(src)});`)
    .replace(/import\s+(\w+)\s+from\s*['"]([^'"]+)['"];?/g,
      (_, def, src) => `const ${def} = require(${JSON.stringify(src)}).default;`)
    .replace(/export\s+default\s+/, 'module.exports.default = ')
    .replace(/export\s*\{([^}]*)\};?/g, (_, names) => names
      .split(',').map((n) => n.trim()).filter(Boolean)
      .map((n) => `module.exports.${n} = ${n};`).join('\n'))
    .replace(/export\s+function\s+(\w+)/g, 'module.exports.$1 = function $1');
}

function compileSfc(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { descriptor, errors } = parse(source, { filename });
  if (errors.length) throw errors[0];

  const script = compileScript(descriptor, { id: filename });
  const template = compileTemplate({
    source: descriptor.template.content,
    filename,
    id: filename,
    compilerOptions: { mode: 'module' },
  });
  if (template.errors.length) throw new Error(`${filename}: ${template.errors.join('\n')}`);

  return `${esmToCjs(script.content)}
${esmToCjs(template.code)}
module.exports.default.render = module.exports.render;
`;
}

require.extensions['.vue'] = function loadVue(module, filename) {
  module._compile(compileSfc(filename), filename);
};

module.exports = { compileSfc, Module };
