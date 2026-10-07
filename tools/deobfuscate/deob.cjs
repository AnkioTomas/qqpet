const fs = require('fs');
const vm = require('vm');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const [file, decoderName, out] = process.argv.slice(2);
const src = fs.readFileSync(file, 'utf8');

// Evaluate only the string-array prelude: everything before the first statement
// that touches the outside world. Running the whole file is unnecessary and the
// decoder plus rotation IIFE are self-contained.
const ctx = { require: () => ({}), console: { log() {} } };
vm.createContext(ctx);
try { vm.runInContext(src, ctx, { timeout: 5000 }); } catch {}
const decode = ctx[decoderName];
if (typeof decode !== 'function') throw new Error('decoder not found: ' + decoderName);

const ast = parser.parse(src, { sourceType: 'script', allowReturnOutsideFunction: true });

const isLiteralValue = (n) => t.isNumericLiteral(n) || t.isStringLiteral(n) || t.isBooleanLiteral(n);
const propKey = (m) => (m.computed ? (t.isStringLiteral(m.property) ? m.property.value : null) : m.property.name);

function passConstObjects() {
  let changed = false;
  traverse(ast, {
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (!t.isIdentifier(id) || !t.isObjectExpression(init)) return;
      if (!init.properties.length || !init.properties.every((pr) => t.isObjectProperty(pr) && !pr.computed && isLiteralValue(pr.value))) return;
      const binding = p.scope.getBinding(id.name);
      if (!binding || !binding.constant) return;
      const map = new Map(init.properties.map((pr) => [t.isIdentifier(pr.key) ? pr.key.name : pr.key.value, pr.value]));
      let all = true;
      for (const ref of binding.referencePaths) {
        const parent = ref.parentPath;
        if (parent.isMemberExpression({ object: ref.node }) && map.has(propKey(parent.node)) && !parent.parentPath.isAssignmentExpression({ left: parent.node })) {
          parent.replaceWith(t.cloneNode(map.get(propKey(parent.node))));
          changed = true;
        } else all = false;
      }
      if (all) { p.remove(); changed = true; }
    },
  });
  return changed;
}

function passDecoderCalls() {
  let changed = false;
  const isDecoder = (path, name, seen = new Set()) => {
    if (seen.has(name)) return false;
    seen.add(name);
    const b = path.scope.getBinding(name);
    if (!b) return false;
    if (b.path.isFunctionDeclaration() && name === decoderName) return true;
    let init = null;
    if (b.path.isVariableDeclarator()) init = b.path.node.init;
    // `cN = e` assignments inside sequence expressions after `let cN;`
    if (!init) {
      for (const v of b.constantViolations) {
        if (v.isAssignmentExpression() && t.isIdentifier(v.node.right)) init = v.node.right;
      }
    }
    return !!init && t.isIdentifier(init) && isDecoder(b.path, init.name, seen);
  };
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (!t.isIdentifier(c)) return;
      const [a] = p.node.arguments;
      if (!t.isNumericLiteral(a)) return;
      if (!isDecoder(p, c.name)) return;
      const s = decode(a.value, p.node.arguments[1] && p.node.arguments[1].value);
      if (typeof s !== 'string') return;
      p.replaceWith(t.stringLiteral(s));
      changed = true;
    },
  });
  return changed;
}

function passCleanup() {
  let changed = false;
  traverse(ast, {
    UnaryExpression: {
      exit(p) {
        const { operator, argument } = p.node;
        if (operator === '!' && t.isArrayExpression(argument) && !argument.elements.length) { p.replaceWith(t.booleanLiteral(false)); changed = true; }
        else if (operator === '!' && t.isBooleanLiteral(argument)) { p.replaceWith(t.booleanLiteral(!argument.value)); changed = true; }
        else if (operator === '!' && t.isNumericLiteral(argument)) { p.replaceWith(t.booleanLiteral(!argument.value)); changed = true; }
      },
    },
    BinaryExpression(p) {
      const { left, right, operator } = p.node;
      if (t.isStringLiteral(left) && t.isStringLiteral(right) && ['===', '!==', '==', '!='].includes(operator)) {
        const eq = left.value === right.value;
        p.replaceWith(t.booleanLiteral(operator.startsWith('!') ? !eq : eq));
        changed = true;
      }
    },
    'IfStatement|ConditionalExpression'(p) {
      const test = p.node.test;
      if (!t.isBooleanLiteral(test)) return;
      const branch = test.value ? p.node.consequent : p.node.alternate;
      if (p.isIfStatement()) {
        if (!branch) p.remove();
        else if (t.isBlockStatement(branch) && p.parentPath.isBlockStatement() || p.parentPath.isProgram()) p.replaceWithMultiple(t.isBlockStatement(branch) ? branch.body : [branch]);
        else p.replaceWith(branch);
      } else p.replaceWith(branch);
      changed = true;
    },
    MemberExpression(p) {
      const prop = p.node.property;
      if (p.node.computed && t.isStringLiteral(prop) && t.isValidIdentifier(prop.value)) {
        p.node.computed = false;
        p.node.property = t.identifier(prop.value);
        changed = true;
      }
    },
    'ObjectProperty|ObjectMethod|ClassMethod'(p) {
      const k = p.node.key;
      if (p.node.computed && t.isStringLiteral(k) && t.isValidIdentifier(k.value)) {
        p.node.computed = false;
        p.node.key = t.identifier(k.value);
        changed = true;
      }
    },
    NumericLiteral(p) { if (p.node.extra) { delete p.node.extra; } },
    StringLiteral(p) { if (p.node.extra) { delete p.node.extra; } },
  });
  // Drop now-unused decoder aliases.
  traverse(ast, {
    VariableDeclarator(p) {
      if (!t.isIdentifier(p.node.id) || !t.isIdentifier(p.node.init)) return;
      const b = p.scope.getBinding(p.node.id.name);
      if (b && !b.referenced && b.constant) { p.remove(); changed = true; }
    },
  });
  return changed;
}

for (let i = 0; i < 20; i++) {
  const a = passConstObjects();
  const b = passDecoderCalls();
  const c = passCleanup();
  if (!a && !b && !c) break;
}
fs.writeFileSync(out, generate(ast, { jsescOption: { minimal: true } }).code);
