import { L20nIntl } from './shims';

class FTLBase {
  constructor(value, opts) {
    this.value = value;
    this.opts = opts;
  }
  valueOf() {
    return this.value;
  }
}

export class FTLNumber extends FTLBase {
  constructor(value, opts) {
    super(parseFloat(value), opts);
  }
  toString(rc) {
    const nf = rc.ctx._memoizeIntlObject(
      L20nIntl.NumberFormat, rc.lang, this.opts
    );
    return nf.format(this.value);
  }
}

export class FTLDateTime extends FTLBase {
  constructor(value, opts) {
    super(new Date(value), opts);
  }
  toString(rc) {
    const dtf = rc.ctx._memoizeIntlObject(
      L20nIntl.DateTimeFormat, rc.lang, this.opts
    );
    return dtf.format(this.value);
  }
}

export class FTLKeyword extends FTLBase {
  toString() {
    const { name, namespace } = this.value;
    return namespace ? `${namespace}:${name}` : name;
  }
  match(rc, other) {
    const { name, namespace } = this.value;
    if (other instanceof FTLKeyword) {
      return name === other.value.name && namespace === other.value.namespace;
    } else if (namespace) {
      return false;
    } else if (typeof other === 'string') {
      return name === other;
    } else if (other instanceof FTLNumber) {
      const pr = rc.ctx._memoizeIntlObject(
        L20nIntl.PluralRules, rc.lang, other.opts
      );
      return name === pr.select(other.valueOf());
    }
  }
}

export class FTLList extends Array {
  toString(rc) {
    const lf = rc.ctx._memoizeIntlObject(
      L20nIntl.ListFormat, rc.lang // XXX add this.opts
    );
    const elems = this.map(
      elem => elem.toString(rc)
    );
    return lf.format(elems);
  }
  concat(elem) {
    return FTLList.from([...this, elem]);
  }
}

// each builtin takes two arguments:
//  - args = an array of positional args
//  - opts  = an object of key-value args

export default {
  'NUMBER': ([arg], opts) => new FTLNumber(arg.valueOf(), valuesOf(opts)),
  'PLURAL': ([arg], opts) => new FTLNumber(arg.valueOf(), valuesOf(opts)),
  'DATETIME': ([arg], opts) => new FTLDateTime(arg.valueOf(), valuesOf(opts)),
  'LEN': ([arg], opts) => new FTLNumber(arg.valueOf().length, valuesOf(opts)),
  'LIST': (args) => FTLList.from(args),
  'TAKE': ([num, arg]) => FTLList.from(arg.valueOf().slice(0, num.value)),
  'DROP': ([num, arg]) => FTLList.from(arg.valueOf().slice(num.value)),
};

function valuesOf(opts) {
  return Object.keys(opts).reduce(
    (seq, cur) => Object.assign({}, seq, {
      [cur]: opts[cur].valueOf()
    }), {});
}