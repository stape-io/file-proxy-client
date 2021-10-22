const returnResponse = require('returnResponse');
const getRequestPath = require('getRequestPath');
const templateDataStorage = require('templateDataStorage');
const setResponseStatus = require('setResponseStatus');
const setResponseHeader = require('setResponseHeader');
const setResponseBody = require('setResponseBody');
const sendHttpGet = require('sendHttpGet');
const makeTableMap = require('makeTableMap');

const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;

const path = getRequestPath();

if (path === data.path) {
    require('claimRequest')();
    runClient();
}

function runClient()
{
    if (data.useCache) {
        const cachedFile = templateDataStorage.getItemCopy('proxy_' + path);

        if (!cachedFile) {
            getFileAndReturnResponse();
        } else {
            const cachedHeaders = templateDataStorage.getItemCopy('proxy_headers_' + path) || {};

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
        if (statusCode >= 200 && statusCode < 300) {
            templateDataStorage.setItemCopy('proxy_' + path, file);
            templateDataStorage.setItemCopy('proxy_headers_' + path, file);

            sendResponse(200, originHeaders, file);
        } else {
            if (isDebug) {
                logToConsole('Failed to download a file', file);
            }

            sendResponse(statusCode, originHeaders, file);
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

    logToConsole('file', file);
    logToConsole('statusCode', statusCode);
    setResponseStatus(statusCode);
    setResponseBody(file);
    returnResponse();
}
