const { match } = require("node:assert")

const EOF = Symbol('EOF')

function error(c) {

}

function data(c) {
    if (c === '<') {
        return startTagBegin
    }else if (c === EOF) {
        return error(c)
    }else{
        return data
    }
}

function startTagBegin(c) {
    if (c === '/') {
        return endTagBegin
    }else if (c.match(/^[a-zA-z]$/)) {
        return tagName(c)
    }else {
        return error(c)
    }
}

function tagName(c) {
    if (c.match(/^[a-zA-z]$/)) {
        return tagName
    }else if (c.match(/^[\t\n\f ]$/)) {
        return tagAttributeGap
    }else if (c === '/') {
        return selfCloseTagWaitEnd
    }else if (c === '>') {
        return tagEnd(c)
    }else {
        return error(c)
    }
}

function tagEnd(c) {

}

function selfCloseTagWaitEnd(c) {
    if (c === '>') {
        return data
    }else {
        return error(c)
    }
}

function tagAttributeGap(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return tagAttributeGap
    }
}


module.exports.html = function html(html) {
    let state = data;

    for (const c of html) {
        state = state(c)
    }
    state = state(EOF)
}