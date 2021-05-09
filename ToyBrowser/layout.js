

function getStyle(element) {
    if (!element.style) {
        element.style = {}
    }
    // deal some attributes
    for (const prop in element.computedStyle) {
        let cValue = null
        if (Object.hasOwnProperty.call(element.computedStyle, prop)) {
            const s = element.computedStyle[prop];
            element.style[prop] = s.value
            cValue = s.value
        }
        // transform px to int 
        if (cValue.toString().match(/px$/)) {
            element.style[prop] = parseInt(cValue)
        }
        // transform float to int
        if (cValue.toString().match(/^[0-9\.]+$/)) {
            element.style[prop] = parseInt(cValue)
        }
    }
    return element.style
}

function layout(element) {
    if (!element.computedStyle) {
        return
    }

    let elementStyle = getStyle(element)

    // we just realize flex layout
    if (elementStyle.display != 'flex') {
        return
    }

    // jump text node, just layout element node
    const items = element.children.filter(e => e.type == 'element')

    // if element has order, order it
    items.sort((a, b) => (
        (a.order || 0) - (b.order || 0)
    ))

    const style = elementStyle

    // deal default values
    ['width', 'height'].forEach(e => {
        if (style[e] == 'auto' || style[e] === '') {
            style[e] = null
        }
    })

    if (!style.flexDirection || style.flexDirection == 'auto') {
        style.flexDirection = 'row'
    }
    if (!style.alignItems || style.alignItems == 'auto') {
        style.alignItems = 'stretch'
    }
    if (!style.justifyContent || style.justifyContent == 'auto') {
        style.justifyContent = 'flex-start'
    }
    if (!style.flexWrap || style.flexWrap == 'atuo') {
        style.flexWrap = 'nowrap'
    }
    if (!style.alignContent || style.alignContent == 'auto') {
        style.alignContent = 'stretch'
    }

    let mainSize, mainStart, mainEnd, mainSign, mainBase,
        crossSize, crossStart, crossEnd, crossSign, crossBase
    if (style.flexDirection == 'row') {
        mainSize = 'width'
        mainStart = 'left'
        mainEnd = 'right'
        mainSign = +1
        mainBase = 0

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }else if (style.flexDirection == 'row-reverse') {
        mainSize = 'width'
        mainStart = 'right'
        mainEnd = 'left'
        mainSign = -1
        mainBase = style.width

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }else if (style.flexDirection == 'column') {
        mainSize = 'height'
        mainStart = 'top'
        mainEnd = 'bottom'
        mainSign = +1
        mainBase = 0

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }else if (style.flexDirection == 'column-reverse') {
        mainSize = 'height'
        mainStart = 'bottom'
        mainEnd = 'top'
        mainSign = -1
        mainBase = style.height

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }

    if (style.flexWrap == 'wrap-reverse') {
        let tmp = crossEnd
        crossEnd = crossStart
        crossStart = crossEnd
        crossSign = -1
    }else {
        crossBase = 0
        crossSign = +1
    }
}

module.exports = layout