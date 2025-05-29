// node_modules/mustache/mustache.mjs
var objectToString = Object.prototype.toString;
var isArray = Array.isArray || function isArrayPolyfill(object) {
  return objectToString.call(object) === "[object Array]";
};
function isFunction(object) {
  return typeof object === "function";
}
function typeStr(obj) {
  return isArray(obj) ? "array" : typeof obj;
}
function escapeRegExp(string) {
  return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}
function hasProperty(obj, propName) {
  return obj != null && typeof obj === "object" && propName in obj;
}
function primitiveHasOwnProperty(primitive, propName) {
  return primitive != null && typeof primitive !== "object" && primitive.hasOwnProperty && primitive.hasOwnProperty(propName);
}
var regExpTest = RegExp.prototype.test;
function testRegExp(re, string) {
  return regExpTest.call(re, string);
}
var nonSpaceRe = /\S/;
function isWhitespace(string) {
  return !testRegExp(nonSpaceRe, string);
}
var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;"
};
function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
    return entityMap[s];
  });
}
var whiteRe = /\s*/;
var spaceRe = /\s+/;
var equalsRe = /\s*=/;
var curlyRe = /\s*\}/;
var tagRe = /#|\^|\/|>|\{|&|=|!/;
function parseTemplate(template, tags) {
  if (!template)
    return [];
  var lineHasNonSpace = false;
  var sections = [];
  var tokens = [];
  var spaces = [];
  var hasTag = false;
  var nonSpace = false;
  var indentation = "";
  var tagIndex = 0;
  function stripSpace() {
    if (hasTag && !nonSpace) {
      while (spaces.length)
        delete tokens[spaces.pop()];
    } else {
      spaces = [];
    }
    hasTag = false;
    nonSpace = false;
  }
  var openingTagRe, closingTagRe, closingCurlyRe;
  function compileTags(tagsToCompile) {
    if (typeof tagsToCompile === "string")
      tagsToCompile = tagsToCompile.split(spaceRe, 2);
    if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
      throw new Error("Invalid tags: " + tagsToCompile);
    openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + "\\s*");
    closingTagRe = new RegExp("\\s*" + escapeRegExp(tagsToCompile[1]));
    closingCurlyRe = new RegExp("\\s*" + escapeRegExp("}" + tagsToCompile[1]));
  }
  compileTags(tags || mustache.tags);
  var scanner = new Scanner(template);
  var start, type, value, chr, token, openSection;
  while (!scanner.eos()) {
    start = scanner.pos;
    value = scanner.scanUntil(openingTagRe);
    if (value) {
      for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
        chr = value.charAt(i);
        if (isWhitespace(chr)) {
          spaces.push(tokens.length);
          indentation += chr;
        } else {
          nonSpace = true;
          lineHasNonSpace = true;
          indentation += " ";
        }
        tokens.push(["text", chr, start, start + 1]);
        start += 1;
        if (chr === "\n") {
          stripSpace();
          indentation = "";
          tagIndex = 0;
          lineHasNonSpace = false;
        }
      }
    }
    if (!scanner.scan(openingTagRe))
      break;
    hasTag = true;
    type = scanner.scan(tagRe) || "name";
    scanner.scan(whiteRe);
    if (type === "=") {
      value = scanner.scanUntil(equalsRe);
      scanner.scan(equalsRe);
      scanner.scanUntil(closingTagRe);
    } else if (type === "{") {
      value = scanner.scanUntil(closingCurlyRe);
      scanner.scan(curlyRe);
      scanner.scanUntil(closingTagRe);
      type = "&";
    } else {
      value = scanner.scanUntil(closingTagRe);
    }
    if (!scanner.scan(closingTagRe))
      throw new Error("Unclosed tag at " + scanner.pos);
    if (type == ">") {
      token = [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace];
    } else {
      token = [type, value, start, scanner.pos];
    }
    tagIndex++;
    tokens.push(token);
    if (type === "#" || type === "^") {
      sections.push(token);
    } else if (type === "/") {
      openSection = sections.pop();
      if (!openSection)
        throw new Error('Unopened section "' + value + '" at ' + start);
      if (openSection[1] !== value)
        throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
    } else if (type === "name" || type === "{" || type === "&") {
      nonSpace = true;
    } else if (type === "=") {
      compileTags(value);
    }
  }
  stripSpace();
  openSection = sections.pop();
  if (openSection)
    throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);
  return nestTokens(squashTokens(tokens));
}
function squashTokens(tokens) {
  var squashedTokens = [];
  var token, lastToken;
  for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    token = tokens[i];
    if (token) {
      if (token[0] === "text" && lastToken && lastToken[0] === "text") {
        lastToken[1] += token[1];
        lastToken[3] = token[3];
      } else {
        squashedTokens.push(token);
        lastToken = token;
      }
    }
  }
  return squashedTokens;
}
function nestTokens(tokens) {
  var nestedTokens = [];
  var collector = nestedTokens;
  var sections = [];
  var token, section;
  for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    token = tokens[i];
    switch (token[0]) {
      case "#":
      case "^":
        collector.push(token);
        sections.push(token);
        collector = token[4] = [];
        break;
      case "/":
        section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
        break;
      default:
        collector.push(token);
    }
  }
  return nestedTokens;
}
function Scanner(string) {
  this.string = string;
  this.tail = string;
  this.pos = 0;
}
Scanner.prototype.eos = function eos() {
  return this.tail === "";
};
Scanner.prototype.scan = function scan(re) {
  var match = this.tail.match(re);
  if (!match || match.index !== 0)
    return "";
  var string = match[0];
  this.tail = this.tail.substring(string.length);
  this.pos += string.length;
  return string;
};
Scanner.prototype.scanUntil = function scanUntil(re) {
  var index = this.tail.search(re), match;
  switch (index) {
    case -1:
      match = this.tail;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, index);
      this.tail = this.tail.substring(index);
  }
  this.pos += match.length;
  return match;
};
function Context(view, parentContext) {
  this.view = view;
  this.cache = { ".": this.view };
  this.parent = parentContext;
}
Context.prototype.push = function push(view) {
  return new Context(view, this);
};
Context.prototype.lookup = function lookup(name) {
  var cache = this.cache;
  var value;
  if (cache.hasOwnProperty(name)) {
    value = cache[name];
  } else {
    var context = this, intermediateValue, names, index, lookupHit = false;
    while (context) {
      if (name.indexOf(".") > 0) {
        intermediateValue = context.view;
        names = name.split(".");
        index = 0;
        while (intermediateValue != null && index < names.length) {
          if (index === names.length - 1)
            lookupHit = hasProperty(intermediateValue, names[index]) || primitiveHasOwnProperty(intermediateValue, names[index]);
          intermediateValue = intermediateValue[names[index++]];
        }
      } else {
        intermediateValue = context.view[name];
        lookupHit = hasProperty(context.view, name);
      }
      if (lookupHit) {
        value = intermediateValue;
        break;
      }
      context = context.parent;
    }
    cache[name] = value;
  }
  if (isFunction(value))
    value = value.call(this.view);
  return value;
};
function Writer() {
  this.templateCache = {
    _cache: {},
    set: function set(key, value) {
      this._cache[key] = value;
    },
    get: function get(key) {
      return this._cache[key];
    },
    clear: function clear() {
      this._cache = {};
    }
  };
}
Writer.prototype.clearCache = function clearCache() {
  if (typeof this.templateCache !== "undefined") {
    this.templateCache.clear();
  }
};
Writer.prototype.parse = function parse(template, tags) {
  var cache = this.templateCache;
  var cacheKey = template + ":" + (tags || mustache.tags).join(":");
  var isCacheEnabled = typeof cache !== "undefined";
  var tokens = isCacheEnabled ? cache.get(cacheKey) : void 0;
  if (tokens == void 0) {
    tokens = parseTemplate(template, tags);
    isCacheEnabled && cache.set(cacheKey, tokens);
  }
  return tokens;
};
Writer.prototype.render = function render(template, view, partials, config) {
  var tags = this.getConfigTags(config);
  var tokens = this.parse(template, tags);
  var context = view instanceof Context ? view : new Context(view, void 0);
  return this.renderTokens(tokens, context, partials, template, config);
};
Writer.prototype.renderTokens = function renderTokens(tokens, context, partials, originalTemplate, config) {
  var buffer = "";
  var token, symbol, value;
  for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    value = void 0;
    token = tokens[i];
    symbol = token[0];
    if (symbol === "#") value = this.renderSection(token, context, partials, originalTemplate, config);
    else if (symbol === "^") value = this.renderInverted(token, context, partials, originalTemplate, config);
    else if (symbol === ">") value = this.renderPartial(token, context, partials, config);
    else if (symbol === "&") value = this.unescapedValue(token, context);
    else if (symbol === "name") value = this.escapedValue(token, context, config);
    else if (symbol === "text") value = this.rawValue(token);
    if (value !== void 0)
      buffer += value;
  }
  return buffer;
};
Writer.prototype.renderSection = function renderSection(token, context, partials, originalTemplate, config) {
  var self = this;
  var buffer = "";
  var value = context.lookup(token[1]);
  function subRender(template) {
    return self.render(template, context, partials, config);
  }
  if (!value) return;
  if (isArray(value)) {
    for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
      buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate, config);
    }
  } else if (typeof value === "object" || typeof value === "string" || typeof value === "number") {
    buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate, config);
  } else if (isFunction(value)) {
    if (typeof originalTemplate !== "string")
      throw new Error("Cannot use higher-order sections without the original template");
    value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);
    if (value != null)
      buffer += value;
  } else {
    buffer += this.renderTokens(token[4], context, partials, originalTemplate, config);
  }
  return buffer;
};
Writer.prototype.renderInverted = function renderInverted(token, context, partials, originalTemplate, config) {
  var value = context.lookup(token[1]);
  if (!value || isArray(value) && value.length === 0)
    return this.renderTokens(token[4], context, partials, originalTemplate, config);
};
Writer.prototype.indentPartial = function indentPartial(partial, indentation, lineHasNonSpace) {
  var filteredIndentation = indentation.replace(/[^ \t]/g, "");
  var partialByNl = partial.split("\n");
  for (var i = 0; i < partialByNl.length; i++) {
    if (partialByNl[i].length && (i > 0 || !lineHasNonSpace)) {
      partialByNl[i] = filteredIndentation + partialByNl[i];
    }
  }
  return partialByNl.join("\n");
};
Writer.prototype.renderPartial = function renderPartial(token, context, partials, config) {
  if (!partials) return;
  var tags = this.getConfigTags(config);
  var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
  if (value != null) {
    var lineHasNonSpace = token[6];
    var tagIndex = token[5];
    var indentation = token[4];
    var indentedValue = value;
    if (tagIndex == 0 && indentation) {
      indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
    }
    var tokens = this.parse(indentedValue, tags);
    return this.renderTokens(tokens, context, partials, indentedValue, config);
  }
};
Writer.prototype.unescapedValue = function unescapedValue(token, context) {
  var value = context.lookup(token[1]);
  if (value != null)
    return value;
};
Writer.prototype.escapedValue = function escapedValue(token, context, config) {
  var escape = this.getConfigEscape(config) || mustache.escape;
  var value = context.lookup(token[1]);
  if (value != null)
    return typeof value === "number" && escape === mustache.escape ? String(value) : escape(value);
};
Writer.prototype.rawValue = function rawValue(token) {
  return token[1];
};
Writer.prototype.getConfigTags = function getConfigTags(config) {
  if (isArray(config)) {
    return config;
  } else if (config && typeof config === "object") {
    return config.tags;
  } else {
    return void 0;
  }
};
Writer.prototype.getConfigEscape = function getConfigEscape(config) {
  if (config && typeof config === "object" && !isArray(config)) {
    return config.escape;
  } else {
    return void 0;
  }
};
var mustache = {
  name: "mustache.js",
  version: "4.2.0",
  tags: ["{{", "}}"],
  clearCache: void 0,
  escape: void 0,
  parse: void 0,
  render: void 0,
  Scanner: void 0,
  Context: void 0,
  Writer: void 0,
  /**
   * Allows a user to override the default caching strategy, by providing an
   * object with set, get and clear methods. This can also be used to disable
   * the cache by setting it to the literal `undefined`.
   */
  set templateCache(cache) {
    defaultWriter.templateCache = cache;
  },
  /**
   * Gets the default or overridden caching object from the default writer.
   */
  get templateCache() {
    return defaultWriter.templateCache;
  }
};
var defaultWriter = new Writer();
mustache.clearCache = function clearCache2() {
  return defaultWriter.clearCache();
};
mustache.parse = function parse2(template, tags) {
  return defaultWriter.parse(template, tags);
};
mustache.render = function render2(template, view, partials, config) {
  if (typeof template !== "string") {
    throw new TypeError('Invalid template! Template should be a "string" but "' + typeStr(template) + '" was given as the first argument for mustache#render(template, view, partials)');
  }
  return defaultWriter.render(template, view, partials, config);
};
mustache.escape = escapeHtml;
mustache.Scanner = Scanner;
mustache.Context = Context;
mustache.Writer = Writer;
var mustache_default = mustache;

// src/js/modules/products.js
var TEMPLATE_PRODUCT = `
   {{#products}}   
        <div class="product-card bg-amber-100 p-4 rounded" data-product-id="{{id}}">
            <div class="product-image-container w-full aspect-square bg-gray-200 rounded overflow-hidden relative mb-4">
                <img src="{{image}}" alt="{{name}}" class="absolute inset-0 w-full h-full object-cover">
            </div>
            <h3 class="text-2xl font-bold mt-2 text-amber-900">{{name}}</h3>
            <p class="text-xl mt-1 text-slate-700">{{#price}}\u20AC{{/price}}{{price}}{{^price}}Ask for price{{/price}}</p>
            <p class="text-xl mt-1 text-slate-700 mb-10">{{description}}{{^description}}No description available{{/description}}</p>
            <p class="text-center mb-10">
                <button class="add-to-cart-btn hover:ring-2 hover:ring-white drop-shadow-lg hover:ring-offset-2 text-xl mt-1 text-white bg-lime-800 py-4 px-8 rounded-sm hover:bg-lime-500 transition-colors">
                    Add to Cart
                </button>
            </p>
        </div>
        {{/products}}
`;
var ProductCard = class {
  /**
   * @type {Product[]}
   */
  static products = [
    {
      name: "Calabash Lamp 1",
      price: 200,
      id: "1",
      description: "This is the first product",
      image: "assets/lamp1-night.jpg"
    },
    {
      name: "Calabash Lamp 2",
      price: 200,
      id: "2",
      description: "This is the second product",
      image: "assets/lamp2-day.jpg"
    },
    {
      name: "Calabash Lamp 3",
      price: 200,
      id: "3",
      description: "This is the third product",
      image: "assets/lamp3-day.jpg"
    }
  ];
  /**
   * Find a product by its ID
   * @param {string} id - Product ID to find
   * @returns {Product|undefined} Found product or undefined
   */
  static findProductById(id) {
    return this.products.find((p) => p.id === id);
  }
  /**
   * Normalize product data for cart
   * @param {Product} product - Product to normalize
   * @returns {Product} Normalized product copy
   */
  static normalizeProduct(product) {
    const normalized = JSON.parse(JSON.stringify(product));
    normalized.id = String(normalized.id);
    if (normalized.price) {
      normalized.price = parseFloat(normalized.price);
    }
    return normalized;
  }
  /**
   * Initialize product cards and bind event handlers
   */
  static init() {
    const productCards = document.querySelectorAll(".product-card");
    productCards.forEach((card) => {
      const addToCartBtn = card.querySelector(".add-to-cart-btn");
      const productId = card.dataset.productId;
      if (addToCartBtn) {
        addToCartBtn.addEventListener("click", () => {
          this.addToCart(productId);
        });
      }
    });
  }
  /**
   * Add product to cart by ID
   * @param {string} productId - Product ID to add to cart
   */
  static addToCart(productId) {
    const product = this.findProductById(productId);
    if (!product) {
      console.error(`Product with ID ${productId} not found`);
      return;
    }
    const productCopy = this.normalizeProduct(product);
    const event = new CustomEvent("cart:add", {
      detail: { product: productCopy }
    });
    document.dispatchEvent(event);
    console.log(`Added product ${product.name} to cart`);
  }
};
function renderProducts() {
  const productContainer = document.getElementById("js-products");
  if (!productContainer) {
    console.warn("Product template or container not found");
    return;
  }
  productContainer.innerHTML = mustache_default.render(TEMPLATE_PRODUCT, { products: ProductCard.products });
  ProductCard.init();
}
function initializeProducts() {
  console.log("Initializing product functionality...");
  renderProducts();
}

// node_modules/@emailjs/browser/es/models/EmailJSResponseStatus.js
var EmailJSResponseStatus = class {
  constructor(_status = 0, _text = "Network Error") {
    this.status = _status;
    this.text = _text;
  }
};

// node_modules/@emailjs/browser/es/utils/createWebStorage/createWebStorage.js
var createWebStorage = () => {
  if (typeof localStorage === "undefined")
    return;
  return {
    get: (key) => Promise.resolve(localStorage.getItem(key)),
    set: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    remove: (key) => Promise.resolve(localStorage.removeItem(key))
  };
};

// node_modules/@emailjs/browser/es/store/store.js
var store = {
  origin: "https://api.emailjs.com",
  blockHeadless: false,
  storageProvider: createWebStorage()
};

// node_modules/@emailjs/browser/es/utils/buildOptions/buildOptions.js
var buildOptions = (options) => {
  if (!options)
    return {};
  if (typeof options === "string") {
    return {
      publicKey: options
    };
  }
  if (options.toString() === "[object Object]") {
    return options;
  }
  return {};
};

// node_modules/@emailjs/browser/es/methods/init/init.js
var init = (options, origin = "https://api.emailjs.com") => {
  if (!options)
    return;
  const opts = buildOptions(options);
  store.publicKey = opts.publicKey;
  store.blockHeadless = opts.blockHeadless;
  store.storageProvider = opts.storageProvider;
  store.blockList = opts.blockList;
  store.limitRate = opts.limitRate;
  store.origin = opts.origin || origin;
};

// node_modules/@emailjs/browser/es/api/sendPost.js
var sendPost = async (url, data, headers = {}) => {
  const response = await fetch(store.origin + url, {
    method: "POST",
    headers,
    body: data
  });
  const message = await response.text();
  const responseStatus = new EmailJSResponseStatus(response.status, message);
  if (response.ok) {
    return responseStatus;
  }
  throw responseStatus;
};

// node_modules/@emailjs/browser/es/utils/validateParams/validateParams.js
var validateParams = (publicKey, serviceID, templateID) => {
  if (!publicKey || typeof publicKey !== "string") {
    throw "The public key is required. Visit https://dashboard.emailjs.com/admin/account";
  }
  if (!serviceID || typeof serviceID !== "string") {
    throw "The service ID is required. Visit https://dashboard.emailjs.com/admin";
  }
  if (!templateID || typeof templateID !== "string") {
    throw "The template ID is required. Visit https://dashboard.emailjs.com/admin/templates";
  }
};

// node_modules/@emailjs/browser/es/utils/validateTemplateParams/validateTemplateParams.js
var validateTemplateParams = (templateParams) => {
  if (templateParams && templateParams.toString() !== "[object Object]") {
    throw "The template params have to be the object. Visit https://www.emailjs.com/docs/sdk/send/";
  }
};

// node_modules/@emailjs/browser/es/utils/isHeadless/isHeadless.js
var isHeadless = (navigator2) => {
  return navigator2.webdriver || !navigator2.languages || navigator2.languages.length === 0;
};

// node_modules/@emailjs/browser/es/errors/headlessError/headlessError.js
var headlessError = () => {
  return new EmailJSResponseStatus(451, "Unavailable For Headless Browser");
};

// node_modules/@emailjs/browser/es/utils/validateBlockListParams/validateBlockListParams.js
var validateBlockListParams = (list, watchVariable) => {
  if (!Array.isArray(list)) {
    throw "The BlockList list has to be an array";
  }
  if (typeof watchVariable !== "string") {
    throw "The BlockList watchVariable has to be a string";
  }
};

// node_modules/@emailjs/browser/es/utils/isBlockedValueInParams/isBlockedValueInParams.js
var isBlockListDisabled = (options) => {
  return !options.list?.length || !options.watchVariable;
};
var getValue = (data, name) => {
  return data instanceof FormData ? data.get(name) : data[name];
};
var isBlockedValueInParams = (options, params) => {
  if (isBlockListDisabled(options))
    return false;
  validateBlockListParams(options.list, options.watchVariable);
  const value = getValue(params, options.watchVariable);
  if (typeof value !== "string")
    return false;
  return options.list.includes(value);
};

// node_modules/@emailjs/browser/es/errors/blockedEmailError/blockedEmailError.js
var blockedEmailError = () => {
  return new EmailJSResponseStatus(403, "Forbidden");
};

// node_modules/@emailjs/browser/es/utils/validateLimitRateParams/validateLimitRateParams.js
var validateLimitRateParams = (throttle, id) => {
  if (typeof throttle !== "number" || throttle < 0) {
    throw "The LimitRate throttle has to be a positive number";
  }
  if (id && typeof id !== "string") {
    throw "The LimitRate ID has to be a non-empty string";
  }
};

// node_modules/@emailjs/browser/es/utils/isLimitRateHit/isLimitRateHit.js
var getLeftTime = async (id, throttle, storage) => {
  const lastTime = Number(await storage.get(id) || 0);
  return throttle - Date.now() + lastTime;
};
var isLimitRateHit = async (defaultID, options, storage) => {
  if (!options.throttle || !storage) {
    return false;
  }
  validateLimitRateParams(options.throttle, options.id);
  const id = options.id || defaultID;
  const leftTime = await getLeftTime(id, options.throttle, storage);
  if (leftTime > 0) {
    return true;
  }
  await storage.set(id, Date.now().toString());
  return false;
};

// node_modules/@emailjs/browser/es/errors/limitRateError/limitRateError.js
var limitRateError = () => {
  return new EmailJSResponseStatus(429, "Too Many Requests");
};

// node_modules/@emailjs/browser/es/methods/send/send.js
var send = async (serviceID, templateID, templateParams, options) => {
  const opts = buildOptions(options);
  const publicKey = opts.publicKey || store.publicKey;
  const blockHeadless = opts.blockHeadless || store.blockHeadless;
  const storageProvider = opts.storageProvider || store.storageProvider;
  const blockList = { ...store.blockList, ...opts.blockList };
  const limitRate = { ...store.limitRate, ...opts.limitRate };
  if (blockHeadless && isHeadless(navigator)) {
    return Promise.reject(headlessError());
  }
  validateParams(publicKey, serviceID, templateID);
  validateTemplateParams(templateParams);
  if (templateParams && isBlockedValueInParams(blockList, templateParams)) {
    return Promise.reject(blockedEmailError());
  }
  if (await isLimitRateHit(location.pathname, limitRate, storageProvider)) {
    return Promise.reject(limitRateError());
  }
  const params = {
    lib_version: "4.4.1",
    user_id: publicKey,
    service_id: serviceID,
    template_id: templateID,
    template_params: templateParams
  };
  return sendPost("/api/v1.0/email/send", JSON.stringify(params), {
    "Content-type": "application/json"
  });
};

// node_modules/@emailjs/browser/es/utils/validateForm/validateForm.js
var validateForm = (form) => {
  if (!form || form.nodeName !== "FORM") {
    throw "The 3rd parameter is expected to be the HTML form element or the style selector of the form";
  }
};

// node_modules/@emailjs/browser/es/methods/sendForm/sendForm.js
var findHTMLForm = (form) => {
  return typeof form === "string" ? document.querySelector(form) : form;
};
var sendForm = async (serviceID, templateID, form, options) => {
  const opts = buildOptions(options);
  const publicKey = opts.publicKey || store.publicKey;
  const blockHeadless = opts.blockHeadless || store.blockHeadless;
  const storageProvider = store.storageProvider || opts.storageProvider;
  const blockList = { ...store.blockList, ...opts.blockList };
  const limitRate = { ...store.limitRate, ...opts.limitRate };
  if (blockHeadless && isHeadless(navigator)) {
    return Promise.reject(headlessError());
  }
  const currentForm = findHTMLForm(form);
  validateParams(publicKey, serviceID, templateID);
  validateForm(currentForm);
  const formData = new FormData(currentForm);
  if (isBlockedValueInParams(blockList, formData)) {
    return Promise.reject(blockedEmailError());
  }
  if (await isLimitRateHit(location.pathname, limitRate, storageProvider)) {
    return Promise.reject(limitRateError());
  }
  formData.append("lib_version", "4.4.1");
  formData.append("service_id", serviceID);
  formData.append("template_id", templateID);
  formData.append("user_id", publicKey);
  return sendPost("/api/v1.0/email/send-form", formData);
};

// node_modules/@emailjs/browser/es/index.js
var es_default = {
  init,
  send,
  sendForm,
  EmailJSResponseStatus
};

// src/_data/config.js
var config_default = {
  siteName: "Bav'artS Collection",
  siteDescription: "Bav'artS Collection",
  siteUrl: "https://bavarts-collection.com",
  siteAuthor: "muchmoredesign",
  emailjs: {
    serviceId: "bava_core",
    publicKey: "wqk3XEKm16oaV5pum",
    defaultRecipient: "sakke.laaksonen@gmail.com",
    templateId: "bava_order_confirm"
  },
  site: {
    name: "Bav'ArtS Collection",
    url: "https://sakkelaaksonen.github.io/bavarts/"
  }
};

// src/js/modules/email.js
var EmailService = class {
  /**
   * Creates an instance of EmailService
   */
  constructor() {
    this.defaultRecipient = config_default.emailjs.defaultRecipient;
    es_default.init(config_default.emailjs.publicKey);
  }
  /**
   * Sends order via EmailJS service
   * @param {Object} orderData - The cart order data
   * @returns {Promise} Promise that resolves when email is sent
   * @private
   */
  #sendEmailJs(orderData) {
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const totalUnits = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
    const ordersText = orderData.items.map(
      (item) => `${item.name} x${item.quantity} - \u20AC${item.price ? (item.price * item.quantity).toFixed(2) : "Price on request"}`
    ).join("\n");
    const firstImageUrl = orderData.items.length > 0 ? `${config_default.site.url}${orderData.items[0].image}` : "";
    const firstItemPrice = orderData.items.length > 0 && orderData.items[0].price ? orderData.items[0].price.toFixed(2) : "0.00";
    const templateParams = {
      order_id: orderId,
      orders: ordersText,
      image_url: firstImageUrl,
      name: orderData.customer.name,
      units: totalUnits.toString(),
      price: firstItemPrice,
      cost: orderData.total.toFixed(2),
      email: orderData.customer.email
    };
    console.log("Sending order via EmailJS:", templateParams);
    return es_default.send(
      config_default.emailjs.serviceId,
      config_default.emailjs.templateId,
      templateParams
    );
  }
  /**
   * Sends order details via email
   * @param {Object} orderData - The order data to send
   * @returns {Promise} Promise that resolves when email is sent
   */
  sendOrderEmail(orderData) {
    return new Promise((resolve, reject) => {
      try {
        this.#sendEmailJs(orderData).then(() => {
          console.log("Order sent successfully via EmailJS");
          resolve();
        }).catch((error) => {
          console.warn("EmailJS failed, falling back to mailto:", error);
          this.sendOrderEmailFallback(orderData).then(resolve).catch(reject);
        });
      } catch (error) {
        console.warn("EmailJS setup failed, using mailto fallback:", error);
        this.sendOrderEmailFallback(orderData).then(resolve).catch(reject);
      }
    });
  }
  /**
   * Fallback email method using mailto
   * @param {Object} orderData - The order data to send
   * @returns {Promise} Promise that resolves when email is sent
   * @private
   */
  sendOrderEmailFallback(orderData) {
    return new Promise((resolve, reject) => {
      const subject = `New Order from ${orderData.customer.name}`;
      const body = this.formatOrderEmail(orderData);
      const mailtoLink = `mailto:${this.defaultRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        this.copyToClipboard(body).then(() => {
          const userConfirmed = confirm(
            "Order details have been copied to your clipboard!\n\nClick OK to open your email client, or Cancel to handle manually.\n\nYou can paste the order details into any email application."
          );
          if (userConfirmed) {
            window.location.href = mailtoLink;
          }
          setTimeout(() => {
            resolve();
          }, 1e3);
        }).catch(() => {
          const userConfirmed = confirm(
            "Click OK to open your email client with the order details.\n\nNote: Order details could not be copied to clipboard automatically."
          );
          if (userConfirmed) {
            window.location.href = mailtoLink;
          }
          setTimeout(() => {
            resolve();
          }, 1e3);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * Copies text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise} Promise that resolves when text is copied
   * @private
   */
  copyToClipboard(text) {
    return new Promise((resolve, reject) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(resolve).catch(reject);
      } else {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textArea);
          if (successful) {
            resolve();
          } else {
            reject(new Error("Copy command failed"));
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  }
  /**
   * Formats order data into email content
   * @param {Object} orderData - The order data to format
   * @returns {string} Formatted email body
   * @private
   */
  formatOrderEmail(orderData) {
    let emailBody = `New Order Details:

`;
    emailBody += `Customer Information:
`;
    emailBody += `Name: ${orderData.customer.name}
`;
    emailBody += `Email: ${orderData.customer.email}

`;
    emailBody += `Shipping Address:
`;
    emailBody += `Street: ${orderData.customer.address.street}
`;
    emailBody += `City: ${orderData.customer.address.city}
`;
    emailBody += `Postal Code: ${orderData.customer.address.postal}
`;
    emailBody += `Country: ${orderData.customer.address.country}

`;
    emailBody += `Order Items:
`;
    orderData.items.forEach((item, index) => {
      const itemTotal = item.price ? (item.price * item.quantity).toFixed(2) : "N/A";
      emailBody += `${index + 1}. ${item.name}
`;
      emailBody += `   Quantity: ${item.quantity}
`;
      emailBody += `   Price: \u20AC${item.price ? item.price.toFixed(2) : "N/A"}
`;
      emailBody += `   Total: \u20AC${itemTotal}

`;
    });
    emailBody += `Order Total: \u20AC${orderData.total.toFixed(2)}

`;
    emailBody += `Order Date: ${new Date(orderData.timestamp).toLocaleString()}

`;
    emailBody += `Please process this order and contact the customer for payment and delivery arrangements.
`;
    return emailBody;
  }
};

// src/js/modules/cart.js
var TEMPLATE_CART = `  {{#items}}
        <div class="flex items-center space-x-4 p-2 bg-gray-50 rounded">
            <img src="{{image}}" alt="{{name}}" class="w-16 h-16 object-cover rounded">
            <div class="flex-1">
                <h3 class="font-bold">{{name}}</h3>
                {{#price}}
                <p class="text-gray-600">
                    \u20AC{{price}} \xD7 {{quantity}} = \u20AC{{total}}
                </p>
                {{/price}}
                {{^price}}
                <p class="text-gray-600">Price on request</p>
                {{/price}}
                <div class="flex items-center space-x-2 mt-1">
                    <button data-action="update-quantity" data-product-id="{{id}}" data-change="-1"
                        class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">-</button>
                    <span>{{quantity}}</span>
                    <button data-action="update-quantity" data-product-id="{{id}}" data-change="1"
                        class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">+</button>
                </div>
            </div>
            <button data-action="remove-item" data-product-id="{{id}}" 
                class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
        </div>
        {{/items}}
        {{^items}}
        <p class="text-gray-500 text-center py-4">Your cart is empty</p>
        {{/items}}
`;
var CART_CONFIG = {
  /** @type {Object} DOM element IDs */
  ELEMENTS: {
    CART_PANEL: "cart-panel",
    CART_BUTTON: "cart-button",
    CART_BUTTON_MOBILE: "cart-button-mobile",
    CLOSE_CART: "close-cart",
    CLEAR_CART: "clear-cart",
    CHECKOUT_BUTTON: "checkout-btn",
    CART_COUNT: "cart-count",
    CART_COUNT_MOBILE: "cart-count-mobile",
    CART_ITEMS: "cart-items",
    CART_TOTAL: "cart-total",
    // Form elements
    CHECKOUT_FORM: "checkout-form",
    CUSTOMER_NAME: "cart-customer-name",
    CUSTOMER_EMAIL: "cart-customer-email",
    ACCEPT_TOS: "cart-accept-tos",
    // Address fields
    ADDRESS_STREET: "cart-address-street",
    ADDRESS_CITY: "cart-address-city",
    ADDRESS_POSTAL: "cart-address-postal",
    ADDRESS_COUNTRY: "cart-address-country"
  },
  /** @type {Object} CSS classes */
  CLASSES: {
    TRANSLATE_FULL: "translate-x-full"
  },
  /** @type {Object} Storage keys */
  STORAGE: {
    CART_ITEMS: "cart"
  },
  /** @type {Object} Currency formatting */
  CURRENCY: {
    SYMBOL: "\u20AC",
    DECIMALS: 2
  }
};
var ShoppingCart = class {
  /**
   * @constructor
   * @description Initializes a new shopping cart instance
   */
  constructor() {
    this.items = [];
    this.customerInfo = this.createDefaultCustomerInfo();
    this.emailService = new EmailService();
    this.elements = {
      form: document.getElementById(CART_CONFIG.ELEMENTS.CHECKOUT_FORM),
      nameField: document.getElementById(CART_CONFIG.ELEMENTS.CUSTOMER_NAME),
      emailField: document.getElementById(CART_CONFIG.ELEMENTS.CUSTOMER_EMAIL),
      tosField: document.getElementById(CART_CONFIG.ELEMENTS.ACCEPT_TOS),
      submitButton: document.getElementById(CART_CONFIG.ELEMENTS.CHECKOUT_BUTTON),
      streetField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_STREET),
      cityField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_CITY),
      postalField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_POSTAL),
      countryField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_COUNTRY)
    };
    const templateElement = document.getElementById(CART_CONFIG.ELEMENTS.CART_TEMPLATE);
    this.cartTemplate = TEMPLATE_CART;
    this.init();
  }
  /**
   * @description Get the total price of all items in the cart
   * @returns {number}
   */
  get total() {
    return this.items.reduce((sum, item) => {
      return sum + (item.price ? item.price * item.quantity : 0);
    }, 0);
  }
  /**
   * @description Get the total number of items in the cart
   * @returns {number}
   */
  get count() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }
  /**
   * @description Initializes the cart by loading saved items and setting up event listeners
   * @private
   */
  init() {
    this.loadCart();
    this.setupEventListeners();
    this.setupFormValidation();
    this.setupAccordions();
  }
  /**
   * @description Sets up form validation event listeners
   * @private
   */
  setupFormValidation() {
    const form = this.elements.form;
    const nameField = this.elements.nameField;
    const emailField = this.elements.emailField;
    const tosField = this.elements.tosField;
    const submitButton = this.elements.submitButton;
    const streetField = this.elements.streetField;
    const cityField = this.elements.cityField;
    const postalField = this.elements.postalField;
    const countryField = this.elements.countryField;
    if (!form || !nameField || !emailField || !tosField || !submitButton || !streetField || !cityField || !postalField || !countryField) {
      console.error("Form elements not found");
      return;
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.clearValidationMessages();
      const isValid = this.validateForm();
      if (isValid) {
        this.customerInfo.name = nameField.value.trim();
        this.customerInfo.email = emailField.value.trim();
        this.customerInfo.acceptedTos = tosField.checked;
        if (!this.customerInfo.address) {
          this.customerInfo.address = {};
        }
        this.customerInfo.address.street = streetField.value.trim();
        this.customerInfo.address.city = cityField.value.trim();
        this.customerInfo.address.postal = postalField.value.trim();
        this.customerInfo.address.country = countryField.value;
        this.submitOrder();
      } else {
        this.showValidationErrors();
      }
    });
    [nameField, emailField, streetField, cityField, postalField, countryField].forEach((field) => {
      field.addEventListener("input", () => {
        this.updateSubmitButtonState();
      });
    });
    tosField.addEventListener("change", () => {
      this.updateSubmitButtonState();
    });
    this.updateSubmitButtonState();
  }
  /**
   * @description Updates the submit button state based on form validity
   * @private
   */
  updateSubmitButtonState() {
    const form = this.elements.form;
    const submitButton = this.elements.submitButton;
    if (!form || !submitButton) return;
    const isFormValid = form.checkValidity();
    const hasItems = this.items.length > 0;
    submitButton.disabled = !isFormValid || !hasItems;
    const submitText = submitButton.querySelector(".checkout-btn-text");
    const submitLoading = submitButton.querySelector(".checkout-btn-loading");
    if (submitText) {
      if (!hasItems) {
        submitText.textContent = "Cart is Empty";
      } else if (!isFormValid) {
        submitText.textContent = "Complete Form";
      } else {
        submitText.textContent = "Send Order";
      }
    }
  }
  /**
   * @description Validates a single form field
   * @param {HTMLElement} field - The form field to validate
   * @private
   */
  validateField(field) {
    const isValid = field.checkValidity();
    if (field.value.trim() === "") {
      field.classList.remove("invalid");
    } else {
      if (isValid) {
        field.classList.remove("invalid");
      } else {
        field.classList.add("invalid");
      }
    }
  }
  /**
   * @description Validates the checkout form
   * @returns {boolean} True if form is valid
   * @private
   */
  validateForm() {
    const nameField = this.elements.nameField;
    const emailField = this.elements.emailField;
    const tosField = this.elements.tosField;
    const streetField = this.elements.streetField;
    const cityField = this.elements.cityField;
    const postalField = this.elements.postalField;
    const countryField = this.elements.countryField;
    let isValid = true;
    const errors = [];
    if (!nameField.value.trim() || nameField.value.trim().length < 2) {
      isValid = false;
      errors.push("Name must be at least 2 characters long");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailField.value.trim() || !emailRegex.test(emailField.value.trim())) {
      isValid = false;
      errors.push("Please enter a valid email address");
    }
    if (!streetField.value.trim() || streetField.value.trim().length < 5) {
      isValid = false;
      errors.push("Street address must be at least 5 characters long");
    }
    if (!cityField.value.trim() || cityField.value.trim().length < 2) {
      isValid = false;
      errors.push("City must be at least 2 characters long");
    }
    if (!postalField.value.trim() || postalField.value.trim().length < 4) {
      isValid = false;
      errors.push("Postal code must be at least 4 characters long");
    }
    if (!countryField.value) {
      isValid = false;
      errors.push("Please select a country");
    }
    if (!tosField.checked) {
      isValid = false;
      errors.push("You must accept the Terms of Service");
    }
    this.validationErrors = errors;
    return isValid;
  }
  /**
   * @description Clears validation messages from the UI
   * @private
   */
  clearValidationMessages() {
    const validationMessages = document.getElementById("cart-validation-messages");
    const successMessage = document.getElementById("cart-success-message");
    if (validationMessages) {
      validationMessages.classList.add("hidden");
    }
    if (successMessage) {
      successMessage.classList.add("hidden");
    }
  }
  /**
   * @description Shows validation errors in the UI
   * @private
   */
  showValidationErrors() {
    const validationMessages = document.getElementById("cart-validation-messages");
    const validationList = document.getElementById("cart-validation-list");
    if (validationMessages && validationList && this.validationErrors) {
      validationList.innerHTML = "";
      this.validationErrors.forEach((error) => {
        const li = document.createElement("li");
        li.textContent = error;
        validationList.appendChild(li);
      });
      validationMessages.classList.remove("hidden");
    }
  }
  /**
   * @description Handles form submission
   * @private
   */
  handleFormSubmit() {
    if (this.items.length === 0) {
      alert("Your cart is empty");
      return;
    }
    if (!this.validateForm()) {
      return;
    }
    this.processCheckout();
  }
  /**
   * @description Processes the checkout with customer and address information
   * @private
   */
  processCheckout() {
    if (this.items.length === 0) {
      alert("Your cart is empty");
      return;
    }
    let orderText = `Order Details:

`;
    orderText += `Customer Information:
`;
    orderText += `Name: ${this.customerInfo.name}
`;
    orderText += `Email: ${this.customerInfo.email}

`;
    orderText += `Delivery Address:
`;
    orderText += `${this.customerInfo.address.street}
`;
    orderText += `${this.customerInfo.address.city}, ${this.customerInfo.address.postal}
`;
    orderText += `${this.customerInfo.address.country}

`;
    orderText += `Items:
`;
    this.items.forEach((item) => {
      orderText += `- ${item.name}
`;
      orderText += `  Quantity: ${item.quantity}
`;
      if (item.price) {
        orderText += `  Price: \u20AC${(item.price * item.quantity).toFixed(2)}
`;
      }
      orderText += "\n";
    });
    orderText += `Total: \u20AC${this.total.toFixed(2)}`;
    const subject = encodeURIComponent("Order from " + this.customerInfo.name);
    let bodyText = encodeURIComponent("Order Details:") + "%0D%0A%0D%0A";
    bodyText += encodeURIComponent("Customer Information:") + "%0D%0A";
    bodyText += encodeURIComponent("Name: " + this.customerInfo.name) + "%0D%0A";
    bodyText += encodeURIComponent("Email: " + this.customerInfo.email) + "%0D%0A%0D%0A";
    bodyText += encodeURIComponent("Delivery Address:") + "%0D%0A";
    bodyText += encodeURIComponent(this.customerInfo.address.street) + "%0D%0A";
    bodyText += encodeURIComponent(this.customerInfo.address.city + ", " + this.customerInfo.address.postal) + "%0D%0A";
    bodyText += encodeURIComponent(this.customerInfo.address.country) + "%0D%0A%0D%0A";
    bodyText += encodeURIComponent("Items:") + "%0D%0A";
    this.items.forEach((item) => {
      bodyText += encodeURIComponent("- " + item.name) + "%0D%0A";
      bodyText += encodeURIComponent("  Quantity: " + item.quantity) + "%0D%0A";
      if (item.price) {
        bodyText += encodeURIComponent("  Price: \u20AC" + (item.price * item.quantity).toFixed(2)) + "%0D%0A";
      }
      bodyText += "%0D%0A";
    });
    bodyText += encodeURIComponent("Total: \u20AC" + this.total.toFixed(2));
    navigator.clipboard.writeText(orderText).then(() => {
      alert(`Thanks ${this.customerInfo.name}! I've copied your order to your clipboard - just paste it anywhere to send it to me. Can't wait to get started on it!`);
      const mailtoLink = `mailto:contact@example.com?subject=${subject}&body=${bodyText}`;
      window.location.href = mailtoLink;
      this.clearFormAndCart();
    }).catch((err) => {
      console.error("Failed to copy cart contents:", err);
      alert("Oops! Something went wrong while trying to copy your order. Opening email client instead!");
      const mailtoLink = `mailto:contact@example.com?subject=${subject}&body=${bodyText}`;
      window.location.href = mailtoLink;
      this.clearFormAndCart();
    });
  }
  /**
   * @description Clears the form and cart after successful checkout
   * @private
   */
  clearFormAndCart() {
    const form = this.elements.form;
    if (form) {
      form.reset();
    }
    this.customerInfo = this.createDefaultCustomerInfo();
    this.clearCart();
    this.togglePanel();
  }
  /**
   * @description Sets up event listeners for cart functionality
   * @private
   */
  setupEventListeners() {
    const cartButton = document.getElementById(CART_CONFIG.ELEMENTS.CART_BUTTON);
    const cartButtonMobile = document.getElementById(CART_CONFIG.ELEMENTS.CART_BUTTON_MOBILE);
    const closeCartButton = document.getElementById(CART_CONFIG.ELEMENTS.CLOSE_CART);
    const clearCartButton = document.getElementById(CART_CONFIG.ELEMENTS.CLEAR_CART);
    if (cartButton) cartButton.onclick = () => this.togglePanel();
    if (cartButtonMobile) cartButtonMobile.onclick = () => this.togglePanel();
    if (closeCartButton) closeCartButton.onclick = () => this.togglePanel();
    if (clearCartButton) clearCartButton.onclick = () => this.clearCart();
    const cartItemsContainer = document.getElementById(CART_CONFIG.ELEMENTS.CART_ITEMS);
    if (cartItemsContainer) {
      cartItemsContainer.addEventListener("click", (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        const productId = button.dataset.productId;
        switch (action) {
          case "update-quantity":
            const change = parseInt(button.dataset.change, 10);
            const item = this.items.find((item2) => item2.id === productId);
            if (item) {
              this.updateQuantity(productId, item.quantity, change);
            }
            break;
          case "remove-item":
            this.removeItem(productId);
            break;
        }
      });
    }
    document.addEventListener("cart:add", (event) => {
      const { product } = event.detail;
      this.addItem(product);
    });
    document.addEventListener("keydown", (e) => {
      const cartPanel = document.getElementById(CART_CONFIG.ELEMENTS.CART_PANEL);
      if (e.key === "Escape" && cartPanel && !cartPanel.classList.contains(CART_CONFIG.CLASSES.TRANSLATE_FULL)) {
        this.togglePanel();
      }
    });
  }
  /**
   * @description Toggles the visibility of the cart panel
   * @public
   */
  togglePanel() {
    const panel = document.getElementById(CART_CONFIG.ELEMENTS.CART_PANEL);
    const cartItems = document.getElementById(CART_CONFIG.ELEMENTS.CART_ITEMS);
    const template = TEMPLATE_CART;
    if (!panel || !cartItems || !template) {
      console.error("Required DOM elements not found");
      return;
    }
    panel.classList.toggle(CART_CONFIG.CLASSES.TRANSLATE_FULL);
  }
  /**
   * @description Adds an item to the cart or increments its quantity if it already exists
   * @param {Object} product - The product to add to the cart
   * @param {string} product.id - Product unique identifier
   * @param {string} product.name - Product name
   * @param {number|undefined} product.price - Product price
   * @param {string} product.image - Product image URL
   * @public
   */
  addItem(product) {
    if (!product || typeof product !== "object") return;
    if (!product.id || !product.name || !product.image) {
      console.error("Invalid product data:", product);
      return;
    }
    const normalizedProduct = {
      ...product,
      id: String(product.id),
      price: product.price ? Number(product.price) : void 0
    };
    const existingItem = this.items.find((item) => item.id === normalizedProduct.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      normalizedProduct.quantity = 1;
      this.items.push(normalizedProduct);
    }
    this.updateCart();
  }
  /**
   * @description Removes an item from the cart
   * @param {string} productId - ID of the product to remove
   * @public
   */
  removeItem(productId) {
    this.items = this.items.filter((item) => item.id !== productId);
    this.updateCart();
  }
  /**
   * @description Updates the quantity of an item in the cart
   * @param {string} productId - ID of the product to update
   * @param {number} currentQty - Current quantity of the product
   * @param {number} change - Amount to change the quantity by (positive or negative)
   * @public
   */
  updateQuantity(productId, currentQty, change) {
    if (typeof productId !== "string" || typeof currentQty !== "number" || typeof change !== "number") {
      console.error("Invalid arguments to updateQuantity");
      return;
    }
    const item = this.items.find((item2) => item2.id === productId);
    if (!item) return;
    const newQty = currentQty + change;
    if (newQty <= 0) {
      this.removeItem(productId);
    } else {
      item.quantity = newQty;
      this.updateCart();
    }
  }
  /**
   * @description Clears all items from the cart
   */
  clearCart() {
    this.items = [];
    this.updateCart();
  }
  /**
   * @description Legacy checkout method - now redirects to form submission
   * @public
   * @deprecated Use form submission instead
   */
  checkout() {
    const form = this.elements.form;
    if (form) {
      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  }
  /**
   * @private
   * @description Updates cart state and triggers UI update
   */
  updateCart() {
    document.getElementById(CART_CONFIG.ELEMENTS.CART_COUNT).textContent = this.count;
    document.getElementById(CART_CONFIG.ELEMENTS.CART_COUNT_MOBILE).textContent = this.count;
    const cartCountBadge = document.getElementById("cart-count-badge");
    if (cartCountBadge) {
      cartCountBadge.textContent = this.count;
    }
    document.getElementById(CART_CONFIG.ELEMENTS.CART_TOTAL).textContent = `${CART_CONFIG.CURRENCY.SYMBOL}${this.total.toFixed(CART_CONFIG.CURRENCY.DECIMALS)}`;
    const cartItems = document.getElementById(CART_CONFIG.ELEMENTS.CART_ITEMS);
    const itemsWithTotals = this.items.map((item) => ({
      ...item,
      total: item.price ? (item.price * item.quantity).toFixed(2) : void 0
    }));
    cartItems.innerHTML = mustache_default.render(this.cartTemplate, { items: itemsWithTotals });
    const proceedToCheckoutBtn = document.getElementById("proceed-to-checkout");
    if (proceedToCheckoutBtn) {
      proceedToCheckoutBtn.disabled = this.items.length === 0;
    }
    this.updateSubmitButtonState();
    localStorage.setItem(CART_CONFIG.STORAGE.CART_ITEMS, JSON.stringify(this.items));
  }
  /**
   * @private
   * @description Loads saved cart items from localStorage
   */
  loadCart() {
    try {
      const saved = localStorage.getItem(CART_CONFIG.STORAGE.CART_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.items = parsed;
          this.updateCart();
        }
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
      this.items = [];
    }
  }
  /**
   * @description Sets up accordion functionality for cart sections
   * @private
   */
  setupAccordions() {
    const cartItemsToggle = document.getElementById("cart-items-toggle");
    const checkoutFormToggle = document.getElementById("checkout-form-toggle");
    const proceedToCheckoutBtn = document.getElementById("proceed-to-checkout");
    if (cartItemsToggle) {
      cartItemsToggle.addEventListener("click", () => {
        this.setActiveAccordion("cart-items");
      });
    }
    if (checkoutFormToggle) {
      checkoutFormToggle.addEventListener("click", () => {
        this.setActiveAccordion("checkout-form");
      });
    }
    if (proceedToCheckoutBtn) {
      proceedToCheckoutBtn.addEventListener("click", () => {
        this.setActiveAccordion("checkout-form");
      });
    }
    const cartItemsAccordion = document.getElementById("cart-items-accordion");
    const checkoutFormAccordion = document.getElementById("checkout-form-accordion");
    if (cartItemsAccordion && checkoutFormAccordion) {
      this.setActiveAccordion("cart-items");
    }
  }
  /**
   * @description Sets the active accordion section
   * @param {string} section - The section to activate ('cart-items' or 'checkout-form')
   * @private
   */
  setActiveAccordion(section) {
    const accordions = document.querySelectorAll("[data-accordion]");
    accordions.forEach((accordion) => {
      const accordionId = accordion.dataset.accordion;
      const content = document.getElementById(`${accordionId}-content`);
      const chevron = document.getElementById(`${accordionId}-chevron`);
      if (accordionId === section) {
        accordion.classList.add("active");
        if (content) content.classList.remove("hidden");
        if (chevron) chevron.classList.add("rotate-180");
      } else {
        accordion.classList.remove("active");
        if (content) content.classList.add("hidden");
        if (chevron) chevron.classList.remove("rotate-180");
      }
    });
  }
  /**
   * @description Submits the order
   * @private
   */
  submitOrder() {
    const submitButton = this.elements.submitButton;
    const submitText = submitButton.querySelector(".checkout-btn-text");
    const submitLoading = submitButton.querySelector(".checkout-btn-loading");
    const successMessage = document.getElementById("cart-success-message");
    submitButton.disabled = true;
    submitText.classList.add("hidden");
    submitLoading.classList.remove("hidden");
    const orderData = {
      items: this.items,
      customer: this.customerInfo,
      total: this.total,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.emailService.sendOrderEmail(orderData).then(() => {
      submitButton.disabled = false;
      submitText.classList.remove("hidden");
      submitLoading.classList.add("hidden");
      if (successMessage) {
        successMessage.classList.remove("hidden");
      }
      this.clearCart();
      const form = this.elements.form;
      if (form) {
        form.reset();
      }
      this.customerInfo = this.createDefaultCustomerInfo();
      setTimeout(() => {
        this.setActiveAccordion("cart-items");
      }, 3e3);
      console.log("Order submitted successfully:", orderData);
    }).catch((error) => {
      submitButton.disabled = false;
      submitText.classList.remove("hidden");
      submitLoading.classList.add("hidden");
      alert("Failed to send order. Please try again or contact us directly.");
      console.error("Order submission failed:", error);
    });
  }
  createDefaultCustomerInfo() {
    return {
      name: "",
      email: "",
      acceptedTos: false,
      address: { street: "", city: "", postal: "", country: "" }
    };
  }
};
function initializeCart() {
  console.log("Initializing shopping cart...");
  window.cart = new ShoppingCart();
}

// src/js/modules/navigation.js
function initializeMobileMenu() {
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
    const mobileNavLinks = mobileMenu.querySelectorAll('a[href^="#"]');
    mobileNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
      });
    });
    document.addEventListener("click", (event) => {
      const isClickInsideNav = mobileMenu.contains(event.target) || mobileMenuButton.contains(event.target);
      if (!isClickInsideNav && !mobileMenu.classList.contains("hidden")) {
        mobileMenu.classList.add("hidden");
      }
    });
  }
}
function initializeActiveNavigation() {
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const sections = document.querySelectorAll("section[id]");
  function updateActiveNav() {
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop - 200) {
        current = section.getAttribute("id");
      }
    });
    navLinks.forEach((link) => {
      link.classList.remove("active");
      const linkHref = link.getAttribute("href");
      if ((linkHref === "#" || linkHref === "#home") && current === "home") {
        link.classList.add("active");
      } else if (linkHref === "#" + current) {
        link.classList.add("active");
      }
    });
  }
  window.addEventListener("scroll", updateActiveNav);
  updateActiveNav();
  navLinks.forEach((link) => {
    link.addEventListener("click", function(e) {
      navLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");
      let targetId = this.getAttribute("href").substring(1);
      if (targetId === "" || targetId === "home") {
        targetId = "home";
      }
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        e.preventDefault();
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        history.pushState(null, null, `#${targetId}`);
      }
    });
  });
}
function initializeNavigation() {
  console.log("Initializing navigation...");
  initializeMobileMenu();
  initializeActiveNavigation();
}

// src/js/modules/app.js
function initializeApp() {
  console.log("App initialized successfully!");
  initializeProducts();
  initializeCart();
  initializeNavigation();
}

// src/js/main.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Hello World from main.js!");
  initializeApp();
});
/*! Bundled license information:

mustache/mustache.mjs:
  (*!
   * mustache.js - Logic-less {{mustache}} templates with JavaScript
   * http://github.com/janl/mustache.js
   *)
*/
