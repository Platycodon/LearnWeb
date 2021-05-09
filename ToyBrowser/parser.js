const css = require('css')
const layout = require('./layout')

const EOF = Symbol('EOF')

let currentToken = null
let currentAttribute = null
let currentTextNode = null
let currentRules = []
let stack = [{type: 'document',children:[]}]

function addCSSRules (text) {
    const ast = css.parse(text)
    currentRules.push(...ast.stylesheet.rules)
}

function specificity(selector) {
    const p = [0, 0, 0, 0]
    const selectorPaths = selector.split(' ')
    for (const path of selectorPaths) {
        if (path.charAt(0) == '#') {
            p[1] += 1
        }else if (path.charAt(0) == '.') {
            p[2] += 1
        }else {
            p[3] += 1
        }
    }
    return p
}

function compareSpecificity(s1, s2) {
    if (s1[0] - s2[0]) {
        return s1[0] - s2[0]
    }
    if (s1[1] - s2[1]) {
        return s1[1] - s2[1]
    }
    if (s1[2] - s2[2]) {
        return s1[2] - s2[2]
    }
    return s1[3] - s2[3]
}

function computeCSS (element) {
    // we must find element's all fathers that we can determine it's css rule
    const elements = stack.slice().reverse()

    if (!element.computedStyle) {
        element.computedStyle = {}
    }

    for (const rule of currentRules) {
        // find if current element's rule
        var selectorPaths = rule.selectors[0].split(' ').reverse()
        if (!CSSMatch(element, selectorPaths[0])) {
            continue
        }

        let matched = false

        // find if it's parent element matches
        let j = 1
        for (let i = 0; i < elements.length; i++) {
            if (CSSMatch(elements[i], selectorPaths[j])) {
                j++
            }else {
                break
            }
        }
        // all parents matches
        if (j >= selectorPaths.length) {
            matched = true
        }

        if (matched) {
            const sp = specificity(rule.selectors[0])
            const computedStyle = element.computedStyle
            for (const declaration of rule.declarations) {
                if (!computedStyle[declaration.property]) {
                    computedStyle[declaration.property] = {}
                }
                if (!computedStyle[declaration.property].specificity || 
                    compareSpecificity(computedStyle[declaration.property].specificity, sp) < 0) {
                        computedStyle[declaration.property].value = declaration.value
                        computedStyle[declaration.property].specificity = sp
                }
            }
        }
    }
}

function CSSMatch (element, selector) {
    // if element is a text node, jump it
    if (!selector || !element.attributes) {
        return false
    }

    if (selector.charAt(0) == '#') {
        // id selector
        const attr = element.attributes.filter(attr => attr.name == 'id')[0]
        if (attr && attr.value == selector.replace('#', '')) {
            // find
            return true
        }
    }else if (selector.charAt(0) == '.') {
        // class selector
        const attr = element.attributes.filter(attr => attr.name == 'class')[0]
        if (attr && attr.value == selector.replace('.', '')) {
            // find
            return true
        }
    }else {
        // tag name selector
        if (element.tagName === selector) {
            return true
        }
    }
    // not find
    return false
}

function emit(token) {

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
        for (const key in token.attributes) {
            element.attributes.push({
                name: key,
                value: token.attributes[key]
            })
        }

        // usually, we computed element's css when element is created
        computeCSS(element)

        // element has been dealed, so we push it to it's father's chidlren, 
        // create their relationship
        top.children.push(element)
        element.parent = top

        // if the element is not self closing, we push it to stack and find it's 
        // sub elements next. 
        if (!token.isSelfClosing) {
            stack.push(element)
        }

        currentTextNode = null
    } else if (token.type == 'endTag') { // endTag
        if (token.tagName != top.tagName) {
            throw new Error(`Tag ${token.tagName} start and end does not match!`)
        }else {
            // find end, means the current element is closing, pop it and deal
            // next element
            // in aditional, if the tag is a style tag, we should compute it's css
            if (token.tagName == 'style') {
                addCSSRules(top.children[0].content)
            }
            layout(top)
            stack.pop()
        }
        currentTextNode = null
    }else if (token.type == 'text') { // text
        if (currentTextNode == null) {
            currentTextNode = {
                type: 'text',
                content: ''
            }
            top.children.push(currentTextNode)
        }
        currentTextNode.content += token.content
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
        currentToken.attributes[currentAttribute.name] = currentAttribute.value
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