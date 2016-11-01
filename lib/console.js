'use strict';

// The console functions are usually asynchronous unless the destination is a file
// 上面如何理解？
// console相关的函数是异步?
// console 如果用文件流的时候是异步的?
// 
// 参考:
// https://github.com/nodejs/node/pull/5133/files
// http://stackoverflow.com/questions/5127532/is-node-js-console-log-asynchronous
// 正解: 除了console的输出对象是文件外, 其他操作都是异步的

const util = require('util');

function Console(stdout, stderr) {
  if (!(this instanceof Console)) {
    return new Console(stdout, stderr);
  }
  if (!stdout || typeof stdout.write !== 'function') {
    throw new TypeError('Console expects a writable stream instance');
  }
  if (!stderr) {
    stderr = stdout;
  } else if (typeof stderr.write !== 'function') {
    throw new TypeError('Console expects writable stream instances');
  }

  var prop = {
    writable: true,
    enumerable: false,
    configurable: true
  };
  prop.value = stdout;
  Object.defineProperty(this, '_stdout', prop);
  prop.value = stderr;
  Object.defineProperty(this, '_stderr', prop);
  prop.value = new Map();
  Object.defineProperty(this, '_times', prop);

  // bind the prototype functions to this Console instance
  var keys = Object.keys(Console.prototype);
  for (var v = 0; v < keys.length; v++) {
    var k = keys[v];
    this[k] = this[k].bind(this);
  }
}


// As of v8 5.0.71.32, the combination of rest param, template string
// and .apply(null, args) benchmarks consistently faster than using
// the spread operator when calling util.format.
Console.prototype.log = function log(...args) {
  this._stdout.write(`${util.format.apply(null, args)}\n`);
};


Console.prototype.info = Console.prototype.log;


Console.prototype.warn = function warn(...args) {
  this._stderr.write(`${util.format.apply(null, args)}\n`);
};


Console.prototype.error = Console.prototype.warn;


Console.prototype.dir = function dir(object, options) {
  options = Object.assign({customInspect: false}, options);
  this._stdout.write(`${util.inspect(object, options)}\n`);
};


Console.prototype.time = function time(label) {
  this._times.set(label, process.hrtime());
};


Console.prototype.timeEnd = function timeEnd(label) {
  const time = this._times.get(label);
  if (!time) {
    process.emitWarning(`No such label '${label}' for console.timeEnd()`);
    return;
  }
  const duration = process.hrtime(time);
  const ms = duration[0] * 1000 + duration[1] / 1e6;
  this.log('%s: %sms', label, ms.toFixed(3));
  this._times.delete(label);
};


Console.prototype.trace = function trace(...args) {
  // TODO probably can to do this better with V8's debug object once that is
  // exposed.
  var err = new Error();
  err.name = 'Trace';
  err.message = util.format.apply(null, args);
  Error.captureStackTrace(err, trace);
  this.error(err.stack);
};


Console.prototype.assert = function assert(expression, ...args) {
  if (!expression) {
    require('assert').ok(false, util.format.apply(null, args));
  }
};


module.exports = new Console(process.stdout, process.stderr);
module.exports.Console = Console;
