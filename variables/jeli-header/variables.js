  /** Variables Holders ***/

    /*
      @license jElijs
      Author : Gojecks Joseph
      License : GNU-2
      Version 0.10.0
     */

  'use strict';
  var 
  $template = {},
  $factory = {},
  $service = {},
  $controllers = {},
  module = {$get: function(name){ return this[name] || errorBuilder('Module '+name+' was not found'); }},
  injectors = {},
  $watchBlockList = new watchBinding(),
  $unWatchList = [],
  COMMENT_NODE = 8,
  TEXT_NODE = 3,
  $defaultDirectiveProvider = ['j-controller','j-init','j-if','j-href','j-src','j-include','j-for','j-do','j-hide','j-show','j-class','j-style','j-disabled','j-model','j-value','j-html','j-checked','j-selected'],
  $directivesProvider = {},
  $directivesProviderWatchList = new watchBinding(),
  $modelObserverList = new watchBinding(),
  $modelChildReferenceList = new watchBinding(),
  $publicProviders = {},
  $jValueProvider = {},
  $attrWatchList = new watchBinding(),
  $isCompiled = false,
  $isDomLoaded = false,
  $isBooleanValue ='true | false | 1 | 0',
  $provider = {$isExternalLoader : {status:false},jDebugProvider:{ $disableDebugMode : false },$restrictDebugMode:['',['$jProvideProvider','$jElementProvider','$jServiceProvider','$httpProvider','$jValueProvider'],['$jElementProvider','$jControllerProvider','$jFactoryProvider','$jFilterProvider']]},
  $isAfterBootStrap = false,
  $directiveWatchList = {},
  $rootModel = null,
  $modelMapping = new watchBinding(),
  tplRegEx = new RegExp(/\{\%(.*?)\%\}/g),
  $eUID = 0,
  $localStorage = window.localStorage,
  $sessionStorage = window.sessionStorage,
  $filtersProvider = {},
  OBJ_REF = '$object:ref',
  $templateWatcher = [],
  eliBindedClass = 'j-binded',
  $data = {},
  EDS = {},
  EUID = 0,
  $queryDB = {},
  $0 = null,
  $$0 = null,
  onReadyBound = false,
  isReady = false,
  DOMContentLoaded,
  readyCallbacks = [],
  cache = [],
  events = {},
  $jModelWatchBlock = {},
  $compileTracker = {lastCompiledWith : null,compiledModule : null,injectors:new watchBinding()},
  $isSupport =
  {
    websql: !!window.openDatabase,
    sqlite : !!window.sqlitePlugin,
    canvas: !!document.createElement('canvas').getContext,
    history: !!(window.history && history.pushState),
    jsonParser: !!(window.JSON && window.JSON.parse),
    domParser: !!(window.DOMParser),
    computedStyle : !!(window.getComputedStyle),
    indexedDB : window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || false,
    localStorage : !!window.localStorage || !1,
    slice : window.Blob && (Blob.prototype.slice ||Blob.prototype.webkitSlice || Blob.prototype.mozSlice),
    isFormData : window.FormData,
    xhrFileUpload : !!(window.XMLHttpRequestUpload && window.FileReader),
    fileReader : (window.File&&window.FileReader&&window.FileList&&window.Blob),
    webWorker:!!window.Worker,
    dom:
    {
      cloning: (function () 
      {
        var div = document.createElement('div'),
            _clone = div.cloneNode();
        div = null;
        return !!_clone;
      })(),
      qsa: !!document.querySelectorAll
    },
    css3: function (prop)
    {
        var cs = 'Khtml Moz O Ms Webkit'.split(' '),
        cst = document.createElement('div').style,
        len = cs.length,
        sty = function (key) {
        return '-' + cs[key] + '-' + prop;
        };
        if (prop in cst){
           return prop;
        }
        while (len--)
        {
          chk = cs[len] + prop.charAt(0).toUpperCase() + cs[len].slice(1);
          if (chk in cst)
          {
            return sty(len);
          }
        }
        return false;
    },
    browser :  
    {
        moz : 'MozAppearance' in document.createElement('div').style,
        webkit : 'WebkitAppearance' in document.createElement('div').style,
        msie : 'msTransform' in document.createElement('div').style,
        opera : 'OAppearance' in document.createElement('div').style
    },
    env : 
    {
      android: ((navigator.userAgent.match(/Android/i) || []).length?true:false),
      blackBerry: ((navigator.userAgent.match(/BlackBerry/i) || []).length?true:false),
      ios: ((navigator.userAgent.match(/iPhone|iPad|iPod/i) || []).length?true:false),
      opera: ((navigator.userAgent.match(/Opera Mini/i) || []).length?true:false),
      windows:((navigator.userAgent.match(/IEMobile/i)  || []).length?true:false),
      chrome : ((navigator.userAgent.match(/chrome/i)  || []).length?true:false),
      firefox : ((navigator.userAgent.match(/firefox/i)  || []).length?true:false),
      safari : ((navigator.userAgent.match(/safari/i)  || []).length?true:false),
      ie:/Edge\/|Trident\/|MSIE /.test(navigator.userAgent),
      ieg10:/Edge\/|Trident\/| /.test(navigator.userAgent)
    },
    cookieEnabled : navigator.cookieEnabled
  },
  $eliFilters = 'json|date|uppercase|lowercase|capitalize|number|'.split('|'),
  unsafeHeaders = {
      'Accept-Charset': true,
      'Accept-Encoding': true,
      'Connection': true,
      'Content-Length': true,
      'Cookie': true,
      'Cookie2': true,
      'Content-Transfer-Encoding': true,
      'Date': true,
      'Expect': true,
      'Host': true,
      'Keep-Alive': true,
      'Referer': true,
      'TE': true,
      'Trailer': true,
      'Transfer-Encoding': true,
      'Upgrade': true,
      'User-Agent': true,
      'Via': true
    };
  $isSupport.env.mobile = (function(env)
  { 
  	return (env.android || env.blackBerry || env.ios || env.opera || env.windows  || false); 
  })($isSupport.env);

  var noop = {
    get : function(){
      return {}
    },
    set : function(name,value){
      this[name] = value;
    }
  };

  //@Function trim
  var trim = ''.trim ? function (s) { return s.trim(); }  : function (s) {
      return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
