const returnResponse = require('returnResponse');
const getRequestPath = require('getRequestPath');
const templateDataStorage = require('templateDataStorage');
const setResponseStatus = require('setResponseStatus');
const setResponseHeader = require('setResponseHeader');
const setResponseBody = require('setResponseBody');
const sendHttpGet = require('sendHttpGet');
const makeTableMap = require('makeTableMap');
const sha256Sync = require('sha256Sync');
const makeInteger = require('makeInteger');

const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;

const path = getRequestPath();
const cacheKey = sha256Sync(data.url);

if (path === data.path) {
    require('claimRequest')();
    runClient();
}

function runClient()
{
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

function getFileAndReturnResponse()
{
    let requestSettings = {};

    if (data.requestHeaders) {
        requestSettings.headers = makeTableMap(data.requestHeaders, 'name', 'value');
    }

    if (data.requestTimeout) {
        requestSettings.timeout = data.requestTimeout;
    }

    sendHttpGet(data.url, (statusCode, originHeaders, file) => {
        if (data.responseStatusCode) {
            templateDataStorage.setItemCopy('proxy_' + cacheKey, file);
            templateDataStorage.setItemCopy('proxy_headers_' + cacheKey, originHeaders);

            sendResponse(makeInteger(data.responseStatusCode), originHeaders, file);
        } else {
            if (statusCode >= 200 && statusCode < 300) {
                templateDataStorage.setItemCopy('proxy_' + cacheKey, file);
                templateDataStorage.setItemCopy('proxy_headers_' + cacheKey, originHeaders);

                sendResponse(statusCode, originHeaders, file);
            } else {
                if (isDebug) {
                    logToConsole('Failed to download a file: ', path);
                }

                sendResponse(statusCode, originHeaders, file);
            }
        }
    }, requestSettings);
}


function sendResponse(statusCode, originHeaders, file)
{
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
    setResponseBody(file);
    returnResponse();
}
