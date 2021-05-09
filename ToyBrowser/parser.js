// const { match } = require("node:assert")

const EOF = Symbol('EOF')

let currentToken = null
let currentAttribute = null
let stack = [{type: 'document',children:[]}]

function emit(token) {
    if (token.type == 'text') {
        return;
    }

    let top = stack[stack.length - 1]

    // 遇到startTag,先入栈，继而读取其子的element
    // 自封闭标签没有子element，顾不需要入栈，直接构建入dom树即可
    if (token.type == 'startTag') {
        // 新建element
        let element  = {
            type: 'element',
            children: [],
            attributes: []
        }

        element.tagName = token.tagName

        // deal attributes
        element.attributes = token.attributes

        // element has been dealed, so we push it to it's father's chidlren, 
        // create their relationship
        top.children.push(element)
        // element.parent = top

        // if the element is not self closing, we push it to stack and find it's 
        // sub elements next. 
        if (!token.isSelfClosing) {
            stack.push(element)
        }
    } else if (token.type == 'endTag') { // endTag
        if (token.tagName != top.tagName) {
            throw new Error(`Tag ${token.tagName} start and end does not match!`)
        }else {
            // find true end, means the current element is closing, pop it and deal
            // next element
            stack.pop()
        }
    }

    if (token.type == 'EOF') {
        console.log(JSON.stringify(stack[0]))
    }
}


function error(c) {
    return data
}

function data(c) {
    if (c === '<') {
        return startTagBegin
    }else if (c === EOF) {
        emit({
            type: 'EOF'
        })
        return error(c)
    }else{
        emit({
            type: 'text',
            content: c
        })
        return data
    }
}

function startTagBegin(c) {
    if (c === '/') {
        return endTagBegin
    }else if (c.match(/^[a-zA-z]$/)) {
        currentToken = {
            type: 'startTag',
            tagName: '',
            attributes: {}
        }
        return tagName(c)
    }else {
        return error(c)
    }
}

function endTagBegin(c) {
    if (c.match(/^[a-zA-z]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: ''
        }
        return tagName(c)
    }else {
        return error(c)
    }
}

function tagName(c) {
    if (c.match(/^[a-zA-z]$/)) {
        currentToken.tagName += c
        return tagName
    }else if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    }else if (c === '/') {
        return selfCloseTagWaitEnd
    }else if (c === '>') {
        emit(currentToken)
        return data
    }else {
        return error(c)
    }
}

function selfCloseTagWaitEnd(c) {
    if (c === '>') {
        currentToken.isSelfClosing = true
        emit(currentToken)
        return data
    }else {
        return error(c)
    }
}

function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c == '>' || c == '/') {
        return afterAttributeName(c)
    } else if (c == EOF) {
        return error(c)
    } else if (c == '=') { 
        return error(c)
    } else { // 正儿八经读取属性名
        currentAttribute = {
            name: '',
            value: ''
        }
        return attributeName(c)
    }
}

function attributeName(c) {
    if(c.match(/^[\t\n\f ]$/) || c == '/' || c == '>') { // 有些属性是不必给值的如visiable
        return afterAttributeName(c)
    }else if (c == '=') {//读变量名结束，开始读值
        return beforeAttributeValue
    }else if (c == EOF || c == '\"' || c == '\'' || c == "<") { // 各异常情况

    }else {
        currentAttribute.name += c
        return attributeName
    }
}

function afterAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return afterAttributeName
    } else if (c == '/') { // 自封，直接是bool值为true
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
        return selfCloseTagWaitEnd
    } else if (c == '>') {
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    } else if (c == '=') {
        return beforeAttributeValue
    } else  { // 没结束，也不需要读值，那就是开始读下一个属性了
        return beforeAttributeName(c)
    }
}

function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeValue
    } else if (c == '/' || c == '>' || c == EOF || c == '<') { // 一系列异常符号，没有列全
        return error(c)
    } else if (c == '\'') { // 单引号开头的值
        return singleQuotedAttributeValue
    } else if (c == '\"') { // 双引号开头的值
        return doubleQuotedAttributeValue
    } else { // 无引号开头的值，值类型的东西,需要reconsume
        return unquotedAttributeValue(c)
    }
}

function doubleQuotedAttributeValue(c) {
    if (c == '\"') { // 遇到双引号镖师结束
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
        return afterAttributeValue
    }else if (c == EOF) { // 异常字符，没有列全
        error(c)
    }else {
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function singleQuotedAttributeValue(c) {
    if (c == '\'') { // 遇到单引号表师结束
        currentoken.attributes[currentAttribute.name] = currentAttribute.value
        return afterAttributeValue
    }else if (c == EOF) { // 异常字符，没有列全
        error(c)
    }else {
        currentAttribute.value += c
        return singleQuotedAttributeValue
    }
}

function unquotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {// 以空格表示当前值结束 开始尝试读取下一个属性，
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
        return beforeAttributeName
    }else if (c == '>') { // 当前tag直接完事了,直接处理token
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    }else if (c == '/') { //自封闭标签，准备完事
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
        return selfCloseTagWaitEnd
    } else if (c == EOF) {// 惯例异常
        error(c)
    } else {
        currentAttribute.value += c
        return unquotedAttributeValue
    }
}

function afterAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) { // 尝试读下一个属性
        return beforeAttributeName
    }else if (c == '>') { // 当前tag直接完事了,直接处理token
        emit(currentToken)
        return data
    }else if (c == '/') { //自封闭标签，准备完事
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
        return selfCloseTagWaitEnd
    }else {
        error(c)
    }
}


module.exports.html = function html(html) {
    let state = data;

    for (const c of html) {
        state = state(c)
    }
    state = state(EOF)
}