const CSSselect = require('css-select')
const { decode } = new (require('html-entities').AllHtmlEntities)()
const { DomHandler, Parser } = require('htmlparser2')
const ElementType = require('domelementtype')
const map = fn => arr => arr.map(fn)
const isTag = ElementType.isTag

const getText = el => {
  if (isTag(el)) {
    switch (el.name) {
      case 'br': return '\n'
      case 'script':
      case 'style':  return ''
      default: return getTextJoin(el.children)
    }
  }
  if (el.type === ElementType.CDATA) return getTextJoin(el.children)
  if (el.type === ElementType.Text) return el.data
  return ""
}

const getTextJoin = els => els.map(getText).join('')
const toTextStr = el => el ? decode(getText(el)).trim() : ''
const toText = el => Array.isArray(el)
  ? el.map(toTextStr)
  : toTextStr(el)

const textify = el => 'textContent' in el
  || Object.defineProperty(el, 'textContent', { get: () => toTextStr(el) })

const expand = src => {
  let el = src
  while (el) {
    textify(el)
    if (el.children) {
      el.children.forEach(expand)
    }
    el = el.next
  }
  return src
}
const compileAll = map(q => CSSselect.compile(q))
const prepareQuery = (key, selector) => {
  if (typeof selector === 'string') {
    const query = CSSselect.compile(selector)
    return dom => CSSselect[key](query, dom)
  }
  const selectors = compileAll(selector)
  return dom => map(query => CSSselect[key](query, dom), selectors)
}

const parkourFactory = key => selector => {
  const query = prepareQuery(key, selector)
  return (body, opts) => {
    let handler
    const Q = new Promise((s, f) => handler = new DomHandler((err, dom) => {
      if (err) return f(err)
      const res = query(dom)
      return res
        ? s(res)
        : f(Object.assign(Error(`No match for ${selector}`), { dom, body }))
    }))

    const p = new Parser(handler)
    if (typeof body === 'string') {
      p.write(body)
      p.end()
    } else {
      body.pipe(p)
    }

    p.then = (a, b) => Q.then(a, b)
    p.catch = a => Q.catch(a)
    return p
  }
}

const wrap = (action, handler) => selector => {
  const fn = action(selector)
  return async (a, b) => handler(await fn(a, b))
}

const get = parkourFactory('selectOne')
get.all = parkourFactory('selectAll')

const $ = key => (selector, ...args) => {
  const query = CSSselect.compile(selector)
  return (args.length)
    ? CSSselect[key](query, ...args)
    : (...subArgs) => CSSselect[key](query, ...subArgs)
}

module.exports = wrap(get, expand)
module.exports.$ = $('selectOne')
module.exports.$$ = $('selectAll')
module.exports.all = wrap(get.all, elems => elems.forEach(expand))
module.exports.text = wrap(get, toText)
module.exports.all.text = wrap(get.all, map(toText))

module.exports.toText = toText
module.exports.raw = get
module.exports.wrap = wrap
