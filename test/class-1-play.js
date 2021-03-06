'use strict';

var vfile = require('to-vfile');
var report = require('vfile-reporter');
var statistics = require('vfile-statistics');
var glob = require('glob');
var async = require('async');
var unified = require('unified');
var parse = require('rehype-parse');
var select = require('hast-util-select');
var toString = require('hast-util-to-string');
var bail = require('bail');
var trough = require('trough');
var rule = require('unified-lint-rule');

var processor = unified()
  .use(parse, {fragment: true})
  .use(rule('lint:script', script))
  .use(rule('lint:stem', stem))
  .use(rule('lint:title', correctTitle))
  .use([
    ['circle', '1.0. `<circle>` element'],
    ['circle[cx]', '1.1. `cx` attribute on `<circle>`'],
    ['circle[cy]', '1.2. `cy` attribute on `<circle>`'],
    ['circle[r]', '1.3. `r` attribute on `<circle>`'],
    ['rect', '3.0. `<rect>` element'],
    ['rect[x]', '3.1. `x` attribute on `<rect>`'],
    ['rect[y]', '3.2. `y` attribute on `<rect>`'],
    ['rect[width]', '3.3. `width` attribute on `<rect>`'],
    ['rect[height]', '3.4. `height` attribute on `<rect>`'],
    ['line', '4.0. `<line>` element'],
    ['line[x1]', '4.1. `x1` attribute on `<line>`'],
    ['line[y1]', '4.2. `y1` attribute on `<line>`'],
    ['line[x2]', '4.3. `x2` attribute on `<line>`'],
    ['line[y2]', '4.4. `y2` attribute on `<line>`'],
    ['line[stroke-width]', '4.5. `stroke-width` attribute on `<line>`'],
    ['line[stroke]', '4.6. `stroke` attribute on `<line>`'],
    ['polygon', '5.0. `<polygon>` element'],
    ['polygon[points]', '5.1. `points` attribute on `<polygon>`'],
    ['path', '6.0. `<path>` element'],
    ['path[d]', '6.1. `d` attribute on `<path>`'],
    ['text', '7.0. `<text>` element'],
    ['text[x]', '7.1. `x` attribute on `<text>`'],
    ['text[y]', '7.2. `y` attribute on `<text>`'],
    ['text:not(:empty)', '7.3. Content in `<text>` element'],
    ['g', '8.0. `<g>` element'],
    ['g[stroke]', '8.1. `stroke` attribute on `<g>`'],
    ['g[stroke-width]', '8.2. `stroke-width` attribute on `<g>`'],
    ['g > :nth-child(n+2)', '8.3. `<g>` element with at least two children'],
    [':root[viewBox]', '9.0. `viewBox` attribute on `<svg>`'],
    /* These two are not bugged about so people can hand in responsive stuff.
     * [':root[width]', '9.1. `width` attribute on `<svg>`'],
     * [':root[height]', '9.2. `height` attribute on `<svg>`'], */
    ['[fill]', '10.0. `fill` attribute on any element'],
    ['[font-family]', '10.1. `font-family` attribute on any element'],
    ['[font-size]', '10.2. `font-size` attribute on any element'],
    ['[opacity]', '10.3. `opacity` attribute on any element']
  ].map(create));

function create(check, index) {
  var selector = check[0].replace(':root', 'svg');
  return rule('lint:' + index, lint);
  function lint(tree, file) {
    if (!select.select(selector, tree)) {
      file.message(check[1]);
    }
  }
}

function script(tree, file) {
  if (select.select('script', tree)) {
    file.message('Remove your `<script> element');
  }
}

function stem(tree, file) {
  if (file.stem === 'handle') {
    file.message('Use your actual GitHub handle for the file name');
  }
}

function correctTitle(tree, file) {
  var node = select.select('title', tree);
  var val = node && toString(node).trim();
  if (!node) {
    file.message('Add the `<title>` element back!');
  } else if (val === '@handle') {
    file.message('Update your title element with your GitHub handle', node);
  } else if (val.indexOf('@') === -1) {
    file.message('Add an `@` before your GitHub handle', node);
  }
}

var check = trough()
  .use(function (fp, next) {
    vfile.read(fp, next);
  })
  .use(function (file, next) {
    processor.run(processor.parse(file), file, next);
  })
  .use(function (tree, file) {
    return file;
  });

trough()
  .use(glob)
  .use(function (paths, next) {
    return async.map(paths, check.run, next);
  })
  .run('site/class-1-play/*.svg', function (err, files) {
    var stats = statistics(files);

    console.error(report(files));

    if (!err && (stats.fatal || stats.warn)) {
      err = new Error('Problems!');
    }

    bail(err);
  }
);
