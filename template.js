const getContainerVersion = require('getContainerVersion');
const getRequestPath = require('getRequestPath');
const logToConsole = require('logToConsole');
const makeInteger = require('makeInteger');
const makeString = require('makeString');
const makeTableMap = require('makeTableMap');
const returnResponse = require('returnResponse');
const sendHttpGet = require('sendHttpGet');
const setResponseBody = require('setResponseBody');
const setResponseHeader = require('setResponseHeader');
const setResponseStatus = require('setResponseStatus');
const sha256Sync = require('sha256Sync');
const templateDataStorage = require('templateDataStorage');

/*==============================================================================
==============================================================================*/

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;

const path = getRequestPath();
const cacheKey = sha256Sync(data.url);

if (path === data.path) {
  require('claimRequest')();
  runClient();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function runClient() {
  if (data.useCache) {
    const cachedFile = templateDataStorage.getItemCopy('proxy_' + cacheKey);

    if (!cachedFile) {
      getFileAndReturnResponse();
    } else {
      const cachedHeaders = templateDataStorage.getItemCopy('proxy_headers_' + cacheKey) || {};

      sendResponse(200, cachedHeaders, cachedFile);
    }
  } else {
    getFileAndReturnResponse();
  }
}

function getFileAndReturnResponse() {
  let requestSettings = {};

  if (data.requestHeaders) {
    requestSettings.headers = makeTableMap(data.requestHeaders, 'name', 'value');
  }

  if (data.requestTimeout) {
    requestSettings.timeout = data.requestTimeout;
  }

  sendHttpGet(
    data.url,
    (statusCode, originHeaders, file) => {
      const excludedHeaders = ['transfer-encoding'];

      const filteredOriginHeaders = {};
      for (const key in originHeaders) {
        if (excludedHeaders.indexOf(key.toLowerCase()) === -1) {
          filteredOriginHeaders[key] = originHeaders[key];
        } else {
          if (isDebug) {
            logToConsole('filtered Header', key, originHeaders[key]);
          }
        }
      }

      if (data.responseStatusCode && isValidStatusCode(data.responseStatusCode)) {
        if (data.useCache) {
          templateDataStorage.setItemCopy('proxy_' + cacheKey, file);
          templateDataStorage.setItemCopy('proxy_headers_' + cacheKey, filteredOriginHeaders);
        }
        sendResponse(makeInteger(data.responseStatusCode), filteredOriginHeaders, file);
      } else {
        if (statusCode >= 200 && statusCode < 300) {
          if (data.useCache) {
            templateDataStorage.setItemCopy('proxy_' + cacheKey, file);
            templateDataStorage.setItemCopy('proxy_headers_' + cacheKey, filteredOriginHeaders);
          }

          sendResponse(statusCode, filteredOriginHeaders, file);
        } else {
          if (isDebug) {
            logToConsole('Failed to download a file: ', path);
          }

          sendResponse(statusCode, filteredOriginHeaders, file);
        }
      }
    },
    requestSettings
  );
}

function sendResponse(statusCode, originHeaders, file) {
  if (!isValidStatusCode(statusCode)) {
    statusCode = 500;
  }

  if (statusCode === 200) {
    if (data.useOriginHeaders && originHeaders) {
      for (let headerKey in originHeaders) {
        setResponseHeader(headerKey, originHeaders[headerKey]);
      }
    }

    if (data.responseHeaders) {
      let responseHeaders = makeTableMap(data.responseHeaders, 'name', 'value');

      for (let headerKey in responseHeaders) {
        setResponseHeader(headerKey, responseHeaders[headerKey]);
      }
    }

    if (data.contentType) {
      setResponseHeader('content-type', data.contentType);
    }
  }

  setResponseStatus(statusCode);
  if (file) setResponseBody(file);
  returnResponse();
}

/*==============================================================================
  Helpers
==============================================================================*/

function isValidStatusCode(statusCode) {
  const validStatusCodesRegex = '^[1-5]\\d{2}$';
  return makeString(statusCode).match(validStatusCodesRegex) !== null;
}
