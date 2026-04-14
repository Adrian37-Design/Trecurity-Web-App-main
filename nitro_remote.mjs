import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import http from 'node:http';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import nodeCrypto, { createHash } from 'node:crypto';
import * as cheerio from 'cheerio/lib/slim';
import { promises, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import morgan from 'morgan';
import * as jose from 'jose';
import require$$1 from 'crypto';
import pkg_lru from 'lru-cache'; const LRUCache = pkg_lru.LRUCache || pkg_lru;
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { FilterXSS } from 'xss';
import { ipxFSStorage, ipxHttpStorage, createIPX, createIPXH3Handler } from 'ipx';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const IM_RE = /\?/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
const ENC_ENC_SLASH_RE = /%252f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function encodePath(text) {
  return encode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F").replace(AMPERSAND_RE, "%26").replace(PLUS_RE, "%2B");
}
function encodeParam(text) {
  return encodePath(text).replace(SLASH_RE, "%2F");
}
function decode$1(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$1(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    return input;
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const trimmed = input.slice(_base.length);
  return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

function parse$1(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = {};
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$2(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c$1=class c{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c$1.prototype,i$1.prototype),Object.assign(c$1.prototype,l$1.prototype),c$1}function m(...n){return function(...e){for(const t of n)t(...e);}}const g=_();class A extends g{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function useBase(base, handler) {
  base = withoutTrailingSlash(base);
  if (!base || base === "/") {
    return handler;
  }
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _path = event._path || event.node.req.url || "/";
    event._path = withoutBase(event.path || "/", base);
    event.node.req.url = event._path;
    try {
      return await handler(event);
    } finally {
      event._path = event.node.req.url = _path;
    }
  });
}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function parse(multipartBodyBuffer, boundary) {
  let lastline = "";
  let state = 0 /* INIT */;
  let buffer = [];
  const allParts = [];
  let currentPartHeaders = [];
  for (let i = 0; i < multipartBodyBuffer.length; i++) {
    const prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null;
    const currByte = multipartBodyBuffer[i];
    const newLineChar = currByte === 10 || currByte === 13;
    if (!newLineChar) {
      lastline += String.fromCodePoint(currByte);
    }
    const newLineDetected = currByte === 10 && prevByte === 13;
    if (0 /* INIT */ === state && newLineDetected) {
      if ("--" + boundary === lastline) {
        state = 1 /* READING_HEADERS */;
      }
      lastline = "";
    } else if (1 /* READING_HEADERS */ === state && newLineDetected) {
      if (lastline.length > 0) {
        const i2 = lastline.indexOf(":");
        if (i2 > 0) {
          const name = lastline.slice(0, i2).toLowerCase();
          const value = lastline.slice(i2 + 1).trim();
          currentPartHeaders.push([name, value]);
        }
      } else {
        state = 2 /* READING_DATA */;
        buffer = [];
      }
      lastline = "";
    } else if (2 /* READING_DATA */ === state) {
      if (lastline.length > boundary.length + 4) {
        lastline = "";
      }
      if ("--" + boundary === lastline) {
        const j = buffer.length - lastline.length;
        const part = buffer.slice(0, j - 1);
        allParts.push(process$1(part, currentPartHeaders));
        buffer = [];
        currentPartHeaders = [];
        lastline = "";
        state = 3 /* READING_PART_SEPARATOR */;
      } else {
        buffer.push(currByte);
      }
      if (newLineDetected) {
        lastline = "";
      }
    } else if (3 /* READING_PART_SEPARATOR */ === state && newLineDetected) {
      state = 1 /* READING_HEADERS */;
    }
  }
  return allParts;
}
function process$1(data, headers) {
  const dataObj = {};
  const contentDispositionHeader = headers.find((h) => h[0] === "content-disposition")?.[1] || "";
  for (const i of contentDispositionHeader.split(";")) {
    const s = i.split("=");
    if (s.length !== 2) {
      continue;
    }
    const key = (s[0] || "").trim();
    if (key === "name" || key === "filename") {
      const _value = (s[1] || "").trim().replace(/"/g, "");
      dataObj[key] = Buffer.from(_value, "latin1").toString("utf8");
    }
  }
  const contentType = headers.find((h) => h[0] === "content-type")?.[1] || "";
  if (contentType) {
    dataObj.type = contentType;
  }
  dataObj.data = Buffer.from(data);
  return dataObj;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function getRouterParams(event, opts = {}) {
  let params = event.context.params || {};
  if (opts.decode) {
    params = { ...params };
    for (const key in params) {
      params[key] = decode$1(params[key]);
    }
  }
  return params;
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}
function getRequestIP(event, opts = {}) {
  if (event.context.clientAddress) {
    return event.context.clientAddress;
  }
  if (opts.xForwardedFor) {
    const xForwardedFor = getRequestHeader(event, "x-forwarded-for")?.split(",").shift()?.trim();
    if (xForwardedFor) {
      return xForwardedFor;
    }
  }
  if (event.node.req.socket.remoteAddress) {
    return event.node.req.socket.remoteAddress;
  }
}

const RawBodySymbol = Symbol.for("h3RawBody");
const ParsedBodySymbol = Symbol.for("h3ParsedBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !String(event.node.req.headers["transfer-encoding"] ?? "").split(",").map((e) => e.trim()).filter(Boolean).includes("chunked")) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
async function readBody(event, options = {}) {
  const request = event.node.req;
  if (hasProp(request, ParsedBodySymbol)) {
    return request[ParsedBodySymbol];
  }
  const contentType = request.headers["content-type"] || "";
  const body = await readRawBody(event);
  let parsed;
  if (contentType === "application/json") {
    parsed = _parseJSON(body, options.strict ?? true);
  } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
    parsed = _parseURLEncodedBody(body);
  } else if (contentType.startsWith("text/")) {
    parsed = body;
  } else {
    parsed = _parseJSON(body, options.strict ?? false);
  }
  request[ParsedBodySymbol] = parsed;
  return parsed;
}
async function readMultipartFormData(event) {
  const contentType = getRequestHeader(event, "content-type");
  if (!contentType || !contentType.startsWith("multipart/form-data")) {
    return;
  }
  const boundary = contentType.match(/boundary=([^;]*)(;|$)/i)?.[1];
  if (!boundary) {
    return;
  }
  const body = await readRawBody(event, false);
  if (!body) {
    return;
  }
  return parse(body, boundary);
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}
function _parseJSON(body = "", strict) {
  if (!body) {
    return void 0;
  }
  try {
    return destr(body, { strict });
  } catch {
    throw createError$1({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid JSON body"
    });
  }
}
function _parseURLEncodedBody(body) {
  const form = new URLSearchParams(body);
  const parsedForm = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of form.entries()) {
    if (hasProp(parsedForm, key)) {
      if (!Array.isArray(parsedForm[key])) {
        parsedForm[key] = [parsedForm[key]];
      }
      parsedForm[key].push(value);
    } else {
      parsedForm[key] = value;
    }
  }
  return parsedForm;
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies(event) {
  return parse$1(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$2(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function deleteCookie(event, name, serializeOptions) {
  setCookie(event, name, "", {
    ...serializeOptions,
    maxAge: 0
  });
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    appendResponseHeader(event, name, value);
  }
}
const appendHeaders = appendResponseHeaders;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

function resolveCorsOptions(options = {}) {
  const defaultOptions = {
    origin: "*",
    methods: "*",
    allowHeaders: "*",
    exposeHeaders: "*",
    credentials: false,
    maxAge: false,
    preflight: {
      statusCode: 204
    }
  };
  return defu(options, defaultOptions);
}
function isPreflightRequest(event) {
  const origin = getRequestHeader(event, "origin");
  const accessControlRequestMethod = getRequestHeader(
    event,
    "access-control-request-method"
  );
  return event.method === "OPTIONS" && !!origin && !!accessControlRequestMethod;
}
function isCorsOriginAllowed(origin, options) {
  const { origin: originOption } = options;
  if (!origin || !originOption || originOption === "*" || originOption === "null") {
    return true;
  }
  if (Array.isArray(originOption)) {
    return originOption.some((_origin) => {
      if (_origin instanceof RegExp) {
        return _origin.test(origin);
      }
      return origin === _origin;
    });
  }
  return originOption(origin);
}
function createOriginHeaders(event, options) {
  const { origin: originOption } = options;
  const origin = getRequestHeader(event, "origin");
  if (!origin || !originOption || originOption === "*") {
    return { "access-control-allow-origin": "*" };
  }
  if (typeof originOption === "string") {
    return { "access-control-allow-origin": originOption, vary: "origin" };
  }
  return isCorsOriginAllowed(origin, options) ? { "access-control-allow-origin": origin, vary: "origin" } : {};
}
function createMethodsHeaders(options) {
  const { methods } = options;
  if (!methods) {
    return {};
  }
  if (methods === "*") {
    return { "access-control-allow-methods": "*" };
  }
  return methods.length > 0 ? { "access-control-allow-methods": methods.join(",") } : {};
}
function createCredentialsHeaders(options) {
  const { credentials } = options;
  if (credentials) {
    return { "access-control-allow-credentials": "true" };
  }
  return {};
}
function createAllowHeaderHeaders(event, options) {
  const { allowHeaders } = options;
  if (!allowHeaders || allowHeaders === "*" || allowHeaders.length === 0) {
    const header = getRequestHeader(event, "access-control-request-headers");
    return header ? {
      "access-control-allow-headers": header,
      vary: "access-control-request-headers"
    } : {};
  }
  return {
    "access-control-allow-headers": allowHeaders.join(","),
    vary: "access-control-request-headers"
  };
}
function createExposeHeaders(options) {
  const { exposeHeaders } = options;
  if (!exposeHeaders) {
    return {};
  }
  if (exposeHeaders === "*") {
    return { "access-control-expose-headers": exposeHeaders };
  }
  return { "access-control-expose-headers": exposeHeaders.join(",") };
}
function appendCorsPreflightHeaders(event, options) {
  appendHeaders(event, createOriginHeaders(event, options));
  appendHeaders(event, createCredentialsHeaders(options));
  appendHeaders(event, createExposeHeaders(options));
  appendHeaders(event, createMethodsHeaders(options));
  appendHeaders(event, createAllowHeaderHeaders(event, options));
}
function appendCorsHeaders(event, options) {
  appendHeaders(event, createOriginHeaders(event, options));
  appendHeaders(event, createCredentialsHeaders(options));
  appendHeaders(event, createExposeHeaders(options));
}

function handleCors(event, options) {
  const _options = resolveCorsOptions(options);
  if (isPreflightRequest(event)) {
    appendCorsPreflightHeaders(event, options);
    sendNoContent(event, _options.preflight.statusCode);
    return true;
  }
  appendCorsHeaders(event, options);
  return false;
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  if (!isEventHandler(input)) {
    console.warn(
      "[h3] Implicit event handler conversion is deprecated. Use `eventHandler()` or `fromNodeMiddleware()` to define event handlers.",
      _route && _route !== "/" ? `
     Route: ${_route}` : "",
      `
     Handler: ${input}`
    );
  }
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _reqPath = event._path || event.node.req.url || "/";
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler, void 0, path);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$1=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch$1 = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$1;
const AbortController = globalThis.AbortController || i;
const ofetch = createFetch({ fetch: fetch$1, Headers: Headers$1, AbortController });
const $fetch = ofetch;

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$2 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$2,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

const DRIVER_NAME$1 = "lru-cache";
const unstorage_47drivers_47lru_45cache = defineDriver((opts = {}) => {
  const cache = new LRUCache({
    max: 1e3,
    sizeCalculation: opts.maxSize || opts.maxEntrySize ? (value, key) => {
      return key.length + byteLength(value);
    } : void 0,
    ...opts
  });
  return {
    name: DRIVER_NAME$1,
    options: opts,
    getInstance: () => cache,
    hasItem(key) {
      return cache.has(key);
    },
    getItem(key) {
      return cache.get(key) ?? null;
    },
    getItemRaw(key) {
      return cache.get(key) ?? null;
    },
    setItem(key, value) {
      cache.set(key, value);
    },
    setItemRaw(key, value) {
      cache.set(key, value);
    },
    removeItem(key) {
      cache.delete(key);
    },
    getKeys() {
      return [...cache.keys()];
    },
    clear() {
      cache.clear();
    },
    dispose() {
      cache.clear();
    }
  };
});
function byteLength(value) {
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.byteLength(value);
    } catch {
    }
  }
  try {
    return typeof value === "string" ? value.length : JSON.stringify(value).length;
  } catch {
  }
  return 0;
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage$1 = createStorage({});

storage$1.mount('/assets', assets$1);

storage$1.mount('#rate-limiter-storage', unstorage_47drivers_47lru_45cache({"driver":"lruCache"}));
storage$1.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage$1, base) : storage$1;
}

function serialize$1(o){return typeof o=="string"?`'${o}'`:new c().serialize(o)}const c=/*@__PURE__*/function(){class o{#t=new Map;compare(t,r){const e=typeof t,n=typeof r;return e==="string"&&n==="string"?t.localeCompare(r):e==="number"&&n==="number"?t-r:String.prototype.localeCompare.call(this.serialize(t,true),this.serialize(r,true))}serialize(t,r){if(t===null)return "null";switch(typeof t){case "string":return r?t:`'${t}'`;case "bigint":return `${t}n`;case "object":return this.$object(t);case "function":return this.$function(t)}return String(t)}serializeObject(t){const r=Object.prototype.toString.call(t);if(r!=="[object Object]")return this.serializeBuiltInType(r.length<10?`unknown:${r}`:r.slice(8,-1),t);const e=t.constructor,n=e===Object||e===void 0?"":e.name;if(n!==""&&globalThis[n]===e)return this.serializeBuiltInType(n,t);if(typeof t.toJSON=="function"){const i=t.toJSON();return n+(i!==null&&typeof i=="object"?this.$object(i):`(${this.serialize(i)})`)}return this.serializeObjectEntries(n,Object.entries(t))}serializeBuiltInType(t,r){const e=this["$"+t];if(e)return e.call(this,r);if(typeof r?.entries=="function")return this.serializeObjectEntries(t,r.entries());throw new Error(`Cannot serialize ${t}`)}serializeObjectEntries(t,r){const e=Array.from(r).sort((i,a)=>this.compare(i[0],a[0]));let n=`${t}{`;for(let i=0;i<e.length;i++){const[a,l]=e[i];n+=`${this.serialize(a,true)}:${this.serialize(l)}`,i<e.length-1&&(n+=",");}return n+"}"}$object(t){let r=this.#t.get(t);return r===void 0&&(this.#t.set(t,`#${this.#t.size}`),r=this.serializeObject(t),this.#t.set(t,r)),r}$function(t){const r=Function.prototype.toString.call(t);return r.slice(-15)==="[native code] }"?`${t.name||""}()[native]`:`${t.name}(${t.length})${r.replace(/\s*\n\s*/g,"")}`}$Array(t){let r="[";for(let e=0;e<t.length;e++)r+=this.serialize(t[e]),e<t.length-1&&(r+=",");return r+"]"}$Date(t){try{return `Date(${t.toISOString()})`}catch{return "Date(null)"}}$ArrayBuffer(t){return `ArrayBuffer[${new Uint8Array(t).join(",")}]`}$Set(t){return `Set${this.$Array(Array.from(t).sort((r,e)=>this.compare(r,e)))}`}$Map(t){return this.serializeObjectEntries("Map",t.entries())}}for(const s of ["Error","RegExp","URL"])o.prototype["$"+s]=function(t){return `${s}(${t})`};for(const s of ["Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join(",")}]`};for(const s of ["BigInt64Array","BigUint64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join("n,")}${t.length>0?"n":""}]`};return o}();

function isEqual(object1, object2) {
  if (object1 === object2) {
    return true;
  }
  if (serialize$1(object1) === serialize$1(object2)) {
    return true;
  }
  return false;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

function hash$1(input) {
  return digest(serialize$1(input));
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {
  "nuxt": {}
};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "c38317ee-a7f3-4261-92b4-76ac348e7385",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "RECAPTCHA_CLIENT_SITE_KEY": "6LfB-UMsAAAAAErpo7GNwefulO-wNmTI6HpEZ8td",
    "jwtAppTokenSecret": "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318"
  },
  "DATABASE_URL": "mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity",
  "SMTP_HOST": "mail.privateemail.com",
  "SMTP_PORT": "587",
  "SMTP_USER": "info@trecurity.com",
  "SMTP_PASSWORD": "%Gj6R8sKAdKXqeE",
  "jwtAppTokenSecret": "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318",
  "jwtControllerTokenSecret": "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318",
  "private": {
    "basicAuth": false
  },
  "security": {
    "headers": {
      "crossOriginResourcePolicy": "same-origin",
      "crossOriginOpenerPolicy": "same-origin-allow-popups",
      "crossOriginEmbedderPolicy": "unsafe-none",
      "contentSecurityPolicy": {
        "base-uri": [
          "'none'"
        ],
        "font-src": [
          "'self'",
          "https:",
          "data:"
        ],
        "form-action": [
          "'self'"
        ],
        "frame-ancestors": [
          "'self'"
        ],
        "img-src": [
          "'self'",
          "data:",
          "https://*.openstreetmap.org",
          "https://*.tile.openstreetmap.org"
        ],
        "object-src": [
          "'none'"
        ],
        "script-src-attr": [
          "'self'",
          "'unsafe-inline'"
        ],
        "style-src": [
          "'self'",
          "https:",
          "'unsafe-inline'"
        ],
        "script-src": [
          "'self'",
          "'unsafe-inline' https://*.google.com https://www.gstatic.com https://storage.googleapis.com https://*.paypal.com https://www.googletagmanager.com https://www.google-analytics.com https://www.pagespeed-mod.com"
        ],
        "upgrade-insecure-requests": false,
        "connect-src": [
          "'self'",
          "https://*.openstreetmap.org",
          "https://*.tile.openstreetmap.org",
          "https://*.google.com",
          "https://www.google.com",
          "https://www.gstatic.com"
        ]
      },
      "originAgentCluster": "?1",
      "referrerPolicy": "no-referrer",
      "strictTransportSecurity": false,
      "xContentTypeOptions": "nosniff",
      "xDNSPrefetchControl": "off",
      "xDownloadOptions": "noopen",
      "xFrameOptions": false,
      "xPermittedCrossDomainPolicies": "none",
      "xXSSProtection": "0",
      "permissionsPolicy": {
        "camera": [
          "'none'"
        ],
        "display-capture": [],
        "fullscreen": [],
        "geolocation": [
          "'self'"
        ],
        "microphone": [
          "'none'"
        ]
      }
    },
    "requestSizeLimiter": {
      "maxRequestSizeInBytes": 2000000,
      "maxUploadFileRequestInBytes": 8000000,
      "throwError": true
    },
    "rateLimiter": {
      "tokensPerInterval": 150,
      "interval": 300000,
      "headers": false,
      "driver": {
        "name": "lruCache"
      },
      "throwError": true
    },
    "xssValidator": {
      "methods": [
        "GET",
        "POST"
      ],
      "throwError": true
    },
    "corsHandler": {
      "origin": "http://localhost:3000",
      "methods": [
        "GET",
        "HEAD",
        "PUT",
        "PATCH",
        "POST",
        "DELETE"
      ],
      "preflight": {
        "statusCode": 204
      }
    },
    "allowedMethodsRestricter": {
      "methods": "*",
      "throwError": true
    },
    "hidePoweredBy": true,
    "enabled": true,
    "csrf": false,
    "nonce": true,
    "removeLoggers": {
      "external": [],
      "consoleType": [
        "log",
        "debug"
      ],
      "include": [
        {},
        {}
      ],
      "exclude": [
        {},
        {}
      ]
    },
    "ssg": {
      "meta": true,
      "hashScripts": true,
      "hashStyles": false
    },
    "sri": true
  },
  "ipx": {
    "baseURL": "/_ipx",
    "alias": {},
    "fs": {
      "dir": "../public"
    },
    "http": {
      "domains": []
    }
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze(klona(appConfig));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
function executeAsync(function_) {
  const restores = [];
  for (const leaveHandler of asyncHandlers) {
    const restore2 = leaveHandler();
    if (restore2) {
      restores.push(restore2);
    }
  }
  const restore = () => {
    for (const restore2 of restores) {
      restore2();
    }
  };
  let awaitable = function_();
  if (awaitable && typeof awaitable === "object" && "catch" in awaitable) {
    awaitable = awaitable.catch((error) => {
      restore();
      throw error;
    });
  }
  return [awaitable, restore];
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function isJsonRequest(event) {
  if (hasReqHeader(event, "accept", "text/html")) {
    return false;
  }
  return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
  const value = getRequestHeader(event, name);
  return value && typeof value === "string" && value.toLowerCase().includes(includes);
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
  if (event.handled || isJsonRequest(event)) {
    return;
  }
  const defaultRes = await defaultHandler(error, event, { json: true });
  const statusCode = error.statusCode || 500;
  if (statusCode === 404 && defaultRes.status === 302) {
    setResponseHeaders(event, defaultRes.headers);
    setResponseStatus(event, defaultRes.status, defaultRes.statusText);
    return send(event, JSON.stringify(defaultRes.body, null, 2));
  }
  const errorObject = defaultRes.body;
  const url = new URL(errorObject.url);
  errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
  errorObject.message ||= "Server Error";
  errorObject.data ||= error.data;
  errorObject.statusMessage ||= error.statusMessage;
  delete defaultRes.headers["content-type"];
  delete defaultRes.headers["content-security-policy"];
  setResponseHeaders(event, defaultRes.headers);
  const reqHeaders = getRequestHeaders(event);
  const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
  const res = isRenderingError ? null : await useNitroApp().localFetch(
    withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject),
    {
      headers: { ...reqHeaders, "x-nuxt-error": "true" },
      redirect: "manual"
    }
  ).catch(() => null);
  if (event.handled) {
    return;
  }
  if (!res) {
    const { template } = await import('./error-500.mjs');
    setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
    return send(event, template(errorObject));
  }
  const html = await res.text();
  for (const [header, value] of res.headers.entries()) {
    if (header === "set-cookie") {
      appendResponseHeader(event, header, value);
      continue;
    }
    setResponseHeader(event, header, value);
  }
  setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
  return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

function defineNitroPlugin(def) {
  return def;
}

const _BPLUT6x4Ux5Ej6PmKFqc2Uh5SKwA55RoTOLeHCWs = defineNitroPlugin((nitroApp) => {
});

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

function baseURL() {
  return useRuntimeConfig().app.baseURL;
}
function buildAssetsDir() {
  return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
  return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
  const app = useRuntimeConfig().app;
  const publicBase = app.cdnURL || app.baseURL;
  return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

function resolveSecurityRules(event) {
  const routeRules = event.context.security?.routeRules;
  const router = createRouter$1({ routes: routeRules });
  const matcher = toRouteMatcher(router);
  const matches = matcher.matchAll(event.path.split("?")[0]);
  const rules = defuReplaceArray({}, ...matches.reverse());
  return rules;
}
function resolveSecurityRoute(event) {
  const routeRules = event.context.security?.routeRules || {};
  const routeNames = Object.fromEntries(Object.entries(routeRules).map(([name]) => [name, { name }]));
  const router = createRouter$1({ routes: routeNames });
  const match = router.lookup(event.path.split("?")[0]);
  return match?.name;
}
const defuReplaceArray = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) || Array.isArray(value)) {
    obj[key] = value;
    return true;
  }
});

const KEYS_TO_NAMES = {
  contentSecurityPolicy: "Content-Security-Policy",
  crossOriginEmbedderPolicy: "Cross-Origin-Embedder-Policy",
  crossOriginOpenerPolicy: "Cross-Origin-Opener-Policy",
  crossOriginResourcePolicy: "Cross-Origin-Resource-Policy",
  originAgentCluster: "Origin-Agent-Cluster",
  referrerPolicy: "Referrer-Policy",
  strictTransportSecurity: "Strict-Transport-Security",
  xContentTypeOptions: "X-Content-Type-Options",
  xDNSPrefetchControl: "X-DNS-Prefetch-Control",
  xDownloadOptions: "X-Download-Options",
  xFrameOptions: "X-Frame-Options",
  xPermittedCrossDomainPolicies: "X-Permitted-Cross-Domain-Policies",
  xXSSProtection: "X-XSS-Protection",
  permissionsPolicy: "Permissions-Policy"
};
const NAMES_TO_KEYS = Object.fromEntries(Object.entries(KEYS_TO_NAMES).map(([key, name]) => [name, key]));
function getNameFromKey(key) {
  return KEYS_TO_NAMES[key];
}
function getKeyFromName(headerName) {
  const [, key] = Object.entries(NAMES_TO_KEYS).find(([name]) => name.toLowerCase() === headerName.toLowerCase()) || [];
  return key;
}
function headerStringFromObject(optionKey, optionValue) {
  if (optionValue === false) {
    return "";
  }
  if (optionKey === "contentSecurityPolicy") {
    const policies = optionValue;
    return Object.entries(policies).filter(([, value]) => value !== false).map(([directive, sources]) => {
      if (directive === "upgrade-insecure-requests") {
        return "upgrade-insecure-requests;";
      } else {
        const stringifiedSources = typeof sources === "string" ? sources : sources.map((source) => source.trim()).join(" ");
        return `${directive} ${stringifiedSources};`;
      }
    }).join(" ");
  } else if (optionKey === "strictTransportSecurity") {
    const policies = optionValue;
    return [
      `max-age=${policies.maxAge};`,
      policies.includeSubdomains && "includeSubDomains;",
      policies.preload && "preload;"
    ].filter(Boolean).join(" ");
  } else if (optionKey === "permissionsPolicy") {
    const policies = optionValue;
    return Object.entries(policies).filter(([, value]) => value !== false).map(([directive, sources]) => {
      if (typeof sources === "string") {
        return `${directive}=${sources}`;
      } else {
        return `${directive}=(${sources.join(" ")})`;
      }
    }).join(", ");
  } else {
    return optionValue;
  }
}
function headerObjectFromString(optionKey, headerValue) {
  if (!headerValue) {
    return false;
  }
  if (optionKey === "contentSecurityPolicy") {
    const directives = headerValue.split(";").map((directive) => directive.trim()).filter((directive) => directive);
    const objectForm = {};
    for (const directive of directives) {
      const [type, ...sources] = directive.split(" ").map((token) => token.trim());
      if (type === "upgrade-insecure-requests") {
        objectForm[type] = true;
      } else {
        objectForm[type] = sources.join(" ");
      }
    }
    return objectForm;
  } else if (optionKey === "strictTransportSecurity") {
    const directives = headerValue.split(";").map((directive) => directive.trim()).filter((directive) => directive);
    const objectForm = {};
    for (const directive of directives) {
      const [type, value] = directive.split("=").map((token) => token.trim());
      if (type === "max-age") {
        objectForm.maxAge = Number(value);
      } else if (type === "includeSubdomains" || type === "preload") {
        objectForm[type] = true;
      }
    }
    return objectForm;
  } else if (optionKey === "permissionsPolicy") {
    const directives = headerValue.split(",").map((directive) => directive.trim()).filter((directive) => directive);
    const objectForm = {};
    for (const directive of directives) {
      const [type, value] = directive.split("=").map((token) => token.trim());
      objectForm[type] = value;
    }
    return objectForm;
  } else {
    return headerValue;
  }
}

const _Io7OlQknYAu5ffTWmGhuyeAZdjJnUpmJkZcQWfPrRsg = defineNitroPlugin((nitroApp) => {
  const runtimeConfig = useRuntimeConfig();
  const securityRouteRules = {};
  for (const route in runtimeConfig.nitro.routeRules) {
    const rule = runtimeConfig.nitro.routeRules[route];
    const { headers } = rule;
    const securityHeaders = standardToSecurity(headers);
    if (securityHeaders) {
      securityRouteRules[route] = { headers: securityHeaders };
    }
  }
  const securityOptions = runtimeConfig.security;
  securityRouteRules["/**"] = defuReplaceArray(
    securityOptions,
    securityRouteRules["/**"]
  );
  for (const route in runtimeConfig.nitro.routeRules) {
    const rule = runtimeConfig.nitro.routeRules[route];
    const { security } = rule;
    if (security) {
      const { headers } = security;
      const securityHeaders = backwardsCompatibleSecurity(headers);
      securityRouteRules[route] = defuReplaceArray(
        { headers: securityHeaders },
        security,
        securityRouteRules[route]
      );
    }
  }
  nitroApp.hooks.hook("nuxt-security:headers", ({ route, headers }) => {
    securityRouteRules[route] = defuReplaceArray(
      { headers },
      securityRouteRules[route]
    );
  });
  nitroApp.hooks.callHook("nuxt-security:ready");
  nitroApp.hooks.callHook("nuxt-security:routeRules", securityRouteRules);
  nitroApp.hooks.hook("request", async (event) => {
    event.context.security = { routeRules: securityRouteRules };
  });
});
function standardToSecurity(standardHeaders) {
  if (!standardHeaders) {
    return void 0;
  }
  const standardHeadersAsObject = {};
  Object.entries(standardHeaders).forEach(([headerName, headerValue]) => {
    const optionKey = getKeyFromName(headerName);
    if (optionKey) {
      if (typeof headerValue === "string") {
        const objectValue = headerObjectFromString(optionKey, headerValue);
        standardHeadersAsObject[optionKey] = objectValue;
      } else {
        standardHeadersAsObject[optionKey] = headerValue;
      }
    }
  });
  if (Object.keys(standardHeadersAsObject).length === 0) {
    return void 0;
  }
  return standardHeadersAsObject;
}
function backwardsCompatibleSecurity(securityHeaders) {
  if (!securityHeaders) {
    return void 0;
  }
  const securityHeadersAsObject = {};
  Object.entries(securityHeaders).forEach(([key, value]) => {
    const optionKey = key;
    if ((optionKey === "contentSecurityPolicy" || optionKey === "permissionsPolicy" || optionKey === "strictTransportSecurity") && typeof value === "string") {
      const objectValue = headerObjectFromString(optionKey, value);
      securityHeadersAsObject[optionKey] = objectValue;
    } else if (value === "") {
      securityHeadersAsObject[optionKey] = false;
    } else {
      securityHeadersAsObject[optionKey] = value;
    }
  });
  return securityHeadersAsObject;
}

const _ffs6DYHZSHfXMbClLn8sseBrMwbS0RVrmDxjpKdNM6g = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    const rules = resolveSecurityRules(event);
    if (rules.enabled && rules.nonce) {
      const nonce = nodeCrypto.randomBytes(16).toString("base64");
      event.context.security.nonce = nonce;
    }
  });
});

const _L8Ej9XFp7BFVD0ojv5GxrZL6LU2KOJkGrZIxjpuiMk = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event) => {
    const rules = resolveSecurityRules(event);
    if (rules.enabled && rules.hidePoweredBy && !event.node.res.headersSent) {
      removeResponseHeader(event, "x-powered-by");
    }
  });
});

const _CqEL2_1yd_8g0TiHl7RkyMSgjwvxfCpvOV0fGyGAZ2A = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:response", (response, { event }) => {
    const rules = resolveSecurityRules(event);
    if (rules.enabled && rules.headers) {
      const headers = { ...rules.headers };
      const nonce = event.context.security?.nonce;
      if (headers.contentSecurityPolicy) {
        const csp = headers.contentSecurityPolicy;
        headers.contentSecurityPolicy = insertNonceInCsp(csp, nonce);
      }
      Object.entries(headers).forEach(([header, value]) => {
        const headerName = getNameFromKey(header);
        if (value === false) {
          const { headers: standardHeaders } = getRouteRules(event);
          const standardHeaderValue = standardHeaders?.[headerName];
          const currentHeaderValue = getResponseHeader(event, headerName);
          if (standardHeaderValue === currentHeaderValue) {
            removeResponseHeader(event, headerName);
          }
        } else {
          const headerValue = headerStringFromObject(header, value);
          setResponseHeader(event, headerName, headerValue);
        }
      });
    }
  });
});
function insertNonceInCsp(csp, nonce) {
  const generatedCsp = Object.fromEntries(Object.entries(csp).map(([directive, value]) => {
    if (typeof value === "boolean") {
      return [directive, value];
    }
    const sources = typeof value === "string" ? value.split(" ").map((token) => token.trim()).filter((token) => token) : value;
    const modifiedSources = sources.filter((source) => !source.startsWith("'nonce-") || source === "'nonce-{{nonce}}'").map((source) => {
      if (source === "'nonce-{{nonce}}'") {
        return nonce ? `'nonce-${nonce}'` : "";
      } else {
        return source;
      }
    }).filter((source) => source);
    return [directive, modifiedSources];
  }));
  return generatedCsp;
}

const _3GTHt7x7FGtPRBZ6afsAmpeG6atgrEmGLJfSinhSx3w = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", (html, { event }) => {
    const rules = resolveSecurityRules(event);
    if (!rules.enabled || !rules.sri && (!rules.headers || !rules.headers.contentSecurityPolicy)) {
      return;
    }
    const sections = ["body", "bodyAppend", "bodyPrepend", "head"];
    const cheerios = {};
    for (const section of sections) {
      cheerios[section] = html[section].map((element) => {
        return cheerio.load(element, {
          xml: {
            // Disable `xmlMode` to parse HTML with htmlparser2.
            xmlMode: false,
            decodeEntities: false
          }
        }, false);
      });
    }
    event.context.security.cheerios = cheerios;
  });
});

const sriHashes = {"/_nuxt/builds/meta/c38317ee-a7f3-4261-92b4-76ac348e7385.json":"sha384-0qI7x4Pjqjj0AeE8dIhQUTfElUp/2IMx8Vl8X/cREdyAfHNwpbKCxtpUHFbt5p8w","/_nuxt/-kqIyYjV.js":"sha384-fLJR2fkPvVbY8CGbJgpmrg18irZz8QhjRbewli6G+0yPsjynU/s4Fx6iGFPOR335","/_nuxt/1R397NpP.js":"sha384-xpGpE8R1Z6skOkcRmvA2ruWrxR/PFrPIJaZBZTEVlLQcR+zXv7OuYDztgWENp5Ed","/_nuxt/3juDbF9G.js":"sha384-1Ehi/tGvnkxKf6GMABtmhAh1bM1BR/Jg7VuskdQHAwjXLRF+WJZCvEr8fCVXyT3D","/_nuxt/Aegc-jYf.js":"sha384-cnU7oiCOnSslW9JnzfYSUxiwTvfN2Tyviu1ZNjMUhz/h4dDARKYz4jCa22tSclGt","/_nuxt/auth.DA77MLhj.css":"sha384-HmJUNf3mzxgn+v2c08Vo42idFgTR4TBt0upJxG4o3rjxpB8K/CnjiDT0/ZmX9R4V","/_nuxt/B-YVwB4U.js":"sha384-DwjaludYjspjHAVffsVvj3bmdBooSi4Te9hlA2/Yo5r/SbEVbdWs1DHFWcpyjjT9","/_nuxt/B5bgAodh.js":"sha384-5NSOvPeQWBLt8VW9BoM/oMnS7CxxXzZimkhQ/96Gl9f09m3VRw/RKTO25c4wejru","/_nuxt/B5I2xwn1.js":"sha384-31zrn/4+BFk93jBtGfjwq8rY4eejxGd4/7Twq58A6X4O6WiNa3a1c1hvNgpuYKRk","/_nuxt/B8D3J2PK.js":"sha384-MTXe7PKp/33V4wnjkcFaYRpiCXTbiEK3zZv4P6VfSER0g4CX0pjSu2YXkyHiJ/wZ","/_nuxt/BA5gdW0h.js":"sha384-fxVrQ3O5f+8dOZYjk1HGmF6a/ZWgJy5mMClqfCWnqVxfbMi0I1r1k7lhrScUpJjb","/_nuxt/BAYjl877.js":"sha384-MpZ39kLaqkjVenMupHcN2qPHKbKu7corGXAscZ/gvgU27h3wPAeXpEpAbC45IcUn","/_nuxt/BJkrCUcV.js":"sha384-1vc9zRZd3Nohx80g3N/J+OGl9WKuED0rkYBY2ejMeHtgWIazfQsI/wLBtEkW2frP","/_nuxt/BnKGwaED.js":"sha384-RZJ1YOIQFd2LPjpdzLTFxgsqFxqgTKURNHtCQGXa+vYqvZzF36xsEWYrVY5YGcE9","/_nuxt/BoEXyZ04.js":"sha384-ABgMg+utguaXh/4DIZK3VphHRqPDWVePJOJ9p+xRsQf0PCRDf/9f83Fadlr61mMe","/_nuxt/BPIyyE58.js":"sha384-mZ6VWTDHlqtGnf1MMarS8rg1vkUeR47hcluMbDUkE/sEppQCdhYJvK7qeh8XfdFc","/_nuxt/BWHD7Uhz.js":"sha384-4/+6VoqSs5axxyMsLMZaxrTQU3Fh41r2PeGUd2BFOM1kfTNSjkMktVrfCXrdrehW","/_nuxt/Bxs_hGHX.js":"sha384-YDDbsshoDoNuik+cM9+vPGDNAarKShobVFEAVHIjWRMHFtY0Dk1hyY9Wcv8S+7y/","/_nuxt/BzfJidwa.js":"sha384-Ku4ge6SxmHUbHNMfY9Wi2hIqAPUCimaKKW6kBdJiHZGOW6h/U6E/MDkEDl6d0SJG","/_nuxt/C5Df4zdF.js":"sha384-Gr3ErXNRxbdfK4fd1tszNAjhdatVVYEjqM279cQtbMIjpXF6zb4EuIhKPhvh85ls","/_nuxt/C6I3Vjfw.js":"sha384-nFnIOku4IgjNnQa2CrQm0WVLNr/5oA29wfFStd4dKWZlozv+QBF21dykWOqyd46y","/_nuxt/CaItSGER.js":"sha384-ipCp5OpYmt9ajJtuOxrtfn2wG7Y1atZ8Rm+Hlg/9c0lpOdX9O2ko0HIoeMxmDeW7","/_nuxt/CBSk2bpF.js":"sha384-KvUSwwez31hRQwA+WdR69r0/wHoxBzYzdyiIN+e51BD9vxo3j85FMDOy2g9L2y5i","/_nuxt/CDvY4Y8P.js":"sha384-jwG0dWlrSfPiwtukKd6/IAkW9rZhMVMuiSH7XcdeksP2B7CnSo8UQEIK2Odcx2TS","/_nuxt/CF--cGUh.js":"sha384-7SrzbcGV7xXP2ITYDsgorsxlpXlfuHJTy1L7VFLT2JegTPp4bR3v/tjfj1S9LfyT","/_nuxt/CIJ-Djhd.js":"sha384-bhtTZ6nHZCiglRayroR33HXxx2XObtP7WKBr1b/TjHJUhzTcOUh2yPdwK8u4KKA6","/_nuxt/CMqkDi7_.js":"sha384-qYuTG621YfTWX8vnOIfZPVH7Rz1L77TuHwu18t/+d8t+YFSgJrtvlt6eTGPJQ9vw","/_nuxt/COTwzbyg.js":"sha384-+fJUj3JWVsYZARsAQVQ9vWNSiq+6cyStINPJQRI+n54pYPYk82Bemj4Nv++045Qf","/_nuxt/CRgE6VFB.js":"sha384-3OWLLvhE0yfdw5//l1nQUz3MOt0WOoOewNl0a5ZG0GOHPk5hYS0lgRrvpZOLYWE1","/_nuxt/CvRQRkId.js":"sha384-6Ilu3zL4ha5Hx14QhaPza6wzyKeuoEYb5mrEzbizDxBPFQMVA+jovc88K2FtW8Bw","/_nuxt/CVUYmR8X.js":"sha384-RlwVerF518UTA/d21sGOtkOyqTp0qDkQEurGwEYBsjfxxOYXBXmd95Ofp1FyD+9M","/_nuxt/D-Oisjan.js":"sha384-VQayP4+8CbBMxjDDFuSCusHloOOPbwqOwdcz2A81mVzs5hBK0OxujESkV9OR0FWF","/_nuxt/dashboard.B6ns45Lv.css":"sha384-Ky9+e/fLggitqZ6ydHZfMrKF6H++701tFnjA8vrSXIDm0xE3qkuS6YFKJo3lQEML","/_nuxt/DgG-43KV.js":"sha384-u8/srUhNtkeoAArLvNrR5xOGtneXImE4fzKls53kci1UGGbxypMEkb77wCgwjw+l","/_nuxt/DhF_19ut.js":"sha384-AihG0wOXdtYk92dbzKdtRQ/RnKwU3PE/X8kQPLMecpxjtVKxrH7wokKTqfGB7Z05","/_nuxt/DlAUqK2U.js":"sha384-wV/FyIfkoKuneA9gx32UbcC1rWydYJhlr+cMCHu0oN57ZtVcBz8nUCI/A5rPOyHo","/_nuxt/DMCUgAEd.js":"sha384-MYe2WG+XlD9FfF2JOcohvPldjGxaeWGR6xlECr8hvNI7Xwh0AuaTl6XOZ2txV/EQ","/_nuxt/DOZHR6qC.js":"sha384-5hgnN9NAt8bvshyjqj1/wG8XEbW3yutzK6rIMblYnV170FkO7+P3mHJwJ3952SpF","/_nuxt/Ds8tXZ-Z.js":"sha384-wZKAlRKFF5eb4Kh4sCA0jBiRVOR+NIw03Ek+wWovO6VrbTQUoGpdx+wwdgMiGusn","/_nuxt/DThn_5ro.js":"sha384-fsEfDQqaB4vMwkFUAa1GuP/u0jYNFfl/GzhSZiH9QOWY0CfnjtdgKSygvwl0wvbA","/_nuxt/eeAzbuM6.js":"sha384-O1KyGiRfezHbZrP7XcSlKxabxc+m1yJAqBLTIJ2hYu/y+6xOY8/gnjQKN6lePSG0","/_nuxt/EJPkChDo.js":"sha384-PPavwSqzcwog5JsqaE5Lf+y+ZtWHUzC4/LzsAqdvP+RqlW7Rdr/whaZl0QiIFIHB","/_nuxt/entry.BU7YuDps.css":"sha384-iu3JF5xjUWqhDDKPXUMX9RXXLAEOin/jXkkx9gU8G2Px3Q+BKwc9hJnEMhLdKsCQ","/_nuxt/error-404.CYUhy3y9.css":"sha384-geFscfwHvDpBSJwIjTtShWcOzF+rYicD4MkqDSgpLiFtCmJ4TfeYS6ZU/n7lNsmY","/_nuxt/error-500.CVLkTsZM.css":"sha384-qkz1XaRnKvjaRnDb8axOUQqoIe8U7ngRpsOaYb0XXGq7nPTaH1U79rwKQl/RMOHd","/_nuxt/hw4BRqoz.js":"sha384-xy0CblN/cxbC5Eq5UZAb74A0UWP/nb5U5YLQKEsZRJaGj/MLYzXpT03XvMAy5krx","/_nuxt/index.DhE8A6wa.css":"sha384-YaO1I2DHimwmNOvVnEoeLdTC4ZjRmPngaHbc0RbMBA4ypBrLTJasICT4TK/RBUdE","/_nuxt/Inter-italic.var.DhD-tpjY.woff2":"sha384-d0C5MGtBKNcAjM/4lA44ZOS9EnuClOkg9j2zr6zRu3Fm2p6hqJatbbtkMhcnAR8X","/_nuxt/Inter-roman.var.C-r5W2Hj.woff2":"sha384-qdorvNfok32G6Er697FIC08SXfKfWERN0D4osrBvy0vwa1hdi6FNN8IhT0suMnlH","/_nuxt/IpVeAzdA.js":"sha384-AJeXxh7KzAlfm2CYruPg0DyctDBrdFRHDaL2+I7azG40yQt+KS6Tl9EvSI1Vmqt9","/_nuxt/kmzpRPYk.js":"sha384-QOEvhSZParqFY92lZkom90DZOJ/OB2BzZZkei7R+8wRHnborMSZyjQ1W4EU+SbB1","/_nuxt/lIINk6VJ.js":"sha384-q48XWFoXFcJreSpnMGuuyu9X4dFXzfFB2fEeGSjuvGT07YgG9Rxybmdh6thZrQ4D","/_nuxt/logs.xIzu6v38.css":"sha384-143PI+JBOZauqfwOSaUq/Uwq0dpekaaHPRuombX8cOoPuyyTcLl8NmQkSECBKJhQ","/_nuxt/LPRVApkV.js":"sha384-/02cBztcRBx7ZIWwwtZTDOOI8OnCx6SfK1nysx+5y3/dw2y1EErZgp6kkub8DPby","/_nuxt/map-bounds.CgN4PItp.css":"sha384-qVPia56KUhTKnoXWM3yewW9eEPzaHV8p5RPqH+N/7g3oa/EWLhTkXjYryAuAtIFm","/_nuxt/map.client.a3ZRiWiE.css":"sha384-Pt/bseTr7/Nsa6h2LXsJpN6oDWJGFIzp4EFyyOpXwGc/DZAHGC4HbKrraImGx6mc","/_nuxt/ota-updates.1lxbf4Mv.css":"sha384-aMGDok2nclyLWbfxNMlZSLZfd725srjS0uJA3X1z0QkC9XsB5wFNXZ4zMKgLpZnH","/_nuxt/primeicons.BubJZjaf.svg":"sha384-FBLkhpBgsFY55B+PDt4Fgwpz1pQkv6uxh889NpdbHjshpGiZaKzbU5EA7YIysed8","/_nuxt/primeicons.CCFeZR6K.woff":"sha384-F04TY3n5oIxj++1blP+DjEogR2aSGzm7wi2WeWIN46WLjpTXllMSjDlvtzBKMPy8","/_nuxt/primeicons.Dk_eWBPK.eot":"sha384-DT1OXlHM4W53OV5/4iTOOI9vtILn1gnh8AeWEs118qCMpxdTEPp25+2iBhCSjQyY","/_nuxt/primeicons.DsZ1W7-Z.woff2":"sha384-MCqYWINuBCz+kZ993ESmSElr+ZYF/RyN5DZQWbEq5VGBxb3FnlDKfZ3qenelJd1f","/_nuxt/primeicons.NDVQFXzF.ttf":"sha384-Zjo7YKj6rgvPlgq0Dcg0Eur2cAgcIbbTBD/uvB9dWrZyAnabnXtzyl53MtcWSpWd","/_nuxt/spritesheet.DpIxuf5L.svg":"sha384-vGiUBPgTxbQczYLBJbzC4xOzcKkNU1zVxPiHGgLZeBkHcNIvicMV3hGb2vqeZgbG","/_nuxt/table.DQDoLwr6.css":"sha384-yYZMmB4kVjW+rzZVSVS90rnP9KgUb6exRKl/Sv42gdWyd83PWfXAx2/rvSwKXSpa","/_nuxt/tabler-icons.5JjTyLEB.woff":"sha384-2O0Y4qT2IcQLJvlsgMLxeHcALtGSlv5rx+W2HjnXYNnybDBeSPJa2PIYQ0++sfHA","/_nuxt/tabler-icons.Bj6HnZqC.ttf":"sha384-2yZdl8S1gPm00jk751nb2jSYvhEhD25trPbLAIf9wOj7lQMmIHRgR5D4bSshFlC4","/_nuxt/tabler-icons.CdTAjtqK.woff2":"sha384-4VXUEYwQ1R2CNDMrhdgtSPDfhr2iV/LS+0Ybuw1Xs3FEhVyhLWAoKcaXL+3t4T/a","/_nuxt/tabler-icons.D91Td7Em.eot":"sha384-bilpnhRjch7gSvveQVvkjqtTNrtmgw0Q3drRQEhIZWa/z214IeLxWCZPaVoDE5tK","/_nuxt/tabler-icons.DkKlmoMw.svg":"sha384-iV2ooAJgMo6S6tqjDrSYEHdYXCIdLPtjzDg2MsEGreWZX9fZ6IGYiw33jN7R31u6","/_nuxt/violation.C2Bf03cv.css":"sha384-LOoFIkU2hefvB1pzfrYTU+H4WX4Huw88h11J0Qksi7mLNahC0Qgwsvpov6yHOP81","/_nuxt/xF50vSua.js":"sha384-DQa6lY/kRVU399YnzbRVbLuespJyKTYGez9ENAl8Pxx5BvPMRS49I2nJ+MXT/HEL","/_nuxt/_number_plate_.BS-cLpwj.css":"sha384-1fsEW45qEOuAB9DCFcde8nPOBeO6E5RuABWbSOWJQ2I1eH0vTvVsC5pvSj1K6DOT","/_nuxt/_zCzPqjq.js":"sha384-ZdxUUrH9SyDUKM8qdjqmf5O+WPLoExUe3RD+pf92LCC3tdioBm9fAGUgFYWPQLcf","/favicon.ico":"sha384-BjyyE6+tiHOsVBa2tCnxp/As+IwP5gW+BL9+owlkdk2UaCsoi0IMPfV0RzhcpvQ0"};

const _UxrFhEhuXeyYaCDefxZ1SecYqUJVq1BNpPIHMIVvQs = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", (html, { event }) => {
    const rules = resolveSecurityRules(event);
    if (!rules.enabled || !rules.sri) {
      return;
    }
    const sections = ["body", "bodyAppend", "bodyPrepend", "head"];
    const cheerios = event.context.security.cheerios;
    for (const section of sections) {
      cheerios[section].forEach(($) => {
        $("script").each((i, script) => {
          const scriptAttrs = $(script).attr();
          const src = scriptAttrs?.src;
          const integrity = scriptAttrs?.integrity;
          if (src && !integrity) {
            const hash = sriHashes[src];
            if (hash) {
              $(script).attr("integrity", hash);
            }
          }
        });
        $("link").each((i, link) => {
          const linkAttrs = $(link).attr();
          const rel = linkAttrs?.rel;
          if (rel === "stylesheet" || rel === "preload" || rel === "modulepreload") {
            const href = linkAttrs?.href;
            const integrity = linkAttrs?.integrity;
            if (href && !integrity) {
              const hash = sriHashes[href];
              if (hash) {
                $(link).attr("integrity", hash);
              }
            }
          }
        });
      });
    }
  });
});

const __6EwV7M5nR2wtULOsgACM4uG1YoO32ddKEXIOi3rbI = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", (html, { event }) => {
    {
      return;
    }
  });
});

const _bFaVFRNsS5wjs2WIUXV9rDtQyJrWXrf5rK0wLViFhrw = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", (html, { event }) => {
    const rules = resolveSecurityRules(event);
    if (!rules.enabled || !rules.headers || !rules.headers.contentSecurityPolicy || !rules.nonce) {
      return;
    }
    const nonce = event.context.security.nonce;
    const sections = ["body", "bodyAppend", "bodyPrepend", "head"];
    const cheerios = event.context.security.cheerios;
    for (const section of sections) {
      cheerios[section].forEach(($) => {
        $("link").attr("nonce", nonce);
        $("script").attr("nonce", nonce);
        $("style").attr("nonce", nonce);
      });
    }
  });
});

const _jM9GyS2ox8kv4BwDcLAjV1jIUcGI5VoerCOY6znxCE = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", (html, { event }) => {
    const rules = resolveSecurityRules(event);
    if (!rules.enabled || !rules.sri && (!rules.headers || !rules.headers.contentSecurityPolicy)) {
      return;
    }
    const sections = ["body", "bodyAppend", "bodyPrepend", "head"];
    const cheerios = event.context.security.cheerios;
    for (const section of sections) {
      html[section] = cheerios[section].map(($) => {
        const html2 = $.html();
        return html2;
      });
    }
  });
});

const plugins = [
  _BPLUT6x4Ux5Ej6PmKFqc2Uh5SKwA55RoTOLeHCWs,
_Io7OlQknYAu5ffTWmGhuyeAZdjJnUpmJkZcQWfPrRsg,
_ffs6DYHZSHfXMbClLn8sseBrMwbS0RVrmDxjpKdNM6g,
_L8Ej9XFp7BFVD0ojv5GxrZL6LU2KOJkGrZIxjpuiMk,
_CqEL2_1yd_8g0TiHl7RkyMSgjwvxfCpvOV0fGyGAZ2A,
_3GTHt7x7FGtPRBZ6afsAmpeG6atgrEmGLJfSinhSx3w,
_UxrFhEhuXeyYaCDefxZ1SecYqUJVq1BNpPIHMIVvQs,
__6EwV7M5nR2wtULOsgACM4uG1YoO32ddKEXIOi3rbI,
_bFaVFRNsS5wjs2WIUXV9rDtQyJrWXrf5rK0wLViFhrw,
_jM9GyS2ox8kv4BwDcLAjV1jIUcGI5VoerCOY6znxCE
];

const assets = {
  "/favicon.ico": {
    "type": "image/vnd.microsoft.icon",
    "etag": "\"291a-yKn1bovhpEHThPx9c2KQFnPCCsI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10522,
    "path": "../public/favicon.ico"
  },
  "/css/styles.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"55c8d-VfWnxYDDTeKW/lfFP8iPRW86VR8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 351373,
    "path": "../public/css/styles.min.css"
  },
  "/images/logo-with-payoff-line.svg": {
    "type": "image/svg+xml",
    "etag": "\"28a0-eX82Hbb96VAyl3aBeiJhMoTMN6w\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10400,
    "path": "../public/images/logo-with-payoff-line.svg"
  },
  "/images/logo.svg": {
    "type": "image/svg+xml",
    "etag": "\"622-dmlwwa1BsIBdVGJbA5lyWrbogyY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1570,
    "path": "../public/images/logo.svg"
  },
  "/images/waiting-for-data.svg": {
    "type": "image/svg+xml",
    "etag": "\"8618-0h5E7veAQzYhuEu3GmlYdFiWsHg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 34328,
    "path": "../public/images/waiting-for-data.svg"
  },
  "/js/sidebarmenu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"736-k4cDTaaDqUp2OaR1D0OIjqrdnlQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1846,
    "path": "../public/js/sidebarmenu.js"
  },
  "/_nuxt/-kqIyYjV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5b8f-Bm6Lu5JgmnPgoauuDik/AE7PFIc\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 23439,
    "path": "../public/_nuxt/-kqIyYjV.js"
  },
  "/_nuxt/1R397NpP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d02-00lXpWDVvzm6dJ88sNpLShzoGUQ\"",
    "mtime": "2026-01-21T12:48:12.846Z",
    "size": 7426,
    "path": "../public/_nuxt/1R397NpP.js"
  },
  "/_nuxt/3juDbF9G.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"634-NliK/9UhCV2dsTMueSd+N/r2Tx8\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 1588,
    "path": "../public/_nuxt/3juDbF9G.js"
  },
  "/_nuxt/Aegc-jYf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d70a1-tRU5nHWoluc3K4TrfJc2ApTdJhw\"",
    "mtime": "2026-01-21T12:48:12.882Z",
    "size": 880801,
    "path": "../public/_nuxt/Aegc-jYf.js"
  },
  "/_nuxt/auth.DA77MLhj.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"66451-qSKJZ2/0zQ1StGXJFfRUj4Q6G3g\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 418897,
    "path": "../public/_nuxt/auth.DA77MLhj.css"
  },
  "/_nuxt/B-YVwB4U.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ece0-OUE0w1jzfVyz+fPe5mj7exS/asQ\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 60640,
    "path": "../public/_nuxt/B-YVwB4U.js"
  },
  "/_nuxt/B5bgAodh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3252-58jo+OqsKLiOUtWJhzdvtucZsRc\"",
    "mtime": "2026-01-21T12:48:12.843Z",
    "size": 12882,
    "path": "../public/_nuxt/B5bgAodh.js"
  },
  "/_nuxt/B5I2xwn1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"272-BQuLyZDB00KSH+OhSoYzi1euSSg\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 626,
    "path": "../public/_nuxt/B5I2xwn1.js"
  },
  "/_nuxt/B8D3J2PK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"988-7Qttej+NSvsD+7whxISGrL9q250\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 2440,
    "path": "../public/_nuxt/B8D3J2PK.js"
  },
  "/_nuxt/BA5gdW0h.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"451a6-wQS+Nz55jGk5/Al033/rEMn+wl8\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 283046,
    "path": "../public/_nuxt/BA5gdW0h.js"
  },
  "/_nuxt/BAYjl877.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10eaf-0WU3WC6DnqKz+6DzT2s4cdMeuCs\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 69295,
    "path": "../public/_nuxt/BAYjl877.js"
  },
  "/_nuxt/BJkrCUcV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d74-t/aL8ifvLE6KdRUVS0van6bJm6I\"",
    "mtime": "2026-01-21T12:48:12.838Z",
    "size": 3444,
    "path": "../public/_nuxt/BJkrCUcV.js"
  },
  "/_nuxt/BnKGwaED.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13ff-0ka9ps6GazJOl4ZoVyeQ9BEf7Wc\"",
    "mtime": "2026-01-21T12:48:12.846Z",
    "size": 5119,
    "path": "../public/_nuxt/BnKGwaED.js"
  },
  "/_nuxt/BoEXyZ04.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1351-vSazeivEoVGLTNIuOQWJmxM/6Oo\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 4945,
    "path": "../public/_nuxt/BoEXyZ04.js"
  },
  "/_nuxt/BPIyyE58.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6b6-kFM22CObXFRyaoO10D2Z0PGrxbM\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 1718,
    "path": "../public/_nuxt/BPIyyE58.js"
  },
  "/_nuxt/BWHD7Uhz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1163-cq854eSb+wGd1zTFeTjbVXyUI+I\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 4451,
    "path": "../public/_nuxt/BWHD7Uhz.js"
  },
  "/_nuxt/Bxs_hGHX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"72b-QrxUKxYmMEUpqoVcz2LByaM/3nI\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 1835,
    "path": "../public/_nuxt/Bxs_hGHX.js"
  },
  "/_nuxt/BzfJidwa.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1753-+/zGZNcGH7JmnqkXo3dhb5VBztI\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 5971,
    "path": "../public/_nuxt/BzfJidwa.js"
  },
  "/_nuxt/C5Df4zdF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"edc-FWpxy1wTp88DXQqLfHRQayXmbD8\"",
    "mtime": "2026-01-21T12:48:12.839Z",
    "size": 3804,
    "path": "../public/_nuxt/C5Df4zdF.js"
  },
  "/_nuxt/C6I3Vjfw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7b0b-uji7hOoz7WZmLrb+EAZy7geXzp8\"",
    "mtime": "2026-01-21T12:48:12.843Z",
    "size": 31499,
    "path": "../public/_nuxt/C6I3Vjfw.js"
  },
  "/_nuxt/CaItSGER.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13e1-31y2WUYp3gfZQI5pD6TCmtqC+Ug\"",
    "mtime": "2026-01-21T12:48:12.839Z",
    "size": 5089,
    "path": "../public/_nuxt/CaItSGER.js"
  },
  "/_nuxt/CBSk2bpF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fc-nhrCEFX/KWEiIZFAm0csi4S/OQo\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 252,
    "path": "../public/_nuxt/CBSk2bpF.js"
  },
  "/_nuxt/CDvY4Y8P.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4da0-j6FCB+hNlChXUBwMJxLNbWAJuDY\"",
    "mtime": "2026-01-21T12:48:12.839Z",
    "size": 19872,
    "path": "../public/_nuxt/CDvY4Y8P.js"
  },
  "/_nuxt/CF--cGUh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11e7-GA3oJZWU2/BE1AnWZQj3g7NLP0Q\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 4583,
    "path": "../public/_nuxt/CF--cGUh.js"
  },
  "/_nuxt/CIJ-Djhd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"716-c3pCA8VPKyEGVz1140lPyJHXCDU\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 1814,
    "path": "../public/_nuxt/CIJ-Djhd.js"
  },
  "/_nuxt/CMqkDi7_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ff-NP/n2jXGQnYd4nZJBWTFJ8xKaHA\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 255,
    "path": "../public/_nuxt/CMqkDi7_.js"
  },
  "/_nuxt/COTwzbyg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"642-aV6duyTwNEx8oScZPweCfj2hZ4U\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 1602,
    "path": "../public/_nuxt/COTwzbyg.js"
  },
  "/_nuxt/CRgE6VFB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6a-BOmwWVFd90Se65BS7AxgNAaNVX0\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 106,
    "path": "../public/_nuxt/CRgE6VFB.js"
  },
  "/_nuxt/CvRQRkId.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2324-vQg75WIIs+7DvZgUfsQFta7pqp4\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 8996,
    "path": "../public/_nuxt/CvRQRkId.js"
  },
  "/_nuxt/CVUYmR8X.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f02-GJYair1fBATdSZc2x95zTlE1CcE\"",
    "mtime": "2026-01-21T12:48:12.839Z",
    "size": 3842,
    "path": "../public/_nuxt/CVUYmR8X.js"
  },
  "/_nuxt/D-Oisjan.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"247ff-EkCbi3zHADzqBvbTqRIVnttqoJ0\"",
    "mtime": "2026-01-21T12:48:12.848Z",
    "size": 149503,
    "path": "../public/_nuxt/D-Oisjan.js"
  },
  "/_nuxt/dashboard.B6ns45Lv.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"69037-a/rQum3e6jsuyHcPjk+nkgiBXFo\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 430135,
    "path": "../public/_nuxt/dashboard.B6ns45Lv.css"
  },
  "/_nuxt/DgG-43KV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13e5-PRd0vvcESKiRNkicv2AA40vBEck\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 5093,
    "path": "../public/_nuxt/DgG-43KV.js"
  },
  "/_nuxt/DhF_19ut.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ffb-RrwKmoabDeuCHEBNUiF0ySqJzVM\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 12283,
    "path": "../public/_nuxt/DhF_19ut.js"
  },
  "/_nuxt/DlAUqK2U.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5b-eFCz/UrraTh721pgAl0VxBNR1es\"",
    "mtime": "2026-01-21T12:48:12.846Z",
    "size": 91,
    "path": "../public/_nuxt/DlAUqK2U.js"
  },
  "/_nuxt/DMCUgAEd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b4-BJo8IlxgoZpOsbwD81F0PZBxdVU\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 180,
    "path": "../public/_nuxt/DMCUgAEd.js"
  },
  "/_nuxt/DOZHR6qC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"28c1-fTVlO7IFH1pxoHuwZuTFAUOtquk\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 10433,
    "path": "../public/_nuxt/DOZHR6qC.js"
  },
  "/_nuxt/Ds8tXZ-Z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ce8-0G0o9l4864A1mhJHc0fBmWf4N+g\"",
    "mtime": "2026-01-21T12:48:12.839Z",
    "size": 3304,
    "path": "../public/_nuxt/Ds8tXZ-Z.js"
  },
  "/_nuxt/DThn_5ro.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d6b-AiauT71qC+a+Rh4dz5S2IrNNMgc\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 3435,
    "path": "../public/_nuxt/DThn_5ro.js"
  },
  "/_nuxt/eeAzbuM6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"67a-kFZzUwlDJR1g3HVvN6b6pRiTOB0\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 1658,
    "path": "../public/_nuxt/eeAzbuM6.js"
  },
  "/_nuxt/EJPkChDo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"581-n/cA42pe37xrBWCGQbctT//lCwU\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 1409,
    "path": "../public/_nuxt/EJPkChDo.js"
  },
  "/_nuxt/entry.BU7YuDps.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"9fd-uIa559XvqEDnZ0Sz61I0xizkdyg\"",
    "mtime": "2026-01-21T12:48:12.835Z",
    "size": 2557,
    "path": "../public/_nuxt/entry.BU7YuDps.css"
  },
  "/_nuxt/error-404.CYUhy3y9.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"dca-005xQIrTNdE7LUqKJ7YOCC8lzEw\"",
    "mtime": "2026-01-21T12:48:12.836Z",
    "size": 3530,
    "path": "../public/_nuxt/error-404.CYUhy3y9.css"
  },
  "/_nuxt/error-500.CVLkTsZM.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"75a-W5VxOFBjAs2NvcF8lJBDWJ0iI/o\"",
    "mtime": "2026-01-21T12:48:12.836Z",
    "size": 1882,
    "path": "../public/_nuxt/error-500.CVLkTsZM.css"
  },
  "/_nuxt/hw4BRqoz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b3d-hXDoxs05a8G4InlzXBbHhH6Ah28\"",
    "mtime": "2026-01-21T12:48:12.840Z",
    "size": 6973,
    "path": "../public/_nuxt/hw4BRqoz.js"
  },
  "/_nuxt/index.DhE8A6wa.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"358-7DrbO4IjcT9uNPNOmtGLKSGZvGs\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 856,
    "path": "../public/_nuxt/index.DhE8A6wa.css"
  },
  "/_nuxt/Inter-italic.var.DhD-tpjY.woff2": {
    "type": "font/woff2",
    "etag": "\"3bd2c-byCgRpF7+G1LbMKcTiUVvWTSy5s\"",
    "mtime": "2026-01-21T12:48:12.833Z",
    "size": 245036,
    "path": "../public/_nuxt/Inter-italic.var.DhD-tpjY.woff2"
  },
  "/_nuxt/Inter-roman.var.C-r5W2Hj.woff2": {
    "type": "font/woff2",
    "etag": "\"3776c-eiYC0uuwjOiV4zrdtv5ZXxApQx4\"",
    "mtime": "2026-01-21T12:48:12.833Z",
    "size": 227180,
    "path": "../public/_nuxt/Inter-roman.var.C-r5W2Hj.woff2"
  },
  "/_nuxt/IpVeAzdA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b4c1-S9xNNB1+BumIW4TqWfzurtUfZNs\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 111809,
    "path": "../public/_nuxt/IpVeAzdA.js"
  },
  "/_nuxt/kmzpRPYk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c81-/wnsp+dbx3eiKRTl4ZMlLasbP6s\"",
    "mtime": "2026-01-21T12:48:12.846Z",
    "size": 3201,
    "path": "../public/_nuxt/kmzpRPYk.js"
  },
  "/_nuxt/lIINk6VJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13664-3/YnX9N0WE8148JoDE5wDZ3xfYI\"",
    "mtime": "2026-01-21T12:48:12.846Z",
    "size": 79460,
    "path": "../public/_nuxt/lIINk6VJ.js"
  },
  "/_nuxt/logs.xIzu6v38.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"12e-a5Eg/J9AsdlmMQB3KcEUZk/I3DQ\"",
    "mtime": "2026-01-21T12:48:12.836Z",
    "size": 302,
    "path": "../public/_nuxt/logs.xIzu6v38.css"
  },
  "/_nuxt/LPRVApkV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"38cc6-BswdeUGoEUOHjYhuGVwLVSDKnIU\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 232646,
    "path": "../public/_nuxt/LPRVApkV.js"
  },
  "/_nuxt/map-bounds.CgN4PItp.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"7119-+934O+VCHwzYq78MAfnvf9+l1DY\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 28953,
    "path": "../public/_nuxt/map-bounds.CgN4PItp.css"
  },
  "/_nuxt/map.client.a3ZRiWiE.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"4b13-UmstNbSZCo5l97zseesDUJAosVk\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 19219,
    "path": "../public/_nuxt/map.client.a3ZRiWiE.css"
  },
  "/_nuxt/ota-updates.1lxbf4Mv.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"d3-SiMZNA0ql3XNcHocPUInOyw0ydI\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 211,
    "path": "../public/_nuxt/ota-updates.1lxbf4Mv.css"
  },
  "/_nuxt/primeicons.BubJZjaf.svg": {
    "type": "image/svg+xml",
    "etag": "\"4727e-0zMqRSQrj27b8/PHF2ooDn7c2WE\"",
    "mtime": "2026-01-21T12:48:12.834Z",
    "size": 291454,
    "path": "../public/_nuxt/primeicons.BubJZjaf.svg"
  },
  "/_nuxt/primeicons.CCFeZR6K.woff": {
    "type": "font/woff",
    "etag": "\"11a58-sWSLUL4TNQ/ei12ab+eDVN3MQ+Q\"",
    "mtime": "2026-01-21T12:48:12.834Z",
    "size": 72280,
    "path": "../public/_nuxt/primeicons.CCFeZR6K.woff"
  },
  "/_nuxt/primeicons.Dk_eWBPK.eot": {
    "type": "application/vnd.ms-fontobject",
    "etag": "\"11abc-5N8jVcQFzTiq2jbtqQFagQ/quUw\"",
    "mtime": "2026-01-21T12:48:12.806Z",
    "size": 72380,
    "path": "../public/_nuxt/primeicons.Dk_eWBPK.eot"
  },
  "/_nuxt/primeicons.DsZ1W7-Z.woff2": {
    "type": "font/woff2",
    "etag": "\"75e4-VaSypfAuNiQF2Nh0kDrwtfamwV0\"",
    "mtime": "2026-01-21T12:48:12.833Z",
    "size": 30180,
    "path": "../public/_nuxt/primeicons.DsZ1W7-Z.woff2"
  },
  "/_nuxt/primeicons.NDVQFXzF.ttf": {
    "type": "font/ttf",
    "etag": "\"11a0c-zutG1ZT95cxQfN+LcOOOeP5HZTw\"",
    "mtime": "2026-01-21T12:48:12.833Z",
    "size": 72204,
    "path": "../public/_nuxt/primeicons.NDVQFXzF.ttf"
  },
  "/_nuxt/spritesheet.DpIxuf5L.svg": {
    "type": "image/svg+xml",
    "etag": "\"15af-R+aqbWT45vbnpwZ8sNQWUhNckiI\"",
    "mtime": "2026-01-21T12:48:12.836Z",
    "size": 5551,
    "path": "../public/_nuxt/spritesheet.DpIxuf5L.svg"
  },
  "/_nuxt/table.DQDoLwr6.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"54f9-16YXdeypVT0C9t786vCe/8PyAXg\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 21753,
    "path": "../public/_nuxt/table.DQDoLwr6.css"
  },
  "/_nuxt/tabler-icons.5JjTyLEB.woff": {
    "type": "font/woff",
    "etag": "\"bd5c0-YCA/99wtISTC/lOyvL43q2hV6ZA\"",
    "mtime": "2026-01-21T12:48:12.882Z",
    "size": 775616,
    "path": "../public/_nuxt/tabler-icons.5JjTyLEB.woff"
  },
  "/_nuxt/tabler-icons.Bj6HnZqC.ttf": {
    "type": "font/ttf",
    "etag": "\"173860-kc/g0plr/ALuu1ztMnSmd2Fsrt0\"",
    "mtime": "2026-01-21T12:48:12.851Z",
    "size": 1521760,
    "path": "../public/_nuxt/tabler-icons.Bj6HnZqC.ttf"
  },
  "/_nuxt/tabler-icons.CdTAjtqK.woff2": {
    "type": "font/woff2",
    "etag": "\"86cd0-zF39mUZwrhCo/C/n+868oRu6Y90\"",
    "mtime": "2026-01-21T12:48:12.846Z",
    "size": 552144,
    "path": "../public/_nuxt/tabler-icons.CdTAjtqK.woff2"
  },
  "/_nuxt/tabler-icons.D91Td7Em.eot": {
    "type": "application/vnd.ms-fontobject",
    "etag": "\"173918-l5vubHOqeSiGE+NgsgW9vj4T4uU\"",
    "mtime": "2026-01-21T12:48:12.851Z",
    "size": 1521944,
    "path": "../public/_nuxt/tabler-icons.D91Td7Em.eot"
  },
  "/_nuxt/tabler-icons.DkKlmoMw.svg": {
    "type": "image/svg+xml",
    "etag": "\"5c43f3-YOaFY4POjuxIICBlHhDrWSrRBQA\"",
    "mtime": "2026-01-21T12:48:12.893Z",
    "size": 6046707,
    "path": "../public/_nuxt/tabler-icons.DkKlmoMw.svg"
  },
  "/_nuxt/violation.C2Bf03cv.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"4111-eMw0DUuedBsqhRECOZ7PYdhOH80\"",
    "mtime": "2026-01-21T12:48:12.838Z",
    "size": 16657,
    "path": "../public/_nuxt/violation.C2Bf03cv.css"
  },
  "/_nuxt/xF50vSua.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22d0-dlW8sLn2VWu26xuU8v2noj7UJd0\"",
    "mtime": "2026-01-21T12:48:12.845Z",
    "size": 8912,
    "path": "../public/_nuxt/xF50vSua.js"
  },
  "/_nuxt/_number_plate_.BS-cLpwj.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"10c-4AE6VCW2KkpDiZAk3vuy5co938o\"",
    "mtime": "2026-01-21T12:48:12.837Z",
    "size": 268,
    "path": "../public/_nuxt/_number_plate_.BS-cLpwj.css"
  },
  "/_nuxt/_zCzPqjq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fc-qOAS+8UsN9c7jnt1aAE9ajQJo7g\"",
    "mtime": "2026-01-21T12:48:12.846Z",
    "size": 252,
    "path": "../public/_nuxt/_zCzPqjq.js"
  },
  "/libs/bootstrap/LICENSE": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"46b-MbhczoxDmb7dRY3KU6D/203QvTY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1131,
    "path": "../public/libs/bootstrap/LICENSE"
  },
  "/libs/bootstrap/package.json": {
    "type": "application/json",
    "etag": "\"2446-M0qOjq+m/uDKh5arMwaHtlU+S34\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9286,
    "path": "../public/libs/bootstrap/package.json"
  },
  "/libs/bootstrap/README.md": {
    "type": "text/markdown; charset=utf-8",
    "etag": "\"35af-gBgQfVn/ixt+39a98byu7DAJDqU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 13743,
    "path": "../public/libs/bootstrap/README.md"
  },
  "/libs/jquery/AUTHORS.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2ea9-Skvp4FBBf8EZX8aFYt57pquKHDI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 11945,
    "path": "../public/libs/jquery/AUTHORS.txt"
  },
  "/libs/jquery/bower.json": {
    "type": "application/json",
    "etag": "\"be-AAUwunq1/2NrEDuvRg5ftwNe5dA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 190,
    "path": "../public/libs/jquery/bower.json"
  },
  "/libs/jquery/LICENSE.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"447-/POiR0rg2ObOOeS8kVkV5LS9Mrg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1095,
    "path": "../public/libs/jquery/LICENSE.txt"
  },
  "/libs/jquery/package.json": {
    "type": "application/json",
    "etag": "\"b36-jVRSR4bwrC2U/ORzZYqaOiWhdLc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2870,
    "path": "../public/libs/jquery/package.json"
  },
  "/libs/jquery/README.md": {
    "type": "text/markdown; charset=utf-8",
    "etag": "\"7cd-M94QD/3ckk/DsRCUwvdVETjSfX8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1997,
    "path": "../public/libs/jquery/README.md"
  },
  "/libs/simplebar/LICENSE": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"438-levfHiB/wrg1OwyptA+INCHkWvk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1080,
    "path": "../public/libs/simplebar/LICENSE"
  },
  "/libs/simplebar/package.json": {
    "type": "application/json",
    "etag": "\"6b7-n28hkO9p9QJPGRIvDmYVmfvbHow\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1719,
    "path": "../public/libs/simplebar/package.json"
  },
  "/libs/simplebar/README.md": {
    "type": "text/markdown; charset=utf-8",
    "etag": "\"2fdc-nvKrWXGht3VJd8M7taS9K2xhvWY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 12252,
    "path": "../public/libs/simplebar/README.md"
  },
  "/_nuxt/builds/latest.json": {
    "type": "application/json",
    "etag": "\"47-K+ycQqujTZPIb19RdzoYuT9KRm8\"",
    "mtime": "2026-01-21T12:48:47.948Z",
    "size": 71,
    "path": "../public/_nuxt/builds/latest.json"
  },
  "/css/icons/tabler-icons/tabler-icons.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"23dd0-HttQ17eOdgVtGKNoD+E17mNJRAo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 146896,
    "path": "../public/css/icons/tabler-icons/tabler-icons.css"
  },
  "/libs/bootstrap/js/index.esm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"371-PEnDJfohf2QcTnXNjk0jZ1O1leQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 881,
    "path": "../public/libs/bootstrap/js/index.esm.js"
  },
  "/libs/bootstrap/js/index.umd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"350-YtFQ2vD6LBJHXlqLEhc8F4dtwQU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 848,
    "path": "../public/libs/bootstrap/js/index.umd.js"
  },
  "/libs/jquery/dist/core.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"23cd-gqsYkjFe4BNMwIQrHs/t5f1TQwQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9165,
    "path": "../public/libs/jquery/dist/core.js"
  },
  "/libs/jquery/dist/jquery.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4453d-3DpgI11ERF8AFlpJpuo/w+ESVGs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 279869,
    "path": "../public/libs/jquery/dist/jquery.js"
  },
  "/libs/jquery/dist/jquery.min.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15857-5JJRlvb0RPpYkVQg+82A+QnGjSg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 88151,
    "path": "../public/libs/jquery/dist/jquery.min.js"
  },
  "/libs/jquery/dist/jquery.min.map": {
    "type": "application/json",
    "etag": "\"214d3-grfKdoKgFNvT/GPgtxvYB/XoaWc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 136403,
    "path": "../public/libs/jquery/dist/jquery.min.map"
  },
  "/libs/jquery/dist/jquery.slim.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"374df-zn87o8c3tPNE4H2+aDstfy4GX4A\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 226527,
    "path": "../public/libs/jquery/dist/jquery.slim.js"
  },
  "/libs/jquery/dist/jquery.slim.min.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11583-jiyTGyuWX5h7/ARECGSeL7RgkRc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 71043,
    "path": "../public/libs/jquery/dist/jquery.slim.min.js"
  },
  "/libs/jquery/dist/jquery.slim.min.map": {
    "type": "application/json",
    "etag": "\"1a8db-XTc2ksbg2dajo+BTluJ3dOOQH9I\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 108763,
    "path": "../public/libs/jquery/dist/jquery.slim.min.map"
  },
  "/libs/bootstrap/scss/bootstrap-grid.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"49f-NzNGZ76N5zCb5+Cc+94b/CXnbic\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1183,
    "path": "../public/libs/bootstrap/scss/bootstrap-grid.scss"
  },
  "/libs/bootstrap/scss/bootstrap-reboot.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"bd-W7JReJLqrZQxZ0/N7KLrKWBjZYI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 189,
    "path": "../public/libs/bootstrap/scss/bootstrap-reboot.scss"
  },
  "/libs/bootstrap/scss/bootstrap-utilities.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"132-bQdMZgCStN51UBDJxs6uw8UXbZ4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 306,
    "path": "../public/libs/bootstrap/scss/bootstrap-utilities.scss"
  },
  "/libs/bootstrap/scss/bootstrap.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"3aa-EqfxQezYyr5wb6w8c/74VcZU6Wo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 938,
    "path": "../public/libs/bootstrap/scss/bootstrap.scss"
  },
  "/libs/bootstrap/scss/_accordion.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"13ca-MB669eMqakF7SRnWrVzMSXaDiAA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5066,
    "path": "../public/libs/bootstrap/scss/_accordion.scss"
  },
  "/libs/bootstrap/scss/_alert.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"819-zk1KRU5Agzw0uYf4KffrV0Q+O8k\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2073,
    "path": "../public/libs/bootstrap/scss/_alert.scss"
  },
  "/libs/bootstrap/scss/_badge.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"45e-DN4rC313hmRpPOyG8OM7v/hM2YI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1118,
    "path": "../public/libs/bootstrap/scss/_badge.scss"
  },
  "/libs/bootstrap/scss/_breadcrumb.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"6d7-OcGm6ExWUPDVcC6Y4rAVikraE4c\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1751,
    "path": "../public/libs/bootstrap/scss/_breadcrumb.scss"
  },
  "/libs/bootstrap/scss/_button-group.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"c81-SpnXUFTjdYjTb/V+o6OfsPywH5g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3201,
    "path": "../public/libs/bootstrap/scss/_button-group.scss"
  },
  "/libs/bootstrap/scss/_buttons.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1a7a-Wz44ohp9GKbxSxvop+rW9M1p3nY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6778,
    "path": "../public/libs/bootstrap/scss/_buttons.scss"
  },
  "/libs/bootstrap/scss/_card.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1b43-nzkvWzSBfbCcUsKk6cPYotr1c7g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6979,
    "path": "../public/libs/bootstrap/scss/_card.scss"
  },
  "/libs/bootstrap/scss/_carousel.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"16f7-WWTuRp2Hqq+lt9zOQ95ZAosAdGs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5879,
    "path": "../public/libs/bootstrap/scss/_carousel.scss"
  },
  "/libs/bootstrap/scss/_close.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"7e2-S4wCPEVCsmZI1iaIdumYXLvDiDw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2018,
    "path": "../public/libs/bootstrap/scss/_close.scss"
  },
  "/libs/bootstrap/scss/_containers.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"4b1-NyNNLwsY8/IBRppAJid5abfTKcw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1201,
    "path": "../public/libs/bootstrap/scss/_containers.scss"
  },
  "/libs/bootstrap/scss/_dropdown.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1f9d-4DQGoDEJ0WT6Fe9h3+2HGO/oFCA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8093,
    "path": "../public/libs/bootstrap/scss/_dropdown.scss"
  },
  "/libs/bootstrap/scss/_forms.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"100-7sCu5xG0G1YhYCW87xUpZMCy3C8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 256,
    "path": "../public/libs/bootstrap/scss/_forms.scss"
  },
  "/libs/bootstrap/scss/_functions.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"293a-m6Vg4v61jzoPTJMqWQe518YWxio\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10554,
    "path": "../public/libs/bootstrap/scss/_functions.scss"
  },
  "/libs/bootstrap/scss/_grid.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"2ab-SrmccRFofDkGpuGgMwMtBIOC5Fk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 683,
    "path": "../public/libs/bootstrap/scss/_grid.scss"
  },
  "/libs/bootstrap/scss/_helpers.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"161-I/2vAzb6AV5jKerS+gaay0l6K+o\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 353,
    "path": "../public/libs/bootstrap/scss/_helpers.scss"
  },
  "/libs/bootstrap/scss/_images.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"486-AHk3BJDiab7MBE5/n6JxTPKsDnI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1158,
    "path": "../public/libs/bootstrap/scss/_images.scss"
  },
  "/libs/bootstrap/scss/_list-group.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1ac4-ovY/cwo2McQA94iXbL4rs6/KD0A\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6852,
    "path": "../public/libs/bootstrap/scss/_list-group.scss"
  },
  "/libs/bootstrap/scss/_maps.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1775-2CfaIoD/G89QsK9Jdd/7nPPLE78\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6005,
    "path": "../public/libs/bootstrap/scss/_maps.scss"
  },
  "/libs/bootstrap/scss/_mixins.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"36b-6/oCuLL+XYjf8rjYmxjHay3rLxI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 875,
    "path": "../public/libs/bootstrap/scss/_mixins.scss"
  },
  "/libs/bootstrap/scss/_modal.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1e52-wSJ2dA4tnRpcrGJMFfMldnN2qLw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 7762,
    "path": "../public/libs/bootstrap/scss/_modal.scss"
  },
  "/libs/bootstrap/scss/_nav.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1587-Cn9Ew2f6ztMk2bk9gHk+sMhmABE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5511,
    "path": "../public/libs/bootstrap/scss/_nav.scss"
  },
  "/libs/bootstrap/scss/_navbar.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"23c3-LYaEvrurRJfoYiuHf/h6qXTaRU0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9155,
    "path": "../public/libs/bootstrap/scss/_navbar.scss"
  },
  "/libs/bootstrap/scss/_offcanvas.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1275-sCDC2iWWuOddonZ76VkTTyhx090\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4725,
    "path": "../public/libs/bootstrap/scss/_offcanvas.scss"
  },
  "/libs/bootstrap/scss/_pagination.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"f6b-67DgWKtcUnVf7R1KVVMY4FEsU5g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3947,
    "path": "../public/libs/bootstrap/scss/_pagination.scss"
  },
  "/libs/bootstrap/scss/_placeholders.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"35b-Ae31ouQf67KHbn3doa9A1JeNrWU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 859,
    "path": "../public/libs/bootstrap/scss/_placeholders.scss"
  },
  "/libs/bootstrap/scss/_popover.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1afb-fnmOckXjLKYmVipu2lp0SFtKW90\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6907,
    "path": "../public/libs/bootstrap/scss/_popover.scss"
  },
  "/libs/bootstrap/scss/_progress.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"7e0-tu91rQtTcDkdstQyvKMtmxwnask\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2016,
    "path": "../public/libs/bootstrap/scss/_progress.scss"
  },
  "/libs/bootstrap/scss/_reboot.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"306b-pHjCzpIh94MeV3GrJhwtFjXnl3U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 12395,
    "path": "../public/libs/bootstrap/scss/_reboot.scss"
  },
  "/libs/bootstrap/scss/_root.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1a77-o79hCJlEyhVJ+5tVHi9c/5keFts\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6775,
    "path": "../public/libs/bootstrap/scss/_root.scss"
  },
  "/libs/bootstrap/scss/_spinners.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"97d-IuKztVosTZhoBrUg3MuTbsBsn/w\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2429,
    "path": "../public/libs/bootstrap/scss/_spinners.scss"
  },
  "/libs/bootstrap/scss/_tables.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1351-1sTwLGxOzw5vvp5IO6PLV6BxhfI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4945,
    "path": "../public/libs/bootstrap/scss/_tables.scss"
  },
  "/libs/bootstrap/scss/_toasts.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"9ba-jix02amTRLa3LLqJldBVobXRFlQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2490,
    "path": "../public/libs/bootstrap/scss/_toasts.scss"
  },
  "/libs/bootstrap/scss/_tooltip.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"10b9-SAiXptC+zGzDw5CyJH1cB61V/tQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4281,
    "path": "../public/libs/bootstrap/scss/_tooltip.scss"
  },
  "/libs/bootstrap/scss/_transitions.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1a9-Gaxe9FJ0HCtJbq5YK1jMyRsi7BI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 425,
    "path": "../public/libs/bootstrap/scss/_transitions.scss"
  },
  "/libs/bootstrap/scss/_type.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"58c-UQFyS0DWRuhV2PVLCoRHbbWyK0U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1420,
    "path": "../public/libs/bootstrap/scss/_type.scss"
  },
  "/libs/bootstrap/scss/_utilities.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"4af3-9ALumGwqtntti1remxUsIkOWhaQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 19187,
    "path": "../public/libs/bootstrap/scss/_utilities.scss"
  },
  "/libs/bootstrap/scss/_variables-dark.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1348-Bftf05+CuNQmjzyArsww0husHOk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4936,
    "path": "../public/libs/bootstrap/scss/_variables-dark.scss"
  },
  "/libs/bootstrap/scss/_variables.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1285c-K3PMi4ul5G2Y7doWRIxExErid3c\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 75868,
    "path": "../public/libs/bootstrap/scss/_variables.scss"
  },
  "/libs/jquery/src/.eslintrc.json": {
    "type": "application/json",
    "etag": "\"60-Nk1mJgSg53104oL9sW3k+QbfvJo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 96,
    "path": "../public/libs/jquery/src/.eslintrc.json"
  },
  "/libs/jquery/src/ajax.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"57bf-YMFjK3M74aPNq/SlSnuj1M+/WZc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 22463,
    "path": "../public/libs/jquery/src/ajax.js"
  },
  "/libs/jquery/src/attributes.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d9-UbaieSlxtfZwS2Q90ks6f47L4oA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 217,
    "path": "../public/libs/jquery/src/attributes.js"
  },
  "/libs/jquery/src/callbacks.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15b0-3uaXcc7jm73EaNccMyvGWPyk5W4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5552,
    "path": "../public/libs/jquery/src/callbacks.js"
  },
  "/libs/jquery/src/core.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"23cd-gqsYkjFe4BNMwIQrHs/t5f1TQwQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9165,
    "path": "../public/libs/jquery/src/core.js"
  },
  "/libs/jquery/src/css.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3604-/x0NMwLFuJMHZ6xykg6lt/FDX2A\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 13828,
    "path": "../public/libs/jquery/src/css.js"
  },
  "/libs/jquery/src/data.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10e1-mfCDH4nSmo+O1RNbWHz1Bl5eY3o\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4321,
    "path": "../public/libs/jquery/src/data.js"
  },
  "/libs/jquery/src/deferred.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2af5-GRVry4MlrO/xRUP8chuA8cwaB+0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10997,
    "path": "../public/libs/jquery/src/deferred.js"
  },
  "/libs/jquery/src/deprecated.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9a3-HcCPFu2zRqAyWWJ08zI7SudFruw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2467,
    "path": "../public/libs/jquery/src/deprecated.js"
  },
  "/libs/jquery/src/dimensions.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6d7-azY3V1BtQr+J7wCMsmEBL99Fc3Y\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1751,
    "path": "../public/libs/jquery/src/dimensions.js"
  },
  "/libs/jquery/src/effects.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"442f-Nj2RzPAJc2FRh7TvDx5GQRPEVaY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 17455,
    "path": "../public/libs/jquery/src/effects.js"
  },
  "/libs/jquery/src/event.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5eab-qAlmKZquv+Nqd/GmWsqkFKHDCjg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 24235,
    "path": "../public/libs/jquery/src/event.js"
  },
  "/libs/jquery/src/jquery.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"26e-ray5BpAstGSVmP2aX9xx9m9Ynu8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 622,
    "path": "../public/libs/jquery/src/jquery.js"
  },
  "/libs/jquery/src/manipulation.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3163-rkRPXDBGJEi7vT/54appSiSq3hI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 12643,
    "path": "../public/libs/jquery/src/manipulation.js"
  },
  "/libs/jquery/src/offset.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ad4-0NPbtXOmaAb9/ijhH4aAI+n+VaI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6868,
    "path": "../public/libs/jquery/src/offset.js"
  },
  "/libs/jquery/src/queue.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c13-G/uOEsVhDtPUr9UBshYjTFInDpg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3091,
    "path": "../public/libs/jquery/src/queue.js"
  },
  "/libs/jquery/src/selector-native.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18fa-1AyDV0tN4Y76MgD/gKnyu81H6CI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6394,
    "path": "../public/libs/jquery/src/selector-native.js"
  },
  "/libs/jquery/src/selector-sizzle.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19b-hYL4JN6EsD3G7anJ+B5NQlmB+3o\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 411,
    "path": "../public/libs/jquery/src/selector-sizzle.js"
  },
  "/libs/jquery/src/selector.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42-lUDmPneJdJQvs36vxjaD2bQfXQY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 66,
    "path": "../public/libs/jquery/src/selector.js"
  },
  "/libs/jquery/src/serialize.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca9-LcxFkKimStloS7dFmJ406NrNBiE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3241,
    "path": "../public/libs/jquery/src/serialize.js"
  },
  "/libs/jquery/src/traversing.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1194-8P8i7l+Z5KcSXS7KABGcSWJvyw8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4500,
    "path": "../public/libs/jquery/src/traversing.js"
  },
  "/libs/jquery/src/wrap.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5c5-WLR0GBfNyBwKHzys86y5PmNpWWg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1477,
    "path": "../public/libs/jquery/src/wrap.js"
  },
  "/libs/simplebar/dist/simplebar-core.esm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8003-asliqK+3a+0ppRmF31lnl9lBRps\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 32771,
    "path": "../public/libs/simplebar/dist/simplebar-core.esm.js"
  },
  "/libs/simplebar/dist/simplebar-core.esm.js.map": {
    "type": "application/json",
    "etag": "\"fba9-LlPwdbUjVwVRNfyit3ixmnIq3XM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 64425,
    "path": "../public/libs/simplebar/dist/simplebar-core.esm.js.map"
  },
  "/libs/simplebar/dist/simplebar.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"f32-f1DMiNfMWPAPO/8XiEe3tRYjk7M\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3890,
    "path": "../public/libs/simplebar/dist/simplebar.css"
  },
  "/libs/simplebar/dist/simplebar.esm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8eb2-Mwk824tRWjDDhHNI/A3vGLcct4I\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 36530,
    "path": "../public/libs/simplebar/dist/simplebar.esm.js"
  },
  "/libs/simplebar/dist/simplebar.esm.js.map": {
    "type": "application/json",
    "etag": "\"11869-n7V6nvkYl7d+YHSwqU3k1oKenZQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 71785,
    "path": "../public/libs/simplebar/dist/simplebar.esm.js.map"
  },
  "/libs/simplebar/dist/simplebar.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"29f77-Cq4j8O4HGgYbH3R3EfFla+0Zh+s\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 171895,
    "path": "../public/libs/simplebar/dist/simplebar.js"
  },
  "/libs/simplebar/dist/simplebar.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"b79-OTxYzKeIkhf8DFKOeQL9UXgxTlA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2937,
    "path": "../public/libs/simplebar/dist/simplebar.min.css"
  },
  "/libs/simplebar/dist/simplebar.min.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e696-1NPgReFta1WQWtXj4Do3/AHynn0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 59030,
    "path": "../public/libs/simplebar/dist/simplebar.min.js"
  },
  "/libs/simplebar/dist/simplebar.umd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11fc-ZqE9oj5N0w0y701dRCkdOX66zIQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4604,
    "path": "../public/libs/simplebar/dist/simplebar.umd.js"
  },
  "/libs/simplebar/src/helpers.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"450-E8oWKIq3NmFXmX4wCL/7asZEu80\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1104,
    "path": "../public/libs/simplebar/src/helpers.js"
  },
  "/libs/simplebar/src/index.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d23-Dmv2MjE0/ssY4dzLs1twmGRzYXA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3363,
    "path": "../public/libs/simplebar/src/index.js"
  },
  "/libs/simplebar/src/scrollbar-width.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3b9-iiWPMla0/DSBCHkPrPwAT6qIUZ8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 953,
    "path": "../public/libs/simplebar/src/scrollbar-width.js"
  },
  "/libs/simplebar/src/simplebar.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"f32-f1DMiNfMWPAPO/8XiEe3tRYjk7M\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3890,
    "path": "../public/libs/simplebar/src/simplebar.css"
  },
  "/libs/simplebar/src/simplebar.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"746a-zZLJJyYePoR4cmOMOhyA6W0ok5s\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 29802,
    "path": "../public/libs/simplebar/src/simplebar.js"
  },
  "/_nuxt/builds/meta/c38317ee-a7f3-4261-92b4-76ac348e7385.json": {
    "type": "application/json",
    "etag": "\"8b-spezp7+KQX39HzdlLIkQR5y8t5k\"",
    "mtime": "2026-01-21T12:48:47.950Z",
    "size": 139,
    "path": "../public/_nuxt/builds/meta/c38317ee-a7f3-4261-92b4-76ac348e7385.json"
  },
  "/css/icons/tabler-icons/fonts/tabler-icons.eot": {
    "type": "application/vnd.ms-fontobject",
    "etag": "\"173918-l5vubHOqeSiGE+NgsgW9vj4T4uU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1521944,
    "path": "../public/css/icons/tabler-icons/fonts/tabler-icons.eot"
  },
  "/css/icons/tabler-icons/fonts/tabler-icons.svg": {
    "type": "image/svg+xml",
    "etag": "\"5c43f3-YOaFY4POjuxIICBlHhDrWSrRBQA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6046707,
    "path": "../public/css/icons/tabler-icons/fonts/tabler-icons.svg"
  },
  "/css/icons/tabler-icons/fonts/tabler-icons.ttf": {
    "type": "font/ttf",
    "etag": "\"173860-kc/g0plr/ALuu1ztMnSmd2Fsrt0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1521760,
    "path": "../public/css/icons/tabler-icons/fonts/tabler-icons.ttf"
  },
  "/css/icons/tabler-icons/fonts/tabler-icons.woff": {
    "type": "font/woff",
    "etag": "\"bd5c0-YCA/99wtISTC/lOyvL43q2hV6ZA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 775616,
    "path": "../public/css/icons/tabler-icons/fonts/tabler-icons.woff"
  },
  "/css/icons/tabler-icons/fonts/tabler-icons.woff2": {
    "type": "font/woff2",
    "etag": "\"86cd0-zF39mUZwrhCo/C/n+868oRu6Y90\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 552144,
    "path": "../public/css/icons/tabler-icons/fonts/tabler-icons.woff2"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"12760-VaQh4P8V+KAbMBokM9Ibt3pwLqU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 75616,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.css.map": {
    "type": "application/json",
    "etag": "\"372e2-JooMAKX+CYmPu90qzHtNcrFMK6Q\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 226018,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"dc90-sVZU20HvKpsnieRU0oNJa/R3muY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 56464,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.min.css.map": {
    "type": "application/json",
    "etag": "\"22c06-A545PS1VI3WKumkHdCxmjReYkao\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 142342,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.min.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.rtl.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"127aa-y2vBZhbN70TuW6PWG2BxFzuBlFI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 75690,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.rtl.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.rtl.css.map": {
    "type": "application/json",
    "etag": "\"372e6-TeL7RGWSAJcYIe3+NR45LWWuNXI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 226022,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.rtl.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.rtl.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"dcdb-CImlb+pe5ytJOS+hFKV3hKeRbbM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 56539,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.rtl.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-grid.rtl.min.css.map": {
    "type": "application/json",
    "etag": "\"22c53-C2axszyIzhPnqhmfjVAcZu1T1Wc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 142419,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-grid.rtl.min.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"2dd7-63ka5KqyGPdwSgJbCSuosLnoKRc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 11735,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.css.map": {
    "type": "application/json",
    "etag": "\"1eea2-0Far5XpDIKgGdkj8f8I8kfsNCQU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 126626,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"2659-0AWOzAPlgbZ1tlP8j5IXiDolMCY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9817,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.min.css.map": {
    "type": "application/json",
    "etag": "\"c8ce-58IcXPz1UPn7cPC9nbRSvU6tAh0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 51406,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.min.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.rtl.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"2dd0-181KgD3nWsB5aTuueQIk4awardM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 11728,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.rtl.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.rtl.css.map": {
    "type": "application/json",
    "etag": "\"1eeb1-kjMtgpNtYT65RhwOA+wcuK51lgw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 126641,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.rtl.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.rtl.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"26a1-6DPXMnLRfnGETCiJpFbaCKux+T4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9889,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.rtl.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-reboot.rtl.min.css.map": {
    "type": "application/json",
    "etag": "\"f89b-MwCupjQRx/odcolkv5dCKqX/aa4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 63643,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-reboot.rtl.min.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"177fe-GFPKh7g6663U4DN5apuXngZPLUE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 96254,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.css.map": {
    "type": "application/json",
    "etag": "\"3d339-cw1sPg6viOKKPcoA+DgtqRspTDw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 250681,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"12487-d9dq+ahuHxc5ynPXox9Wk0MErmY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 74887,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.min.css.map": {
    "type": "application/json",
    "etag": "\"28029-6sLFnSdyWep8dttfRSdF8HSIP6c\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 163881,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.min.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.rtl.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"17779-MlKWZlCd1f+n6Vs1M1OsCHUqlVo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 96121,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.rtl.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.rtl.css.map": {
    "type": "application/json",
    "etag": "\"3d2fe-zXi1UlbiaP0cESehQIOFoumRHwA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 250622,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.rtl.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.rtl.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1243f-QGBVcj85xDt9VuZyZuxLkLCbr1E\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 74815,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.rtl.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap-utilities.rtl.min.css.map": {
    "type": "application/json",
    "etag": "\"27f84-6hOqNlRZv9rBox8NhtWj6iwfkSE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 163716,
    "path": "../public/libs/bootstrap/dist/css/bootstrap-utilities.rtl.min.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"414d4-eFpIPlUTzvgfAliH1PIF0fSAGrs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 267476,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.css"
  },
  "/libs/bootstrap/dist/css/bootstrap.css.map": {
    "type": "application/json",
    "etag": "\"a0c1c-EurADggLW0BudCNlPVFDepf5mEc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 658460,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"35e6c-cZlWqlLbTIr9xcDPs8verWJYuKY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 220780,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap.min.css.map": {
    "type": "application/json",
    "etag": "\"8ac58-k9uxWlA29DanIT92/MgqqCF2n/A\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 568408,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.min.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap.rtl.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"4132f-QH1sWjvjO9JhHMOrJ8ZQJ+34KvA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 267055,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.rtl.css"
  },
  "/libs/bootstrap/dist/css/bootstrap.rtl.css.map": {
    "type": "application/json",
    "etag": "\"a0b81-HcLZMPqLTShL/c7nGCUfldWQlxk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 658305,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.rtl.css.map"
  },
  "/libs/bootstrap/dist/css/bootstrap.rtl.min.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"35ed7-+d5Lm8GjCqhlKn7NjGIUSNUaSK0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 220887,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.rtl.min.css"
  },
  "/libs/bootstrap/dist/css/bootstrap.rtl.min.css.map": {
    "type": "application/json",
    "etag": "\"8aa8b-M3A5i8Mmg2xcWG6A9UPMfqHiZH4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 567947,
    "path": "../public/libs/bootstrap/dist/css/bootstrap.rtl.min.css.map"
  },
  "/libs/bootstrap/dist/js/bootstrap.bundle.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"32da0-k0x6wgGF7pCDv1W8N5MIZRD7oT4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 208288,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.bundle.js"
  },
  "/libs/bootstrap/dist/js/bootstrap.bundle.js.map": {
    "type": "application/json",
    "etag": "\"6d974-E7m5lSN9+fDnuuyOHOtTFAYoHn0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 448884,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.bundle.js.map"
  },
  "/libs/bootstrap/dist/js/bootstrap.bundle.min.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13ad7-v/eN2cAqUAirQ2QpSHOc5Yx2GyE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 80599,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.bundle.min.js"
  },
  "/libs/bootstrap/dist/js/bootstrap.bundle.min.js.map": {
    "type": "application/json",
    "etag": "\"51896-rvtmTwZmfgWINF3TB1d55HCjDLQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 333974,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.bundle.min.js.map"
  },
  "/libs/bootstrap/dist/js/bootstrap.esm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"21433-8Ki7vXeOOQLjUqoe7NuyZ1jt2Vw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 136243,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.esm.js"
  },
  "/libs/bootstrap/dist/js/bootstrap.esm.js.map": {
    "type": "application/json",
    "etag": "\"4a87a-PEZOMH95fkqBaXle6+JiBrNensk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 305274,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.esm.js.map"
  },
  "/libs/bootstrap/dist/js/bootstrap.esm.min.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12197-FZiI5Gd+lkVhXBy05ev4OqIVRBA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 74135,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.esm.min.js"
  },
  "/libs/bootstrap/dist/js/bootstrap.esm.min.js.map": {
    "type": "application/json",
    "etag": "\"36376-aDZzrDIJc75Hmc8L4KTU3KqpQAI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 222070,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.esm.min.js.map"
  },
  "/libs/bootstrap/dist/js/bootstrap.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2399b-34feajl2v9u5LHQBjM/Ny6RST3s\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 145819,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.js"
  },
  "/libs/bootstrap/dist/js/bootstrap.js.map": {
    "type": "application/json",
    "etag": "\"4ad1a-MebNMmoocLjHdz5zKmhI0v8tXPE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 306458,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.js.map"
  },
  "/libs/bootstrap/dist/js/bootstrap.min.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ec8a-z/PmJCRGsgLcOzQ/ORPiUuHO4kQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 60554,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.min.js"
  },
  "/libs/bootstrap/dist/js/bootstrap.min.js.map": {
    "type": "application/json",
    "etag": "\"3531d-Cmsfi2+uB88IsLLPrucxCDYu7YQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 217885,
    "path": "../public/libs/bootstrap/dist/js/bootstrap.min.js.map"
  },
  "/libs/bootstrap/js/dist/alert.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c44-/cMfCEOjRYedscu5qxsNOn6P9UU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3140,
    "path": "../public/libs/bootstrap/js/dist/alert.js"
  },
  "/libs/bootstrap/js/dist/alert.js.map": {
    "type": "application/json",
    "etag": "\"10c6-KfwbExn6XpcyvRjoqNKJ8oq0w6k\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4294,
    "path": "../public/libs/bootstrap/js/dist/alert.js.map"
  },
  "/libs/bootstrap/js/dist/base-component.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c98-VNjEG99xfuCB+H5ozV3oEBqWKYk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3224,
    "path": "../public/libs/bootstrap/js/dist/base-component.js"
  },
  "/libs/bootstrap/js/dist/base-component.js.map": {
    "type": "application/json",
    "etag": "\"11fa-6mM0uu7O9QjbfswD0jGRNleEQhE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4602,
    "path": "../public/libs/bootstrap/js/dist/base-component.js.map"
  },
  "/libs/bootstrap/js/dist/button.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ac4-l3cpd+TWvFHFydSIiKfcdjw6QL0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2756,
    "path": "../public/libs/bootstrap/js/dist/button.js"
  },
  "/libs/bootstrap/js/dist/button.js.map": {
    "type": "application/json",
    "etag": "\"d8a-1QZ8w5Ti+KvrtEk0Jd5RZPqeMDY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3466,
    "path": "../public/libs/bootstrap/js/dist/button.js.map"
  },
  "/libs/bootstrap/js/dist/carousel.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"37c9-/lI7kfkq6+ZNC7G+7It+kZxNhps\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 14281,
    "path": "../public/libs/bootstrap/js/dist/carousel.js"
  },
  "/libs/bootstrap/js/dist/carousel.js.map": {
    "type": "application/json",
    "etag": "\"6b32-AdRjRToFMOMZqylWb7Q1JFu/br8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 27442,
    "path": "../public/libs/bootstrap/js/dist/carousel.js.map"
  },
  "/libs/bootstrap/js/dist/collapse.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24ef-LVDkyc2f+S3pMeURWvUp+mtOaNI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9455,
    "path": "../public/libs/bootstrap/js/dist/collapse.js"
  },
  "/libs/bootstrap/js/dist/collapse.js.map": {
    "type": "application/json",
    "etag": "\"4724-wVB+v6cBvAfvIOlErp1MBTNyYPw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 18212,
    "path": "../public/libs/bootstrap/js/dist/collapse.js.map"
  },
  "/libs/bootstrap/js/dist/dropdown.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f47-nfw8CaAVNS7kzm5NTcNpfx5TAg4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 16199,
    "path": "../public/libs/bootstrap/js/dist/dropdown.js"
  },
  "/libs/bootstrap/js/dist/dropdown.js.map": {
    "type": "application/json",
    "etag": "\"7308-WROsbwT1NLPmGtRzuTlOO6k30OA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 29448,
    "path": "../public/libs/bootstrap/js/dist/dropdown.js.map"
  },
  "/libs/bootstrap/js/dist/modal.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2fa2-MUFznY8eTuG3LQ+QFVYQ2RQ7f78\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 12194,
    "path": "../public/libs/bootstrap/js/dist/modal.js"
  },
  "/libs/bootstrap/js/dist/modal.js.map": {
    "type": "application/json",
    "etag": "\"586a-O5trHf/29OAT49vfC20SFq5E06o\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 22634,
    "path": "../public/libs/bootstrap/js/dist/modal.js.map"
  },
  "/libs/bootstrap/js/dist/offcanvas.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"23ce-pP6ZFRmdlW2VcDXargun2sY0/YY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9166,
    "path": "../public/libs/bootstrap/js/dist/offcanvas.js"
  },
  "/libs/bootstrap/js/dist/offcanvas.js.map": {
    "type": "application/json",
    "etag": "\"3f0e-heXO2C45+BpdTb7D6JA1/gBHbR8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 16142,
    "path": "../public/libs/bootstrap/js/dist/offcanvas.js.map"
  },
  "/libs/bootstrap/js/dist/popover.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b43-Sb8w/FTMrcQDY6NDRKn0MGtc8p0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2883,
    "path": "../public/libs/bootstrap/js/dist/popover.js"
  },
  "/libs/bootstrap/js/dist/popover.js.map": {
    "type": "application/json",
    "etag": "\"fd5-Yy3zpK7D27WS2KX1mMHNKWuBvlM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4053,
    "path": "../public/libs/bootstrap/js/dist/popover.js.map"
  },
  "/libs/bootstrap/js/dist/scrollspy.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"283f-CqOrcbc/QWT8jIFWLfBZIg4011g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10303,
    "path": "../public/libs/bootstrap/js/dist/scrollspy.js"
  },
  "/libs/bootstrap/js/dist/scrollspy.js.map": {
    "type": "application/json",
    "etag": "\"4a1d-bD7Q6JGtZptjIOcMlUJiLHrEX5o\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 18973,
    "path": "../public/libs/bootstrap/js/dist/scrollspy.js.map"
  },
  "/libs/bootstrap/js/dist/tab.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2997-+Zi5kiQE4NC6j9CxuWJTaFWaUWU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10647,
    "path": "../public/libs/bootstrap/js/dist/tab.js"
  },
  "/libs/bootstrap/js/dist/tab.js.map": {
    "type": "application/json",
    "etag": "\"4deb-aiStejCep8i3F3cqMtGwHugQam8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 19947,
    "path": "../public/libs/bootstrap/js/dist/tab.js.map"
  },
  "/libs/bootstrap/js/dist/toast.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19e8-j9cLOYNg8xbZdJpP7RIJuvxsfFY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6632,
    "path": "../public/libs/bootstrap/js/dist/toast.js"
  },
  "/libs/bootstrap/js/dist/toast.js.map": {
    "type": "application/json",
    "etag": "\"2ef2-uvXmK9hRblr/VOCa4jqWCk+kVms\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 12018,
    "path": "../public/libs/bootstrap/js/dist/toast.js.map"
  },
  "/libs/bootstrap/js/dist/tooltip.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4b19-uF4to3jnSpCCEuoIorBsLMryS34\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 19225,
    "path": "../public/libs/bootstrap/js/dist/tooltip.js"
  },
  "/libs/bootstrap/js/dist/tooltip.js.map": {
    "type": "application/json",
    "etag": "\"92df-oTX9wdx7H6GmtzI90qq1BvuP+O0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 37599,
    "path": "../public/libs/bootstrap/js/dist/tooltip.js.map"
  },
  "/libs/bootstrap/js/src/alert.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"76d-eL53NkCjh3qVsW9KnOoou+npgcc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1901,
    "path": "../public/libs/bootstrap/js/src/alert.js"
  },
  "/libs/bootstrap/js/src/base-component.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"78a-YaqWW5jkWXSArQaI6AzneYGFZYc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1930,
    "path": "../public/libs/bootstrap/js/src/base-component.js"
  },
  "/libs/bootstrap/js/src/button.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"65a-4jf9ilYpEqOTzMsOHcDJbcnROR4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1626,
    "path": "../public/libs/bootstrap/js/src/button.js"
  },
  "/libs/bootstrap/js/src/carousel.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2e2c-jMtGSOHkfRKkc8utGRWhMv2H/0s\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 11820,
    "path": "../public/libs/bootstrap/js/src/carousel.js"
  },
  "/libs/bootstrap/js/src/collapse.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1df5-oRa2YWfFH4rewd8VaiBkiQQTEk8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 7669,
    "path": "../public/libs/bootstrap/js/src/collapse.js"
  },
  "/libs/bootstrap/js/src/dropdown.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"33c9-1rvuqKrX9XbTSaxbQvhKKajoq4U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 13257,
    "path": "../public/libs/bootstrap/js/src/dropdown.js"
  },
  "/libs/bootstrap/js/src/modal.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"259d-3pvcH8DIjnR3U6dXcBpX7jOV/+E\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9629,
    "path": "../public/libs/bootstrap/js/src/modal.js"
  },
  "/libs/bootstrap/js/src/offcanvas.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a94-o2at3U6j5WhRgcZm9bzAiJ2/sNk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6804,
    "path": "../public/libs/bootstrap/js/src/offcanvas.js"
  },
  "/libs/bootstrap/js/src/popover.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"752-L7ggG8AXHLKmCgj0G01eub3lERE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1874,
    "path": "../public/libs/bootstrap/js/src/popover.js"
  },
  "/libs/bootstrap/js/src/scrollspy.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2100-qLq2pZqC6GvBL2zlW8fvYvTOCyQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8448,
    "path": "../public/libs/bootstrap/js/src/scrollspy.js"
  },
  "/libs/bootstrap/js/src/tab.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2234-Lny+w6ae6QA84I6CzahsfSlutm0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8756,
    "path": "../public/libs/bootstrap/js/src/tab.js"
  },
  "/libs/bootstrap/js/src/toast.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13ad-Pyb4c3DY958Erat+FOh0VNTH5OY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5037,
    "path": "../public/libs/bootstrap/js/src/toast.js"
  },
  "/libs/bootstrap/js/src/tooltip.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f3c-REdCJklD7PTnaK2RUK4Bv2eiJys\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 16188,
    "path": "../public/libs/bootstrap/js/src/tooltip.js"
  },
  "/libs/bootstrap/js/tests/browsers.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5e7-btScRDCPWcQTkPRYrT9ihlnyzNk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1511,
    "path": "../public/libs/bootstrap/js/tests/browsers.js"
  },
  "/libs/bootstrap/js/tests/karma.conf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"100a-s6gmcWthgeVV7qrXinDn5DiFQwU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4106,
    "path": "../public/libs/bootstrap/js/tests/karma.conf.js"
  },
  "/libs/bootstrap/js/tests/README.md": {
    "type": "text/markdown; charset=utf-8",
    "etag": "\"c3b-s8nCkAiI9i/SkCc3yEccQvrv+oM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3131,
    "path": "../public/libs/bootstrap/js/tests/README.md"
  },
  "/libs/bootstrap/scss/forms/_floating-labels.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"a24-j9dDgciIBo73c8QK63+aYD4Mobs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2596,
    "path": "../public/libs/bootstrap/scss/forms/_floating-labels.scss"
  },
  "/libs/bootstrap/scss/forms/_form-check.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"12e1-H+pCfEvXdJslBPWhbk/OUy8sTrw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4833,
    "path": "../public/libs/bootstrap/scss/forms/_form-check.scss"
  },
  "/libs/bootstrap/scss/forms/_form-control.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"19be-4HfKNPhEYwwIzf8ztQtDZpRpoHk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6590,
    "path": "../public/libs/bootstrap/scss/forms/_form-control.scss"
  },
  "/libs/bootstrap/scss/forms/_form-range.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"aec-8dsmocdn2tKw+NqshuokrOlrd1Y\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2796,
    "path": "../public/libs/bootstrap/scss/forms/_form-range.scss"
  },
  "/libs/bootstrap/scss/forms/_form-select.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"9b8-P1xb9Ikz4f5cOIKthqGF/X+QUws\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2488,
    "path": "../public/libs/bootstrap/scss/forms/_form-select.scss"
  },
  "/libs/bootstrap/scss/forms/_form-text.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"db-lAepG/1+yI37lD5dUds2PXktWDM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 219,
    "path": "../public/libs/bootstrap/scss/forms/_form-text.scss"
  },
  "/libs/bootstrap/scss/forms/_input-group.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"f3b-B98KKbGrTRFH/7gh43BQnAul5nI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3899,
    "path": "../public/libs/bootstrap/scss/forms/_input-group.scss"
  },
  "/libs/bootstrap/scss/forms/_labels.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"476-WpDG4YBcux6Hs2Fswqe3LpzdW2Q\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1142,
    "path": "../public/libs/bootstrap/scss/forms/_labels.scss"
  },
  "/libs/bootstrap/scss/forms/_validation.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1de-QPx5z+yzexjgu7kNLrabR5c/4t4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 478,
    "path": "../public/libs/bootstrap/scss/forms/_validation.scss"
  },
  "/libs/bootstrap/scss/helpers/_clearfix.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"25-v5U9AYWNODdHi6lL9o7ledRgsJI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 37,
    "path": "../public/libs/bootstrap/scss/helpers/_clearfix.scss"
  },
  "/libs/bootstrap/scss/helpers/_color-bg.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"19d-bvV4MQsCNhYfcfgHeoJ838rsABk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 413,
    "path": "../public/libs/bootstrap/scss/helpers/_color-bg.scss"
  },
  "/libs/bootstrap/scss/helpers/_colored-links.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"6db-Iur8O3hCStftkIAsn3B02IbdSRA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1755,
    "path": "../public/libs/bootstrap/scss/helpers/_colored-links.scss"
  },
  "/libs/bootstrap/scss/helpers/_focus-ring.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"181-zKhnp5lleY6wb+eUIBl8TFqbk60\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 385,
    "path": "../public/libs/bootstrap/scss/helpers/_focus-ring.scss"
  },
  "/libs/bootstrap/scss/helpers/_icon-link.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"25d-QKRA4T0or6IuLcwD848Vphg7yyk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 605,
    "path": "../public/libs/bootstrap/scss/helpers/_icon-link.scss"
  },
  "/libs/bootstrap/scss/helpers/_position.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"26d-tjKYo6lkySsolY6bXmiXypnX7eI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 621,
    "path": "../public/libs/bootstrap/scss/helpers/_position.scss"
  },
  "/libs/bootstrap/scss/helpers/_ratio.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"18f-lK/m/2wXCMHd15NqIn7ldw6xEWY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 399,
    "path": "../public/libs/bootstrap/scss/helpers/_ratio.scss"
  },
  "/libs/bootstrap/scss/helpers/_stacks.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"f5-3ja6xIBxNSA1u8HkKMO8sJBiXds\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 245,
    "path": "../public/libs/bootstrap/scss/helpers/_stacks.scss"
  },
  "/libs/bootstrap/scss/helpers/_stretched-link.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"df-l4uazdqvlUIYE1l5KMR9lU0EcEc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 223,
    "path": "../public/libs/bootstrap/scss/helpers/_stretched-link.scss"
  },
  "/libs/bootstrap/scss/helpers/_text-truncation.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"49-EPwjGjzt6mRSSEYcUO4tAQV9YBc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 73,
    "path": "../public/libs/bootstrap/scss/helpers/_text-truncation.scss"
  },
  "/libs/bootstrap/scss/helpers/_visually-hidden.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"88-hV4xTfw2zwXG70V0a9BC0hej4yI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 136,
    "path": "../public/libs/bootstrap/scss/helpers/_visually-hidden.scss"
  },
  "/libs/bootstrap/scss/helpers/_vr.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"93-OAw34MzyRHVSmMToSAkEXeEgel4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 147,
    "path": "../public/libs/bootstrap/scss/helpers/_vr.scss"
  },
  "/libs/bootstrap/scss/mixins/_alert.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"20d-+nUYMBBcbq7sXv9/bbzHzi9HIWs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 525,
    "path": "../public/libs/bootstrap/scss/mixins/_alert.scss"
  },
  "/libs/bootstrap/scss/mixins/_backdrop.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"148-HPnhwKsNC2m8ZDGboa/4JOcrN6g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 328,
    "path": "../public/libs/bootstrap/scss/mixins/_backdrop.scss"
  },
  "/libs/bootstrap/scss/mixins/_banner.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"df-8rnq7ogzjCSyLoJoEWzFlU18tUg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 223,
    "path": "../public/libs/bootstrap/scss/mixins/_banner.scss"
  },
  "/libs/bootstrap/scss/mixins/_border-radius.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"7ef-tfrzUrG2D0yBsZXIu9UgweUKrMg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2031,
    "path": "../public/libs/bootstrap/scss/mixins/_border-radius.scss"
  },
  "/libs/bootstrap/scss/mixins/_box-shadow.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"18e-xsI1h1wSDp68fFR8siCryWep+0M\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 398,
    "path": "../public/libs/bootstrap/scss/mixins/_box-shadow.scss"
  },
  "/libs/bootstrap/scss/mixins/_breakpoints.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"11e4-UWWesU4XHEqoVYpgHvmxyip+xNM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4580,
    "path": "../public/libs/bootstrap/scss/mixins/_breakpoints.scss"
  },
  "/libs/bootstrap/scss/mixins/_buttons.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"c94-dfRBEvQ0kT8fwIMfarKQocTNY4Q\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3220,
    "path": "../public/libs/bootstrap/scss/mixins/_buttons.scss"
  },
  "/libs/bootstrap/scss/mixins/_caret.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"633-qMICO6KX6bolVKNlqMakbYcXtyw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1587,
    "path": "../public/libs/bootstrap/scss/mixins/_caret.scss"
  },
  "/libs/bootstrap/scss/mixins/_clearfix.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"93-RHrLpPCHkjkn2zwAiybHC7Cklxk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 147,
    "path": "../public/libs/bootstrap/scss/mixins/_clearfix.scss"
  },
  "/libs/bootstrap/scss/mixins/_color-mode.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1bf-BkvKZ2f+9cjuaJ8HuDQ67obmNsI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 447,
    "path": "../public/libs/bootstrap/scss/mixins/_color-mode.scss"
  },
  "/libs/bootstrap/scss/mixins/_color-scheme.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"a7-Mj7WuemeoNkfvqXWS8Cwi0bpAXw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 167,
    "path": "../public/libs/bootstrap/scss/mixins/_color-scheme.scss"
  },
  "/libs/bootstrap/scss/mixins/_container.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"19a-iC+3b2CaUdPdd27o4lwzrm5DjYA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 410,
    "path": "../public/libs/bootstrap/scss/mixins/_container.scss"
  },
  "/libs/bootstrap/scss/mixins/_deprecate.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"265-I1EJ0yoi1KcEMgfrLB1QvuyF1t4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 613,
    "path": "../public/libs/bootstrap/scss/mixins/_deprecate.scss"
  },
  "/libs/bootstrap/scss/mixins/_forms.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1044-gsGhGpzpssWHh1V+moZF/5kdEWU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4164,
    "path": "../public/libs/bootstrap/scss/mixins/_forms.scss"
  },
  "/libs/bootstrap/scss/mixins/_gradients.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"7a4-cad6ks5FojdOo+gOrJyWbV0T22I\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1956,
    "path": "../public/libs/bootstrap/scss/mixins/_gradients.scss"
  },
  "/libs/bootstrap/scss/mixins/_grid.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1276-LJu1AtGght14VsLTIX6ahfbu3Ug\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4726,
    "path": "../public/libs/bootstrap/scss/mixins/_grid.scss"
  },
  "/libs/bootstrap/scss/mixins/_image.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"18b-9xXnrV7iUA89Be5WN7mORcX9Cds\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 395,
    "path": "../public/libs/bootstrap/scss/mixins/_image.scss"
  },
  "/libs/bootstrap/scss/mixins/_list-group.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"245-IwsXj4F2q4D4qn4ZO3DziuN/jbM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 581,
    "path": "../public/libs/bootstrap/scss/mixins/_list-group.scss"
  },
  "/libs/bootstrap/scss/mixins/_lists.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"a8-ilcFLH5heuBcZfUBJUBu8rBXeOA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 168,
    "path": "../public/libs/bootstrap/scss/mixins/_lists.scss"
  },
  "/libs/bootstrap/scss/mixins/_pagination.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"183-cfnA6UswbGfltBw8EP2Wdy+QVgk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 387,
    "path": "../public/libs/bootstrap/scss/mixins/_pagination.scss"
  },
  "/libs/bootstrap/scss/mixins/_reset-text.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"1ef-0yPbRxIb858jZqrIzoFtEeEcTqk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 495,
    "path": "../public/libs/bootstrap/scss/mixins/_reset-text.scss"
  },
  "/libs/bootstrap/scss/mixins/_resize.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"ca-PSog9vMoaBfvisHERaMVq6WAMBg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 202,
    "path": "../public/libs/bootstrap/scss/mixins/_resize.scss"
  },
  "/libs/bootstrap/scss/mixins/_table-variants.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"44d-MNiNXk1Z9xTERd9Y9AIn4rL7x2w\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1101,
    "path": "../public/libs/bootstrap/scss/mixins/_table-variants.scss"
  },
  "/libs/bootstrap/scss/mixins/_text-truncate.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"a8-gtPbhHF8lorZlyyY0IHUW84/A1Q\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 168,
    "path": "../public/libs/bootstrap/scss/mixins/_text-truncate.scss"
  },
  "/libs/bootstrap/scss/mixins/_transition.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"295-I9hI/GASkWxS5N1Q1eWGonFy4b0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 661,
    "path": "../public/libs/bootstrap/scss/mixins/_transition.scss"
  },
  "/libs/bootstrap/scss/mixins/_utilities.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"d38-OBKeGFaF8RW8mvY2XKpk46jCi20\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3384,
    "path": "../public/libs/bootstrap/scss/mixins/_utilities.scss"
  },
  "/libs/bootstrap/scss/mixins/_visually-hidden.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"456-Lmi5yQi5CX9psaGKIHx11w7FJ3E\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1110,
    "path": "../public/libs/bootstrap/scss/mixins/_visually-hidden.scss"
  },
  "/libs/bootstrap/scss/tests/jasmine.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c1-3z/7ANBOGyxG9ewEPt6hjf4WwXI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 449,
    "path": "../public/libs/bootstrap/scss/tests/jasmine.js"
  },
  "/libs/bootstrap/scss/utilities/_api.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"6c9-j3VMrX0PK82D/MjOtdx6/YSmBRo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1737,
    "path": "../public/libs/bootstrap/scss/utilities/_api.scss"
  },
  "/libs/bootstrap/scss/vendor/_rfs.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"271c-E74ZKr7fsNtmo0J2nR+x9YLCRLQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10012,
    "path": "../public/libs/bootstrap/scss/vendor/_rfs.scss"
  },
  "/libs/jquery/external/sizzle/LICENSE.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"645-q6jx96SxSenuw2KCj36NS+3Wg3g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1605,
    "path": "../public/libs/jquery/external/sizzle/LICENSE.txt"
  },
  "/libs/jquery/src/ajax/jsonp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"abc-cynq4T934M1sTh8Q8xcZBLnCH2c\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2748,
    "path": "../public/libs/jquery/src/ajax/jsonp.js"
  },
  "/libs/jquery/src/ajax/load.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"770-3o+lIN5vRq/4kTOfVmNmIq2qDJk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1904,
    "path": "../public/libs/jquery/src/ajax/load.js"
  },
  "/libs/jquery/src/ajax/parseXML.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22f-Elyub0W8C0upinLW9x8gkoro5+0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 559,
    "path": "../public/libs/jquery/src/ajax/parseXML.js"
  },
  "/libs/jquery/src/ajax/script.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"665-54R38zAZu2GV5hcPpnDZKPoMH7g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1637,
    "path": "../public/libs/jquery/src/ajax/script.js"
  },
  "/libs/jquery/src/ajax/xhr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10f3-E+qLz0ui37lbBa8DHg1jrM0Rf2I\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4339,
    "path": "../public/libs/jquery/src/ajax/xhr.js"
  },
  "/libs/jquery/src/attributes/attr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cc7-HT9LdkAKrIG1c94QbsBqQDBeymQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3271,
    "path": "../public/libs/jquery/src/attributes/attr.js"
  },
  "/libs/jquery/src/attributes/classes.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"115f-lEOm3n0VtbMy492iTSb2iXABYKI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4447,
    "path": "../public/libs/jquery/src/attributes/classes.js"
  },
  "/libs/jquery/src/attributes/prop.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bbc-hO3/Zpvm5/NIXdON2gt7LoDHzj4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3004,
    "path": "../public/libs/jquery/src/attributes/prop.js"
  },
  "/libs/jquery/src/attributes/support.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"312-ItT8t9Eu7auAdx77rthbk+4KIMw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 786,
    "path": "../public/libs/jquery/src/attributes/support.js"
  },
  "/libs/jquery/src/attributes/val.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1099-oAAm39735OCmEkjd0Y2cyjN4ov4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4249,
    "path": "../public/libs/jquery/src/attributes/val.js"
  },
  "/libs/jquery/src/core/access.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"51f-LFsDzcQWTY4D49Y6eizBL94925U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1311,
    "path": "../public/libs/jquery/src/core/access.js"
  },
  "/libs/jquery/src/core/camelCase.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"221-Ccf/g3GangsPhA4u0ZDrYGUkfkc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 545,
    "path": "../public/libs/jquery/src/core/camelCase.js"
  },
  "/libs/jquery/src/core/DOMEval.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"488-Xl5kkrWjwM1vew4VydYpaZlwmVQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1160,
    "path": "../public/libs/jquery/src/core/DOMEval.js"
  },
  "/libs/jquery/src/core/init.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d09-x+NYL5VM9gmn05bWg2KD2FYGAoM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3337,
    "path": "../public/libs/jquery/src/core/init.js"
  },
  "/libs/jquery/src/core/isAttached.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"236-qyVqsFV2dz8QXCH7KcTowDDJlJk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 566,
    "path": "../public/libs/jquery/src/core/isAttached.js"
  },
  "/libs/jquery/src/core/nodeName.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b2-jgwjYaeWs5gGXzroHg41R/tSaKg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 178,
    "path": "../public/libs/jquery/src/core/nodeName.js"
  },
  "/libs/jquery/src/core/parseHTML.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"644-HkDr/R76PVEu+IRFbskLpF+AQhY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1604,
    "path": "../public/libs/jquery/src/core/parseHTML.js"
  },
  "/libs/jquery/src/core/ready-no-deferred.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8d8-P9+CQojeUI4n0u9M5eLf93Ytqv4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2264,
    "path": "../public/libs/jquery/src/core/ready-no-deferred.js"
  },
  "/libs/jquery/src/core/ready.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"831-1ImcGZvbYzGfBLiHtzgBFTbHM8I\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2097,
    "path": "../public/libs/jquery/src/core/ready.js"
  },
  "/libs/jquery/src/core/readyException.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a8-52JfFwIKRjQB/1x72BqKr6ZMk5g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 168,
    "path": "../public/libs/jquery/src/core/readyException.js"
  },
  "/libs/jquery/src/core/stripAndCollapse.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16a-goKoQdIPEc8pKN9/2HgpQyy6/mo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 362,
    "path": "../public/libs/jquery/src/core/stripAndCollapse.js"
  },
  "/libs/jquery/src/core/support.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"277-69Q00BJOXBor9Em3z2Thua67DZY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 631,
    "path": "../public/libs/jquery/src/core/support.js"
  },
  "/libs/jquery/src/core/toType.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17b-S8kd2GDXriZPWKHJ4wnwBk8KNJ4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 379,
    "path": "../public/libs/jquery/src/core/toType.js"
  },
  "/libs/jquery/src/css/addGetHookIf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"212-2+xuvl53D36vmLGp+n851742T10\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 530,
    "path": "../public/libs/jquery/src/css/addGetHookIf.js"
  },
  "/libs/jquery/src/css/adjustCSS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7d2-C7frdjqVqUxOwZD/SN/YHZutXBQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2002,
    "path": "../public/libs/jquery/src/css/adjustCSS.js"
  },
  "/libs/jquery/src/css/curCSS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"678-rqIzcI6+/aDQPybHMuzylqcEfyc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1656,
    "path": "../public/libs/jquery/src/css/curCSS.js"
  },
  "/libs/jquery/src/css/finalPropName.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"351-raLyQLPKjEzWNk0YqjK49SlywqU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 849,
    "path": "../public/libs/jquery/src/css/finalPropName.js"
  },
  "/libs/jquery/src/css/hiddenVisibleSelectors.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13d-lPrTpra3R2Sy7QWVSiSAMBe7L30\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 317,
    "path": "../public/libs/jquery/src/css/hiddenVisibleSelectors.js"
  },
  "/libs/jquery/src/css/showHide.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"900-JfVPoFzJ4q1Y/d+U3aPflZClaWA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2304,
    "path": "../public/libs/jquery/src/css/showHide.js"
  },
  "/libs/jquery/src/css/support.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bfe-b4Vmw85GyiyzcpVMdAITRMf2oss\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3070,
    "path": "../public/libs/jquery/src/css/support.js"
  },
  "/libs/jquery/src/data/Data.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f70-VENAyw1PC+Yl79LLD1lCgSs1jjA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3952,
    "path": "../public/libs/jquery/src/data/Data.js"
  },
  "/libs/jquery/src/deferred/exceptionHook.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"280-LljtnloYr+mQgknOc3FsjGVODKk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 640,
    "path": "../public/libs/jquery/src/deferred/exceptionHook.js"
  },
  "/libs/jquery/src/effects/animatedSelector.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f4-Nnyqf7MH0ujrX6eObpUreKxETRI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 244,
    "path": "../public/libs/jquery/src/effects/animatedSelector.js"
  },
  "/libs/jquery/src/effects/Tween.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cdc-PfcnRW48vC+9kc8platGvBGHfjw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3292,
    "path": "../public/libs/jquery/src/effects/Tween.js"
  },
  "/libs/jquery/src/event/ajax.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15a-5VEX9LAKyesMNPkxokRbg1Ka1oY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 346,
    "path": "../public/libs/jquery/src/event/ajax.js"
  },
  "/libs/jquery/src/event/alias.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"289-8zOae5Pd55OfGBM3LUNHMSvlQfM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 649,
    "path": "../public/libs/jquery/src/event/alias.js"
  },
  "/libs/jquery/src/event/focusin.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5e8-8dS7FIPB3BnHczzTYBO17y/jz+s\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1512,
    "path": "../public/libs/jquery/src/event/focusin.js"
  },
  "/libs/jquery/src/event/support.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"85-teChGumU0dbdRFvHiWxBQHI+958\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 133,
    "path": "../public/libs/jquery/src/event/support.js"
  },
  "/libs/jquery/src/event/trigger.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"151f-EsrYhVjW/mHdRvhzaycznoHufdM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5407,
    "path": "../public/libs/jquery/src/event/trigger.js"
  },
  "/libs/jquery/src/exports/amd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"400-l7U9pBsrwbzXSzdfRfLvXf5qY5c\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1024,
    "path": "../public/libs/jquery/src/exports/amd.js"
  },
  "/libs/jquery/src/exports/global.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"260-AutCBQFL5USSq0OpQ7ug686PbS4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 608,
    "path": "../public/libs/jquery/src/exports/global.js"
  },
  "/libs/jquery/src/manipulation/buildFragment.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9b6-9U+azHcQAV/morpH9hQoD1hxY/8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2486,
    "path": "../public/libs/jquery/src/manipulation/buildFragment.js"
  },
  "/libs/jquery/src/manipulation/getAll.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"28a-uBpoKZhLNh3WkM9uJXntsDptVBU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 650,
    "path": "../public/libs/jquery/src/manipulation/getAll.js"
  },
  "/libs/jquery/src/manipulation/setGlobalEval.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17d-oPO5HaviGL2Yg2ib/ekGpkXYoiw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 381,
    "path": "../public/libs/jquery/src/manipulation/setGlobalEval.js"
  },
  "/libs/jquery/src/manipulation/support.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"40a-xZX6e6EZuM83NV5D5NO0jjGm2aM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1034,
    "path": "../public/libs/jquery/src/manipulation/support.js"
  },
  "/libs/jquery/src/manipulation/wrapMap.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"31e-IApYbhai7HASds83JsJHJCLMmEo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 798,
    "path": "../public/libs/jquery/src/manipulation/wrapMap.js"
  },
  "/libs/jquery/src/manipulation/_evalUrl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2a4-rAWO3c2HjtYvWVlYYUOeAzDUD60\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 676,
    "path": "../public/libs/jquery/src/manipulation/_evalUrl.js"
  },
  "/libs/jquery/src/queue/delay.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27c-HcGWxesfmVNkx5UYlfyguSVR+zs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 636,
    "path": "../public/libs/jquery/src/queue/delay.js"
  },
  "/libs/jquery/src/traversing/findFilter.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"930-o85OEu5XEPhqRwPMQpTekEEX+s8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2352,
    "path": "../public/libs/jquery/src/traversing/findFilter.js"
  },
  "/libs/jquery/src/var/arr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"36-unM8xbZngr5VpMxiljDd6OMlvic\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 54,
    "path": "../public/libs/jquery/src/var/arr.js"
  },
  "/libs/jquery/src/var/class2type.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"52-aP815ZWe4GPUG2kUKjCi0asAvIw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 82,
    "path": "../public/libs/jquery/src/var/class2type.js"
  },
  "/libs/jquery/src/var/concat.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"51-ry8Pvlaw6OayVTrByZLDv4KOWEg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 81,
    "path": "../public/libs/jquery/src/var/concat.js"
  },
  "/libs/jquery/src/var/document.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43-jRNfQBaTMJIDSTV49xBrH5KFB3g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 67,
    "path": "../public/libs/jquery/src/var/document.js"
  },
  "/libs/jquery/src/var/documentElement.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"69-Jj9LCauqSpSj8Lxdkw7BVRxTn9U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 105,
    "path": "../public/libs/jquery/src/var/documentElement.js"
  },
  "/libs/jquery/src/var/fnToString.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5c-0CWWhcQ1u5LeAkQIrlULOkcZeDQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 92,
    "path": "../public/libs/jquery/src/var/fnToString.js"
  },
  "/libs/jquery/src/var/getProto.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"49-jitUdtQIYer5dMZm+JZI+rCvIXs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 73,
    "path": "../public/libs/jquery/src/var/getProto.js"
  },
  "/libs/jquery/src/var/hasOwn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6e-5fYu3Bf0HNcStZ6BPtUMCQpXvi0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 110,
    "path": "../public/libs/jquery/src/var/hasOwn.js"
  },
  "/libs/jquery/src/var/indexOf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"52-iZx5oA0BJxj8Uu9ExEEHCsj4QUU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 82,
    "path": "../public/libs/jquery/src/var/indexOf.js"
  },
  "/libs/jquery/src/var/isFunction.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ac-vv8VuLzKD+Z9LiP2gn1BjpLExdU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 428,
    "path": "../public/libs/jquery/src/var/isFunction.js"
  },
  "/libs/jquery/src/var/isWindow.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7e-6JtqBqI8wmfKU98J4Szh9u3YaIg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 126,
    "path": "../public/libs/jquery/src/var/isWindow.js"
  },
  "/libs/jquery/src/var/ObjectFunctionString.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6e-e8y7Aua6r2+xSGek+m/w99gpgDc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 110,
    "path": "../public/libs/jquery/src/var/ObjectFunctionString.js"
  },
  "/libs/jquery/src/var/pnum.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"64-GoftnGCGhRU1U4kLj8c9dTtg3vQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 100,
    "path": "../public/libs/jquery/src/var/pnum.js"
  },
  "/libs/jquery/src/var/push.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4f-VN/R5dn7aVztI+wZs+e4b7oa5OQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 79,
    "path": "../public/libs/jquery/src/var/push.js"
  },
  "/libs/jquery/src/var/rcheckableType.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4f-amHreAAjWnhTSD/pnFFOIN5mfMU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 79,
    "path": "../public/libs/jquery/src/var/rcheckableType.js"
  },
  "/libs/jquery/src/var/rcssNum.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"88-+DhPb2K6q3sVp/NED2r7w6pJCSI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 136,
    "path": "../public/libs/jquery/src/var/rcssNum.js"
  },
  "/libs/jquery/src/var/rnothtmlwhite.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca-pnHU7LhGqmL6sI4rMENmGkDU1rw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 202,
    "path": "../public/libs/jquery/src/var/rnothtmlwhite.js"
  },
  "/libs/jquery/src/var/slice.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"50-5zFQ6rsNBB13UpxxdTmo1YPSO7U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 80,
    "path": "../public/libs/jquery/src/var/slice.js"
  },
  "/libs/jquery/src/var/support.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"75-22UOIMFJ2dEu7iljGTK/E/6I6wk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 117,
    "path": "../public/libs/jquery/src/var/support.js"
  },
  "/libs/jquery/src/var/toString.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"68-WLOwalwoo08LusQdhrMeaoWsXw0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 104,
    "path": "../public/libs/jquery/src/var/toString.js"
  },
  "/libs/bootstrap/js/dist/dom/data.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"847-fg0BNkZ49ie0Ilt3gBoCAzXpWYo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2119,
    "path": "../public/libs/bootstrap/js/dist/dom/data.js"
  },
  "/libs/bootstrap/js/dist/dom/data.js.map": {
    "type": "application/json",
    "etag": "\"be7-AXxfVSdtnUpdwE25i7+0wsodvk4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3047,
    "path": "../public/libs/bootstrap/js/dist/dom/data.js.map"
  },
  "/libs/bootstrap/js/dist/dom/event-handler.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"256a-tC+hu7DvL6vXuE+uEitMk9rOl+k\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9578,
    "path": "../public/libs/bootstrap/js/dist/dom/event-handler.js"
  },
  "/libs/bootstrap/js/dist/dom/event-handler.js.map": {
    "type": "application/json",
    "etag": "\"4d58-mIh050AuZubgTt9aEoraeXWVLhw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 19800,
    "path": "../public/libs/bootstrap/js/dist/dom/event-handler.js.map"
  },
  "/libs/bootstrap/js/dist/dom/manipulator.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"986-A7xemAFufQ/rIn/D+g49U/cYo1M\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2438,
    "path": "../public/libs/bootstrap/js/dist/dom/manipulator.js"
  },
  "/libs/bootstrap/js/dist/dom/manipulator.js.map": {
    "type": "application/json",
    "etag": "\"10df-z7uaio+0b7KqbsJUEuKswY34kso\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4319,
    "path": "../public/libs/bootstrap/js/dist/dom/manipulator.js.map"
  },
  "/libs/bootstrap/js/dist/dom/selector-engine.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a8c-9bJODyfY1mAPP7KHanBgEt2NI80\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2700,
    "path": "../public/libs/bootstrap/js/dist/dom/selector-engine.js"
  },
  "/libs/bootstrap/js/dist/dom/selector-engine.js.map": {
    "type": "application/json",
    "etag": "\"120b-VumTc6c1MBUHPPM1tsAN7D6dTuY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4619,
    "path": "../public/libs/bootstrap/js/dist/dom/selector-engine.js.map"
  },
  "/libs/bootstrap/js/dist/util/backdrop.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"113d-zPRRihmwgD2p59gJwn+muqAIma8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4413,
    "path": "../public/libs/bootstrap/js/dist/util/backdrop.js"
  },
  "/libs/bootstrap/js/dist/util/backdrop.js.map": {
    "type": "application/json",
    "etag": "\"1c04-4MXEvkptzY8rz1tBf1TNzl4WXxw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 7172,
    "path": "../public/libs/bootstrap/js/dist/util/backdrop.js.map"
  },
  "/libs/bootstrap/js/dist/util/component-functions.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"87e-WtFx/NCsj5PdJk74wMn+f1ZYpR8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2174,
    "path": "../public/libs/bootstrap/js/dist/util/component-functions.js"
  },
  "/libs/bootstrap/js/dist/util/component-functions.js.map": {
    "type": "application/json",
    "etag": "\"906-75vHogiDhcBH45u3O35/p/Rzuo8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2310,
    "path": "../public/libs/bootstrap/js/dist/util/component-functions.js.map"
  },
  "/libs/bootstrap/js/dist/util/config.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"af8-oHJzCf//UlF3PbiRWT4Je96xJO8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2808,
    "path": "../public/libs/bootstrap/js/dist/util/config.js"
  },
  "/libs/bootstrap/js/dist/util/config.js.map": {
    "type": "application/json",
    "etag": "\"fe9-1MZb2wQ8Gdf4JjpjozR2iaidhaI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4073,
    "path": "../public/libs/bootstrap/js/dist/util/config.js.map"
  },
  "/libs/bootstrap/js/dist/util/focustrap.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f49-ouyEpIp4aEenAWf3vFJWxOryHhY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3913,
    "path": "../public/libs/bootstrap/js/dist/util/focustrap.js"
  },
  "/libs/bootstrap/js/dist/util/focustrap.js.map": {
    "type": "application/json",
    "etag": "\"1703-ZEHiSCapr0z1js8Zct9UBx6wSyc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5891,
    "path": "../public/libs/bootstrap/js/dist/util/focustrap.js.map"
  },
  "/libs/bootstrap/js/dist/util/index.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2808-9s16klFcCT5QOHnKTjbfx0SsXFs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 10248,
    "path": "../public/libs/bootstrap/js/dist/util/index.js"
  },
  "/libs/bootstrap/js/dist/util/index.js.map": {
    "type": "application/json",
    "etag": "\"48f3-Em9jxmDGOmo3Npvj/iRkhW26Wgo\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 18675,
    "path": "../public/libs/bootstrap/js/dist/util/index.js.map"
  },
  "/libs/bootstrap/js/dist/util/sanitizer.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"109d-mlX5HPMaUEg3W98rHCvKy83hN2I\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4253,
    "path": "../public/libs/bootstrap/js/dist/util/sanitizer.js"
  },
  "/libs/bootstrap/js/dist/util/sanitizer.js.map": {
    "type": "application/json",
    "etag": "\"1d94-rir1mdkm51y78pCE6bJRFBQDGdA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 7572,
    "path": "../public/libs/bootstrap/js/dist/util/sanitizer.js.map"
  },
  "/libs/bootstrap/js/dist/util/scrollbar.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13a7-5+1dRR33m/eU/L6hulAmif/NNXw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5031,
    "path": "../public/libs/bootstrap/js/dist/util/scrollbar.js"
  },
  "/libs/bootstrap/js/dist/util/scrollbar.js.map": {
    "type": "application/json",
    "etag": "\"1f69-pRc+kbwyVtCu4RvxeGYs5ChzZbE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8041,
    "path": "../public/libs/bootstrap/js/dist/util/scrollbar.js.map"
  },
  "/libs/bootstrap/js/dist/util/swipe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"127d-2N7uqNgZJ2iYd6WeNlDCJVVbqIY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4733,
    "path": "../public/libs/bootstrap/js/dist/util/swipe.js"
  },
  "/libs/bootstrap/js/dist/util/swipe.js.map": {
    "type": "application/json",
    "etag": "\"208f-hZglJh6FBCi9an6O4mmmBj7tMNc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8335,
    "path": "../public/libs/bootstrap/js/dist/util/swipe.js.map"
  },
  "/libs/bootstrap/js/dist/util/template-factory.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1374-GEvbYhuOujzwhZ1mkKCf65GgrrA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4980,
    "path": "../public/libs/bootstrap/js/dist/util/template-factory.js"
  },
  "/libs/bootstrap/js/dist/util/template-factory.js.map": {
    "type": "application/json",
    "etag": "\"21cf-YXHz6o1bMa32UGg5QqghjdbZBJU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8655,
    "path": "../public/libs/bootstrap/js/dist/util/template-factory.js.map"
  },
  "/libs/bootstrap/js/src/dom/data.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"57d-uUE04STsNZZsvErVH2vBfYaYnt4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1405,
    "path": "../public/libs/bootstrap/js/src/dom/data.js"
  },
  "/libs/bootstrap/js/src/dom/event-handler.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2102-J6PsG5225Ri8OaDkAkz5qox3zEk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8450,
    "path": "../public/libs/bootstrap/js/src/dom/event-handler.js"
  },
  "/libs/bootstrap/js/src/dom/manipulator.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"684-S4zXCZVJrD7Do7FqtyrRi4tkWUA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1668,
    "path": "../public/libs/bootstrap/js/src/dom/manipulator.js"
  },
  "/libs/bootstrap/js/src/dom/selector-engine.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7b0-hWUVoqtS9cVR2dy6wPKPEZFl7F4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1968,
    "path": "../public/libs/bootstrap/js/src/dom/selector-engine.js"
  },
  "/libs/bootstrap/js/src/util/backdrop.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c36-GUBOFyhKmoAeGLEJMCruBtc7bAg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3126,
    "path": "../public/libs/bootstrap/js/src/util/backdrop.js"
  },
  "/libs/bootstrap/js/src/util/component-functions.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"430-0M6ixN9O2CaIz3tlbdes2EwXgbU\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1072,
    "path": "../public/libs/bootstrap/js/src/util/component-functions.js"
  },
  "/libs/bootstrap/js/src/util/config.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"71a-gjoA1htaMNdvuoS95VwhrFltByc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1818,
    "path": "../public/libs/bootstrap/js/src/util/config.js"
  },
  "/libs/bootstrap/js/src/util/focustrap.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9d7-asQC2F7OOPKzVOgc80teS29nZyk\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2519,
    "path": "../public/libs/bootstrap/js/src/util/focustrap.js"
  },
  "/libs/bootstrap/js/src/util/index.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"20f4-URetHsMoRSEgigDpZmbKFgAEyiQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8436,
    "path": "../public/libs/bootstrap/js/src/util/index.js"
  },
  "/libs/bootstrap/js/src/util/sanitizer.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cb5-u8GKy7FJFe9s+W1N6SPBDuhcBq8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3253,
    "path": "../public/libs/bootstrap/js/src/util/sanitizer.js"
  },
  "/libs/bootstrap/js/src/util/scrollbar.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"eab-2FUC4IMtbAcC55SQVuC1QRAWrEQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3755,
    "path": "../public/libs/bootstrap/js/src/util/scrollbar.js"
  },
  "/libs/bootstrap/js/src/util/swipe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d52-g76IA9H/Wev5i5EVJeNklE9iWmY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3410,
    "path": "../public/libs/bootstrap/js/src/util/swipe.js"
  },
  "/libs/bootstrap/js/src/util/template-factory.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e2e-CaHz8/GP0qTwHdKdGd/2bOh7rvQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 3630,
    "path": "../public/libs/bootstrap/js/src/util/template-factory.js"
  },
  "/libs/bootstrap/js/tests/helpers/fixture.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"484-o8XbK0QdBmHvPudI6LuOHSQauls\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1156,
    "path": "../public/libs/bootstrap/js/tests/helpers/fixture.js"
  },
  "/libs/bootstrap/js/tests/integration/bundle-modularity.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ec-px+DQ0Opa1gY/g3g/ANyXohjW7o\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 236,
    "path": "../public/libs/bootstrap/js/tests/integration/bundle-modularity.js"
  },
  "/libs/bootstrap/js/tests/integration/bundle.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e2-SaoyUN00DzcH/PFDW+b1gBnQLFQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 226,
    "path": "../public/libs/bootstrap/js/tests/integration/bundle.js"
  },
  "/libs/bootstrap/js/tests/integration/index.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"10b2-WiSAy22XFhj0rXePL5dubySValI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 4274,
    "path": "../public/libs/bootstrap/js/tests/integration/index.html"
  },
  "/libs/bootstrap/js/tests/integration/rollup.bundle-modularity.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"166-eaJwmQ4BM9tC1OVmkd4ZYd10O4Q\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 358,
    "path": "../public/libs/bootstrap/js/tests/integration/rollup.bundle-modularity.js"
  },
  "/libs/bootstrap/js/tests/integration/rollup.bundle.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"21b-8o8d56xzsxygEpCgRE16nxAEvN8\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 539,
    "path": "../public/libs/bootstrap/js/tests/integration/rollup.bundle.js"
  },
  "/libs/bootstrap/js/tests/visual/.eslintrc.json": {
    "type": "application/json",
    "etag": "\"12d-rXExDLvTN7r+IIIObRwn3oDTpJI\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 301,
    "path": "../public/libs/bootstrap/js/tests/visual/.eslintrc.json"
  },
  "/libs/bootstrap/js/tests/visual/alert.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"88d-j8k/j0LzqLpHFwymIjOKd2D3vBc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2189,
    "path": "../public/libs/bootstrap/js/tests/visual/alert.html"
  },
  "/libs/bootstrap/js/tests/visual/button.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"b52-WaUlW+f2JnqFZOqNVKP38IhwVYY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2898,
    "path": "../public/libs/bootstrap/js/tests/visual/button.html"
  },
  "/libs/bootstrap/js/tests/visual/carousel.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"b33-K5GHoP8jPR/+y5DHk/nNTsGfElM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2867,
    "path": "../public/libs/bootstrap/js/tests/visual/carousel.html"
  },
  "/libs/bootstrap/js/tests/visual/collapse.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"14ce-BtDAYocWV9RqgYwkM7BEecIomtg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 5326,
    "path": "../public/libs/bootstrap/js/tests/visual/collapse.html"
  },
  "/libs/bootstrap/js/tests/visual/dropdown.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"26e6-xuuAxH1/drkbfrc9/Vj9hjOfL3U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 9958,
    "path": "../public/libs/bootstrap/js/tests/visual/dropdown.html"
  },
  "/libs/bootstrap/js/tests/visual/modal.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"3d33-XrSo5zXMURZxiQAa5DEYLliDD84\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 15667,
    "path": "../public/libs/bootstrap/js/tests/visual/modal.html"
  },
  "/libs/bootstrap/js/tests/visual/popover.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"73d-rYJsJKPa7nc5DGkznWSHnjUsDRE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1853,
    "path": "../public/libs/bootstrap/js/tests/visual/popover.html"
  },
  "/libs/bootstrap/js/tests/visual/scrollspy.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"4971-gd76IYhWnQq21Vg85JNrREaTL/o\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 18801,
    "path": "../public/libs/bootstrap/js/tests/visual/scrollspy.html"
  },
  "/libs/bootstrap/js/tests/visual/tab.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"7de1-nIfU5OZxAcaZhQx8G10yrO+13Bc\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 32225,
    "path": "../public/libs/bootstrap/js/tests/visual/tab.html"
  },
  "/libs/bootstrap/js/tests/visual/toast.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"a14-j5tIRCkvMEolT8fsVzFPTzVD9Gg\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 2580,
    "path": "../public/libs/bootstrap/js/tests/visual/toast.html"
  },
  "/libs/bootstrap/js/tests/visual/tooltip.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"18a5-KT85z33o0nRDhiDBaSgDU+8huzQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 6309,
    "path": "../public/libs/bootstrap/js/tests/visual/tooltip.html"
  },
  "/libs/bootstrap/js/tests/unit/.eslintrc.json": {
    "type": "application/json",
    "etag": "\"f7-nTOl2FNkqOn8oQsNs/xPlaRyinQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 247,
    "path": "../public/libs/bootstrap/js/tests/unit/.eslintrc.json"
  },
  "/libs/bootstrap/scss/tests/mixins/_color-modes.test.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"743-lFW8cU+M5l7EFX02EjNIEYk9fc0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1859,
    "path": "../public/libs/bootstrap/scss/tests/mixins/_color-modes.test.scss"
  },
  "/libs/bootstrap/scss/tests/mixins/_media-query-color-mode-full.test.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"f6-Y6IkaGotf2PyXUF4tqP+/U2+on4\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 246,
    "path": "../public/libs/bootstrap/scss/tests/mixins/_media-query-color-mode-full.test.scss"
  },
  "/libs/bootstrap/scss/tests/mixins/_utilities.test.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"2244-K2iQyXZiU1JRpl7ny4aOfe4okkY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 8772,
    "path": "../public/libs/bootstrap/scss/tests/mixins/_utilities.test.scss"
  },
  "/libs/bootstrap/scss/tests/sass-true/register.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"179-citJQTp5JoXVsPHlCMzWDSuV9RE\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 377,
    "path": "../public/libs/bootstrap/scss/tests/sass-true/register.js"
  },
  "/libs/bootstrap/scss/tests/sass-true/runner.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c2-Y6WFym22RYpT0eGRgBbJRjl/WwQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 450,
    "path": "../public/libs/bootstrap/scss/tests/sass-true/runner.js"
  },
  "/libs/bootstrap/scss/tests/utilities/_api.test.scss": {
    "type": "text/x-scss; charset=utf-8",
    "etag": "\"5b6-5+0N2GYkZ4atExp/axNkADq+p3w\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1462,
    "path": "../public/libs/bootstrap/scss/tests/utilities/_api.test.scss"
  },
  "/libs/jquery/external/sizzle/dist/sizzle.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1008b-cwBY3qR8L2sH0JVrOvQtsUJG/IM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 65675,
    "path": "../public/libs/jquery/external/sizzle/dist/sizzle.js"
  },
  "/libs/jquery/external/sizzle/dist/sizzle.min.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4d81-0q84yDTYXYlvrnpQnRT7azW3dX0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 19841,
    "path": "../public/libs/jquery/external/sizzle/dist/sizzle.min.js"
  },
  "/libs/jquery/external/sizzle/dist/sizzle.min.map": {
    "type": "application/json",
    "etag": "\"7814-c3LgE6kQb8eej8hj58FOQSZLH7g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 30740,
    "path": "../public/libs/jquery/external/sizzle/dist/sizzle.min.map"
  },
  "/libs/jquery/src/ajax/var/location.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43-FJZprmBPiCfZr/96n/NbR3wNEWw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 67,
    "path": "../public/libs/jquery/src/ajax/var/location.js"
  },
  "/libs/jquery/src/ajax/var/nonce.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3e-rufrVO1KdpBPqyb0ermUYW1kDuY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 62,
    "path": "../public/libs/jquery/src/ajax/var/nonce.js"
  },
  "/libs/jquery/src/ajax/var/rquery.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3c-HpS9lSCU+JWySqD2g1J6G0m9R1g\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 60,
    "path": "../public/libs/jquery/src/ajax/var/rquery.js"
  },
  "/libs/jquery/src/core/var/rsingleTag.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f4-+/ohgt05DB06K0vtLvmYoJIXPvY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 244,
    "path": "../public/libs/jquery/src/core/var/rsingleTag.js"
  },
  "/libs/jquery/src/css/var/cssExpand.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"58-oQLazLMYNvN11xmtv0JJLdKupAM\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 88,
    "path": "../public/libs/jquery/src/css/var/cssExpand.js"
  },
  "/libs/jquery/src/css/var/getStyles.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"191-565Gw6QFtZL65PuzzMMN6sjNxBQ\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 401,
    "path": "../public/libs/jquery/src/css/var/getStyles.js"
  },
  "/libs/jquery/src/css/var/isHiddenWithinTree.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"504-EsJVwoKv5NJncIDpXU1eclvNeas\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 1284,
    "path": "../public/libs/jquery/src/css/var/isHiddenWithinTree.js"
  },
  "/libs/jquery/src/css/var/rboxStyle.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7b-KJwYBUnZkEoOiQSfyblzCiz0clw\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 123,
    "path": "../public/libs/jquery/src/css/var/rboxStyle.js"
  },
  "/libs/jquery/src/css/var/rnumnonpx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"83-jh0gMrhUUBLGIUFdbYsgzSnLmaY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 131,
    "path": "../public/libs/jquery/src/css/var/rnumnonpx.js"
  },
  "/libs/jquery/src/css/var/swap.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"208-o8OTEPn9Yd9A8xsqcMQltZCqYy0\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 520,
    "path": "../public/libs/jquery/src/css/var/swap.js"
  },
  "/libs/jquery/src/data/var/acceptData.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13e-bxqOO70GtYyZbQt3A3GWgxbhPAs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 318,
    "path": "../public/libs/jquery/src/data/var/acceptData.js"
  },
  "/libs/jquery/src/data/var/dataPriv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54-bagr0jr3PI6b2LjS6KeR1y+QOCY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 84,
    "path": "../public/libs/jquery/src/data/var/dataPriv.js"
  },
  "/libs/jquery/src/data/var/dataUser.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54-bagr0jr3PI6b2LjS6KeR1y+QOCY\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 84,
    "path": "../public/libs/jquery/src/data/var/dataUser.js"
  },
  "/libs/jquery/src/manipulation/var/rscriptType.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5c-QnnVJmC7rXo82+RCWCMYj38l2og\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 92,
    "path": "../public/libs/jquery/src/manipulation/var/rscriptType.js"
  },
  "/libs/jquery/src/manipulation/var/rtagName.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"130-mNy9deFMBAoC8BwvEY0tDfNiYSA\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 304,
    "path": "../public/libs/jquery/src/manipulation/var/rtagName.js"
  },
  "/libs/jquery/src/traversing/var/dir.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"173-zKqObgjPXcTTf3L158oVtgIOX7U\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 371,
    "path": "../public/libs/jquery/src/traversing/var/dir.js"
  },
  "/libs/jquery/src/traversing/var/rneedsContext.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"80-ZqYwpztsRK+myugeRJyF+BKDUSs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 128,
    "path": "../public/libs/jquery/src/traversing/var/rneedsContext.js"
  },
  "/libs/jquery/src/traversing/var/siblings.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"da-bVzZ9LjAQtI8YrHeGsaeHlyVvDs\"",
    "mtime": "2026-01-09T18:54:56.000Z",
    "size": 218,
    "path": "../public/libs/jquery/src/traversing/var/siblings.js"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt/builds/meta/":{"maxAge":31536000},"/_nuxt/builds/":{"maxAge":1},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _mYBzxa = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const logger = morgan("tiny");
const _waUFif = defineEventHandler((event) => {
  logger(event.node.req, event.node.res, function() {
  });
});

const jwt_regex = /^(?:[\w-]*\.){2}[\w-]*$/;
const createAppJwtToken = async (jwt_secret, user_id, approval_level, company_id) => {
  const secret = new TextEncoder().encode(jwt_secret.trim());
  const alg = "HS256";
  const token = await new jose.SignJWT({ user_id, success: true, approval_level, company_id }).setProtectedHeader({ alg }).setIssuedAt().setIssuer("iss.trecurity.com").setAudience("aud.trecurity.com").setExpirationTime("14d").sign(secret);
  return token;
};
const checkAppJwtToken = async (token, jwt_secret, user_id) => {
  try {
    const secret = new TextEncoder().encode(jwt_secret.trim());
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: "iss.trecurity.com",
      audience: "aud.trecurity.com"
    });
    if (user_id) {
      if (payload.user_id !== user_id)
        return { success: false };
    }
    return payload;
  } catch (error) {
    console.error("DEBUG: App JWT Verify Error:", error.message);
    console.error("DEBUG: App JWT Verify Stack:", error.stack);
    return { success: false };
  }
};
const createOTPJwtToken = async (jwt_secret) => {
  const secret = new TextEncoder().encode(jwt_secret.trim());
  const alg = "HS256";
  const token = await new jose.SignJWT({ success: true }).setProtectedHeader({ alg }).setIssuedAt().setIssuer("iss.trecurity.com").setAudience("aud.trecurity.com").setExpirationTime("30m").sign(secret);
  return token;
};
const checkOTPJwtToken = async (token, jwt_secret) => {
  try {
    const secret = new TextEncoder().encode(jwt_secret.trim());
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: "iss.trecurity.com",
      audience: "aud.trecurity.com"
    });
    return payload;
  } catch (error) {
    return { success: false };
  }
};
const createDummyJwtToken = async () => {
  const jwt_secret = require$$1.randomBytes(256).toString("base64");
  const secret = new TextEncoder().encode(jwt_secret);
  const alg = "HS256";
  const token = await new jose.SignJWT({ success: true }).setProtectedHeader({ alg }).setIssuedAt().setIssuer("iss.trecurity.com").setAudience("aud.trecurity.com").setExpirationTime("30m").sign(secret);
  return token;
};
const checkControllerJwtToken = async (token, jwt_secret) => {
  try {
    const secret = new TextEncoder().encode(jwt_secret.trim());
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error("DEBUG: JWT UTF8 Verify Error:", error.message);
    try {
      const secretHex = new Uint8Array(Buffer.from(jwt_secret, "hex"));
      const { payload } = await jose.jwtVerify(token, secretHex);
      console.log("DEBUG: JWT Hex Verify Success");
      return payload;
    } catch (err2) {
      console.error("DEBUG: JWT Hex Verify Error:", err2.message);
    }
    return null;
  }
};

const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";
const _anqrO3 = defineEventHandler(async (event) => {
  var _a;
  const token = getCookie(event, "token") || "";
  if (!token) {
    return;
  }
  try {
    const config = useRuntimeConfig();
    const secret = config.jwtAppTokenSecret || ((_a = config.public) == null ? void 0 : _a.jwtAppTokenSecret) || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET || process.env.NUXT_JWT_APP_TOKEN_SECRET || FALLBACK_SECRET;
    const payload = await checkAppJwtToken(token, secret);
    if (payload.success) {
      event.context.user = {
        id: payload.user_id,
        approval_level: payload.approval_level,
        company_id: payload.company_id
      };
    } else {
      const controllerPayload = await checkControllerJwtToken(token, secret);
      if (controllerPayload) {
        event.context.vehicle = {
          number_plate: controllerPayload.number_plate
        };
      }
    }
  } catch (error) {
    console.error("Auth middleware error (non-fatal):", error.message);
  }
});

const _SxA8c9 = defineEventHandler(() => {});

const FILE_UPLOAD_HEADER = "multipart/form-data";
const _mT_i0c = defineEventHandler((event) => {
  const rules = resolveSecurityRules(event);
  if (rules.enabled && rules.requestSizeLimiter) {
    if (["POST", "PUT", "DELETE"].includes(event.node.req.method)) {
      const contentLengthValue = getRequestHeader(event, "content-length");
      const contentTypeValue = getRequestHeader(event, "content-type");
      const isFileUpload = contentTypeValue?.includes(FILE_UPLOAD_HEADER);
      const requestLimit = isFileUpload ? rules.requestSizeLimiter.maxUploadFileRequestInBytes : rules.requestSizeLimiter.maxRequestSizeInBytes;
      if (parseInt(contentLengthValue) >= requestLimit) {
        const payloadTooLargeError = {
          statusCode: 413,
          statusMessage: "Payload Too Large"
        };
        if (rules.requestSizeLimiter.throwError === false) {
          return payloadTooLargeError;
        }
        throw createError$1(payloadTooLargeError);
      }
    }
  }
});

const _lEGeBG = defineEventHandler((event) => {
  const rules = resolveSecurityRules(event);
  if (rules.enabled && rules.corsHandler) {
    const { corsHandler } = rules;
    handleCors(event, corsHandler);
  }
});

const _vVtYfQ = defineEventHandler((event) => {
  const rules = resolveSecurityRules(event);
  if (rules.enabled && rules.allowedMethodsRestricter) {
    const { allowedMethodsRestricter } = rules;
    const allowedMethods = allowedMethodsRestricter.methods;
    if (allowedMethods !== "*" && !allowedMethods.includes(event.node.req.method)) {
      const methodNotAllowedError = {
        statusCode: 405,
        statusMessage: "Method not allowed"
      };
      if (allowedMethodsRestricter.throwError === false) {
        return methodNotAllowedError;
      }
      throw createError$1(methodNotAllowedError);
    }
  }
});

const storage = useStorage("#rate-limiter-storage");
const _gknomZ = defineEventHandler(async (event) => {
  const rules = resolveSecurityRules(event);
  if (rules.enabled && rules.rateLimiter) {
    const { rateLimiter } = rules;
    const ip = getIP(event);
    const route = getRoute(event);
    const url = ip + route;
    let storageItem = await storage.getItem(url);
    if (!storageItem) {
      await setStorageItem(rateLimiter, url);
    } else {
      if (typeof storageItem !== "object") {
        return;
      }
      const timeSinceFirstRateLimit = storageItem.date;
      const timeForInterval = storageItem.date + Number(rateLimiter.interval);
      if (Date.now() >= timeForInterval) {
        await setStorageItem(rateLimiter, url);
        storageItem = await storage.getItem(url);
      }
      const isLimited = timeSinceFirstRateLimit <= timeForInterval && storageItem.value === 0;
      if (isLimited) {
        const tooManyRequestsError = {
          statusCode: 429,
          statusMessage: "Too Many Requests"
        };
        if (rules.rateLimiter.headers) {
          setResponseHeader(event, "x-ratelimit-remaining", 0);
          setResponseHeader(event, "x-ratelimit-limit", rateLimiter.tokensPerInterval);
          setResponseHeader(event, "x-ratelimit-reset", timeForInterval);
        }
        if (rateLimiter.throwError === false) {
          return tooManyRequestsError;
        }
        throw createError$1(tooManyRequestsError);
      }
      const newItemDate = timeSinceFirstRateLimit > timeForInterval ? Date.now() : storageItem.date;
      const newStorageItem = { value: storageItem.value - 1, date: newItemDate };
      await storage.setItem(url, newStorageItem);
      const currentItem = await storage.getItem(url);
      if (currentItem && rateLimiter.headers) {
        setResponseHeader(event, "x-ratelimit-remaining", currentItem.value);
        setResponseHeader(event, "x-ratelimit-limit", rateLimiter?.tokensPerInterval);
        setResponseHeader(event, "x-ratelimit-reset", timeForInterval);
      }
    }
  }
});
async function setStorageItem(rateLimiter, url) {
  const rateLimitedObject = { value: rateLimiter.tokensPerInterval, date: Date.now() };
  await storage.setItem(url, rateLimitedObject);
}
function getIP(event) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || "";
  return ip;
}
function getRoute(event) {
  const route = resolveSecurityRoute(event) || "";
  return route;
}

const _tng7FE = defineEventHandler(async (event) => {
  const rules = resolveSecurityRules(event);
  if (rules.enabled && rules.xssValidator) {
    const filterOpt = {
      ...rules.xssValidator,
      escapeHtml: void 0
    };
    if (rules.xssValidator.escapeHtml === false) {
      filterOpt.escapeHtml = (value) => value;
    }
    const xssValidator = new FilterXSS(filterOpt);
    if (event.node.req.socket.readyState !== "readOnly") {
      if (rules.xssValidator.methods && rules.xssValidator.methods.includes(
        event.node.req.method
      )) {
        const valueToFilter = event.node.req.method === "GET" ? getQuery(event) : event.node.req.headers["content-type"]?.includes(
          "multipart/form-data"
        ) ? await readMultipartFormData(event) : await readBody(event);
        if (valueToFilter && Object.keys(valueToFilter).length) {
          if (valueToFilter.statusMessage && valueToFilter.statusMessage !== "Bad Request") {
            return;
          }
          const stringifiedValue = JSON.stringify(valueToFilter);
          const processedValue = xssValidator.process(
            JSON.stringify(valueToFilter)
          );
          if (processedValue !== stringifiedValue) {
            const badRequestError = {
              statusCode: 400,
              statusMessage: "Bad Request"
            };
            if (rules.xssValidator.throwError === false) {
              return badRequestError;
            }
            throw createError$1(badRequestError);
          }
        }
      }
    }
  }
});

const _UaLw_o = lazyEventHandler(() => {
  const opts = useRuntimeConfig().ipx || {};
  const fsDir = opts?.fs?.dir ? (Array.isArray(opts.fs.dir) ? opts.fs.dir : [opts.fs.dir]).map((dir) => isAbsolute(dir) ? dir : fileURLToPath(new URL(dir, globalThis._importMeta_.url))) : void 0;
  const fsStorage = opts.fs?.dir ? ipxFSStorage({ ...opts.fs, dir: fsDir }) : void 0;
  const httpStorage = opts.http?.domains ? ipxHttpStorage({ ...opts.http }) : void 0;
  if (!fsStorage && !httpStorage) {
    throw new Error("IPX storage is not configured!");
  }
  const ipxOptions = {
    ...opts,
    storage: fsStorage || httpStorage,
    httpStorage
  };
  const ipx = createIPX(ipxOptions);
  const ipxHandler = createIPXH3Handler(ipx);
  return useBase(opts.baseURL, ipxHandler);
});

const _lazy_J9eyf5 = () => import('../routes/api/account/find.mjs');
const _lazy_4clPTI = () => import('../routes/api/index.patch.mjs');
const _lazy_YtTxUz = () => import('../routes/api/admin/fix-roles.post.mjs');
const _lazy_MyUfxy = () => import('../routes/api/analytics/export.mjs');
const _lazy_6L50gI = () => import('../routes/api/auth/forgot-password.mjs');
const _lazy_j3r6Z8 = () => import('../routes/api/auth/login-v2.mjs');
const _lazy_t2FSBu = () => import('../routes/api/auth/login.mjs');
const _lazy_q12jhx = () => import('../routes/api/auth/logout.mjs');
const _lazy_PyCNr0 = () => import('../routes/api/auth/send-delete-otp.mjs');
const _lazy_5gRW9n = () => import('../routes/api/auth/send-otp.mjs');
const _lazy_Cwfa65 = () => import('../routes/api/auth/switch-company.post.mjs');
const _lazy_zX8BmP = () => import('../routes/api/auth/verify-delete-otp.mjs');
const _lazy_IhDJuT = () => import('../routes/api/auth/verify-otp.mjs');
const _lazy_SSeisp = () => import('../routes/api/auth/verify-token.mjs');
const _lazy_XOfSpE = () => import('../routes/api/command/cancel.delete.mjs');
const _lazy_JcwKPx = () => import('../routes/api/command/data-table.get.mjs');
const _lazy_W5OcyZ = () => import('../routes/api/command/engine.mjs');
const _lazy_3bwx83 = () => import('../routes/api/command/force-unlock-engine.mjs');
const _lazy_UMoPqR = () => import('../routes/api/command/pending.mjs');
const _lazy_7s0_ZG = () => import('../routes/api/company/data-table.get.mjs');
const _lazy_KNKTLM = () => import('../routes/api/company/list.mjs');
const _lazy_PAkJoc = () => import('../routes/api/company/subscription.get.mjs');
const _lazy_OSMvlC = () => import('../routes/api/company/upsert.mjs');
const _lazy_g1iZCT = () => import('../routes/api/controller/get-commands.mjs');
const _lazy_Any6ZH = () => import('../routes/api/controller/sos-alerts.post.mjs');
const _lazy_hwd1uz = () => import('../routes/api/controller/upsert.mjs');
const _lazy__EKSry = () => import('../routes/api/controller/violations.post.mjs');
const _lazy_Sf3TeT = () => import('../routes/api/dashboard/company-admin.get.mjs');
const _lazy_MWQHFA = () => import('../routes/api/dashboard/super-admin.mjs');
const _lazy_MmXuIe = () => import('../routes/api/dashboard/user.mjs');
const _lazy_96IkRU = () => import('../routes/api/debug-auth.mjs');
const _lazy_pV2X3z = () => import('../routes/api/debug-login-check.post.mjs');
const _lazy_bcDHx4 = () => import('../routes/api/debug/create-user.mjs');
const _lazy_Syg51g = () => import('../routes/api/debug/gps-fields.get.mjs');
const _lazy_Aiow2j = () => import('../routes/api/device/tracking-data.post.mjs');
const _lazy_P7dJyF = () => import('../routes/api/export/vehicle-data.get.mjs');
const _lazy_VO6FdB = () => import('../routes/api/fix-admin-roles.post.mjs');
const _lazy_1hWMwh = () => import('../routes/api/fix-excavator-spelling.post.mjs');
const _lazy_R7OuJS = () => import('../routes/api/fix-spelling-direct.post.mjs');
const _lazy_kAtgkR = () => import('../routes/api/list-company-users.get.mjs');
const _lazy_c7BLr3 = () => import('../routes/api/logs/company-admin/data-table.get.mjs');
const _lazy_oV7pou = () => import('../routes/api/logs/super-admin/data-table.get.mjs');
const _lazy_87xJBT = () => import('../routes/api/logs/user/data-table.get.mjs');
const _lazy_3job7n = () => import('../routes/api/routes/_id_.delete.mjs');
const _lazy_eGnXUO = () => import('../routes/api/routes/_id_.patch.mjs');
const _lazy_oUCHRr = () => import('../routes/api/index.get.mjs');
const _lazy_JdJ2Dl = () => import('../routes/api/index.post.mjs');
const _lazy_x5JV6e = () => import('../routes/api/index.get2.mjs');
const _lazy_7144nH = () => import('../routes/api/index.post2.mjs');
const _lazy_hWPLPP = () => import('../routes/api/sketch/info.get.mjs');
const _lazy_ayPTjm = () => import('../routes/api/sketch/sketch.mjs');
const _lazy_W5eJlc = () => import('../routes/api/sos-alerts/_id_.patch.mjs');
const _lazy_NPxPjS = () => import('../routes/api/index.get3.mjs');
const _lazy_yew8PF = () => import('../routes/api/subscription/admin-summary.get.mjs');
const _lazy_VhRcab = () => import('../routes/api/subscription/plans.get.mjs');
const _lazy_y23cv6 = () => import('../routes/api/index.get4.mjs');
const _lazy_R9ylSN = () => import('../routes/api/unlink-users.post.mjs');
const _lazy_JN86Vi = () => import('../routes/api/user/company-admin/data-table.get.mjs');
const _lazy_IiefHb = () => import('../routes/api/user/company-admin/list.mjs');
const _lazy_1jexIE = () => import('../routes/api/user/company-admin/permanent-delete.mjs');
const _lazy_ephn4v = () => import('../routes/api/user/company-admin/upsert.mjs');
const _lazy_V9kwLU = () => import('../routes/api/user/my-companies.get.mjs');
const _lazy_wzPeJA = () => import('../routes/api/user/super-admin/data-table.get.mjs');
const _lazy_Yp0gNZ = () => import('../routes/api/user/super-admin/delete.mjs');
const _lazy_oenPFj = () => import('../routes/api/user/super-admin/list.mjs');
const _lazy_5W2JnD = () => import('../routes/api/user/super-admin/permanent-delete.mjs');
const _lazy_eR2gyu = () => import('../routes/api/user/super-admin/upsert.mjs');
const _lazy_kTSZsr = () => import('../routes/api/utils.mjs');
const _lazy_PKnwNL = () => import('../routes/api/vehicle/_id/analytics.get.mjs');
const _lazy_Ny3QEC = () => import('../routes/api/vehicle/_id/history.get.mjs');
const _lazy_i5QsOF = () => import('../routes/api/vehicle/_number_plate_.get.mjs');
const _lazy_6xya_W = () => import('../routes/api/vehicle/batch-update.post.mjs');
const _lazy_p3oHaR = () => import('../routes/api/vehicle/company-admin/data-table.get.mjs');
const _lazy_u350SN = () => import('../routes/api/vehicle/company-admin/upsert.mjs');
const _lazy_DGxMVT = () => import('../routes/api/vehicle/configure.post.mjs');
const _lazy_WVHuHa = () => import('../routes/api/vehicle/geofence-upsert.mjs');
const _lazy_iNdCZW = () => import('../routes/api/vehicle/geofence-violation-settings-upsert.mjs');
const _lazy_CVXUQM = () => import('../routes/api/vehicle/recharge.post.mjs');
const _lazy_24iBvA = () => import('../routes/api/vehicle/search.get.mjs');
const _lazy_yffbZv = () => import('../routes/api/vehicle/super-admin/data-table.get.mjs');
const _lazy_pdCZQ7 = () => import('../routes/api/vehicle/super-admin/upsert.mjs');
const _lazy_kkNj1q = () => import('../routes/api/vehicle/user/data-table.get.mjs');
const _lazy_ZpHiZX = () => import('../routes/api/index.get5.mjs');
const _lazy_YjOkLq = () => import('../routes/renderer.mjs').then(function (n) { return n.r; });

const handlers = [
  { route: '', handler: _mYBzxa, lazy: false, middleware: true, method: undefined },
  { route: '', handler: _waUFif, lazy: false, middleware: true, method: undefined },
  { route: '', handler: _anqrO3, lazy: false, middleware: true, method: undefined },
  { route: '/api/account/find', handler: _lazy_J9eyf5, lazy: true, middleware: false, method: undefined },
  { route: '/api/account', handler: _lazy_4clPTI, lazy: true, middleware: false, method: "patch" },
  { route: '/api/admin/fix-roles', handler: _lazy_YtTxUz, lazy: true, middleware: false, method: "post" },
  { route: '/api/analytics/export', handler: _lazy_MyUfxy, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/forgot-password', handler: _lazy_6L50gI, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/login-v2', handler: _lazy_j3r6Z8, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/login', handler: _lazy_t2FSBu, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/logout', handler: _lazy_q12jhx, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/send-delete-otp', handler: _lazy_PyCNr0, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/send-otp', handler: _lazy_5gRW9n, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/switch-company', handler: _lazy_Cwfa65, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/verify-delete-otp', handler: _lazy_zX8BmP, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/verify-otp', handler: _lazy_IhDJuT, lazy: true, middleware: false, method: undefined },
  { route: '/api/auth/verify-token', handler: _lazy_SSeisp, lazy: true, middleware: false, method: undefined },
  { route: '/api/command/cancel', handler: _lazy_XOfSpE, lazy: true, middleware: false, method: "delete" },
  { route: '/api/command/data-table', handler: _lazy_JcwKPx, lazy: true, middleware: false, method: "get" },
  { route: '/api/command/engine', handler: _lazy_W5OcyZ, lazy: true, middleware: false, method: undefined },
  { route: '/api/command/force-unlock-engine', handler: _lazy_3bwx83, lazy: true, middleware: false, method: undefined },
  { route: '/api/command/pending', handler: _lazy_UMoPqR, lazy: true, middleware: false, method: undefined },
  { route: '/api/company/data-table', handler: _lazy_7s0_ZG, lazy: true, middleware: false, method: "get" },
  { route: '/api/company/list', handler: _lazy_KNKTLM, lazy: true, middleware: false, method: undefined },
  { route: '/api/company/subscription', handler: _lazy_PAkJoc, lazy: true, middleware: false, method: "get" },
  { route: '/api/company/upsert', handler: _lazy_OSMvlC, lazy: true, middleware: false, method: undefined },
  { route: '/api/controller/get-commands', handler: _lazy_g1iZCT, lazy: true, middleware: false, method: undefined },
  { route: '/api/controller/sos-alerts', handler: _lazy_Any6ZH, lazy: true, middleware: false, method: "post" },
  { route: '/api/controller/upsert', handler: _lazy_hwd1uz, lazy: true, middleware: false, method: undefined },
  { route: '/api/controller/violations', handler: _lazy__EKSry, lazy: true, middleware: false, method: "post" },
  { route: '/api/dashboard/company-admin', handler: _lazy_Sf3TeT, lazy: true, middleware: false, method: "get" },
  { route: '/api/dashboard/super-admin', handler: _lazy_MWQHFA, lazy: true, middleware: false, method: undefined },
  { route: '/api/dashboard/user', handler: _lazy_MmXuIe, lazy: true, middleware: false, method: undefined },
  { route: '/api/debug-auth', handler: _lazy_96IkRU, lazy: true, middleware: false, method: undefined },
  { route: '/api/debug-login-check', handler: _lazy_pV2X3z, lazy: true, middleware: false, method: "post" },
  { route: '/api/debug/create-user', handler: _lazy_bcDHx4, lazy: true, middleware: false, method: undefined },
  { route: '/api/debug/gps-fields', handler: _lazy_Syg51g, lazy: true, middleware: false, method: "get" },
  { route: '/api/device/tracking-data', handler: _lazy_Aiow2j, lazy: true, middleware: false, method: "post" },
  { route: '/api/export/vehicle-data', handler: _lazy_P7dJyF, lazy: true, middleware: false, method: "get" },
  { route: '/api/fix-admin-roles', handler: _lazy_VO6FdB, lazy: true, middleware: false, method: "post" },
  { route: '/api/fix-excavator-spelling', handler: _lazy_1hWMwh, lazy: true, middleware: false, method: "post" },
  { route: '/api/fix-spelling-direct', handler: _lazy_R7OuJS, lazy: true, middleware: false, method: "post" },
  { route: '/api/list-company-users', handler: _lazy_kAtgkR, lazy: true, middleware: false, method: "get" },
  { route: '/api/logs/company-admin/data-table', handler: _lazy_c7BLr3, lazy: true, middleware: false, method: "get" },
  { route: '/api/logs/super-admin/data-table', handler: _lazy_oV7pou, lazy: true, middleware: false, method: "get" },
  { route: '/api/logs/user/data-table', handler: _lazy_87xJBT, lazy: true, middleware: false, method: "get" },
  { route: '/api/routes/:id', handler: _lazy_3job7n, lazy: true, middleware: false, method: "delete" },
  { route: '/api/routes/:id', handler: _lazy_eGnXUO, lazy: true, middleware: false, method: "patch" },
  { route: '/api/routes', handler: _lazy_oUCHRr, lazy: true, middleware: false, method: "get" },
  { route: '/api/routes', handler: _lazy_JdJ2Dl, lazy: true, middleware: false, method: "post" },
  { route: '/api/sketch', handler: _lazy_x5JV6e, lazy: true, middleware: false, method: "get" },
  { route: '/api/sketch', handler: _lazy_7144nH, lazy: true, middleware: false, method: "post" },
  { route: '/api/sketch/info', handler: _lazy_hWPLPP, lazy: true, middleware: false, method: "get" },
  { route: '/api/sketch/sketch', handler: _lazy_ayPTjm, lazy: true, middleware: false, method: undefined },
  { route: '/api/sos-alerts/:id', handler: _lazy_W5eJlc, lazy: true, middleware: false, method: "patch" },
  { route: '/api/sos-alerts', handler: _lazy_NPxPjS, lazy: true, middleware: false, method: "get" },
  { route: '/api/subscription/admin-summary', handler: _lazy_yew8PF, lazy: true, middleware: false, method: "get" },
  { route: '/api/subscription/plans', handler: _lazy_VhRcab, lazy: true, middleware: false, method: "get" },
  { route: '/api/tracking-data', handler: _lazy_y23cv6, lazy: true, middleware: false, method: "get" },
  { route: '/api/unlink-users', handler: _lazy_R9ylSN, lazy: true, middleware: false, method: "post" },
  { route: '/api/user/company-admin/data-table', handler: _lazy_JN86Vi, lazy: true, middleware: false, method: "get" },
  { route: '/api/user/company-admin/list', handler: _lazy_IiefHb, lazy: true, middleware: false, method: undefined },
  { route: '/api/user/company-admin/permanent-delete', handler: _lazy_1jexIE, lazy: true, middleware: false, method: undefined },
  { route: '/api/user/company-admin/upsert', handler: _lazy_ephn4v, lazy: true, middleware: false, method: undefined },
  { route: '/api/user/my-companies', handler: _lazy_V9kwLU, lazy: true, middleware: false, method: "get" },
  { route: '/api/user/super-admin/data-table', handler: _lazy_wzPeJA, lazy: true, middleware: false, method: "get" },
  { route: '/api/user/super-admin/delete', handler: _lazy_Yp0gNZ, lazy: true, middleware: false, method: undefined },
  { route: '/api/user/super-admin/list', handler: _lazy_oenPFj, lazy: true, middleware: false, method: undefined },
  { route: '/api/user/super-admin/permanent-delete', handler: _lazy_5W2JnD, lazy: true, middleware: false, method: undefined },
  { route: '/api/user/super-admin/upsert', handler: _lazy_eR2gyu, lazy: true, middleware: false, method: undefined },
  { route: '/api/utils', handler: _lazy_kTSZsr, lazy: true, middleware: false, method: undefined },
  { route: '/api/vehicle/:id/analytics', handler: _lazy_PKnwNL, lazy: true, middleware: false, method: "get" },
  { route: '/api/vehicle/:id/history', handler: _lazy_Ny3QEC, lazy: true, middleware: false, method: "get" },
  { route: '/api/vehicle/:number_plate', handler: _lazy_i5QsOF, lazy: true, middleware: false, method: "get" },
  { route: '/api/vehicle/batch-update', handler: _lazy_6xya_W, lazy: true, middleware: false, method: "post" },
  { route: '/api/vehicle/company-admin/data-table', handler: _lazy_p3oHaR, lazy: true, middleware: false, method: "get" },
  { route: '/api/vehicle/company-admin/upsert', handler: _lazy_u350SN, lazy: true, middleware: false, method: undefined },
  { route: '/api/vehicle/configure', handler: _lazy_DGxMVT, lazy: true, middleware: false, method: "post" },
  { route: '/api/vehicle/geofence-upsert', handler: _lazy_WVHuHa, lazy: true, middleware: false, method: undefined },
  { route: '/api/vehicle/geofence-violation-settings-upsert', handler: _lazy_iNdCZW, lazy: true, middleware: false, method: undefined },
  { route: '/api/vehicle/recharge', handler: _lazy_CVXUQM, lazy: true, middleware: false, method: "post" },
  { route: '/api/vehicle/search', handler: _lazy_24iBvA, lazy: true, middleware: false, method: "get" },
  { route: '/api/vehicle/super-admin/data-table', handler: _lazy_yffbZv, lazy: true, middleware: false, method: "get" },
  { route: '/api/vehicle/super-admin/upsert', handler: _lazy_pdCZQ7, lazy: true, middleware: false, method: undefined },
  { route: '/api/vehicle/user/data-table', handler: _lazy_kkNj1q, lazy: true, middleware: false, method: "get" },
  { route: '/api/violations', handler: _lazy_ZpHiZX, lazy: true, middleware: false, method: "get" },
  { route: '/__nuxt_error', handler: _lazy_YjOkLq, lazy: true, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _mT_i0c, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _lEGeBG, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _vVtYfQ, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _gknomZ, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _tng7FE, lazy: false, middleware: false, method: undefined },
  { route: '/_ipx/**', handler: _UaLw_o, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_YjOkLq, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp = createNitroApp();
function useNitroApp() {
  return nitroApp;
}
runNitroPlugins(nitroApp);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

export { $fetch as $, getRouteRules as A, getContext as B, hasProtocol as C, isScriptProtocol as D, joinURL as E, withQuery as F, sanitizeStatusCode as G, baseURL as H, createHooks as I, executeAsync as J, toRouteMatcher as K, createRouter$1 as L, defu as M, klona as N, getRequestHeader as O, isEqual as P, getCookie as Q, deleteCookie as R, parseQuery as S, withTrailingSlash as T, withoutTrailingSlash as U, hash$1 as V, withLeadingSlash as W, parseURL as X, encodeParam as Y, encodePath as Z, trapUnhandledNodeErrors as a, useNitroApp as b, defineEventHandler as c, destr as d, setResponseStatus as e, checkAppJwtToken as f, createOTPJwtToken as g, createDummyJwtToken as h, createAppJwtToken as i, jwt_regex as j, setCookie as k, checkOTPJwtToken as l, getQuery as m, setHeader as n, getRouterParams as o, setResponseHeader as p, buildAssetsURL as q, readBody as r, setupGracefulShutdown as s, toNodeListener as t, useRuntimeConfig as u, getResponseStatusText as v, getResponseStatus as w, defineRenderHandler as x, publicAssetsURL as y, createError$1 as z };
//# sourceMappingURL=nitro.mjs.map
