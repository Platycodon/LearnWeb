

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
    if (elementStyle.display != 'flex' && !elementStyle.flex) {
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
    let a = ['width', 'height']
    a.forEach(e => {
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
    } else if (style.flexDirection == 'row-reverse') {
        mainSize = 'width'
        mainStart = 'right'
        mainEnd = 'left'
        mainSign = -1
        mainBase = style.width

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    } else if (style.flexDirection == 'column') {
        mainSize = 'height'
        mainStart = 'top'
        mainEnd = 'bottom'
        mainSign = +1
        mainBase = 0

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    } else if (style.flexDirection == 'column-reverse') {
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
        crossStart = tmp
        crossSign = -1
    } else {
        crossBase = 0
        crossSign = +1
    }

    // create lines with items

    // if element is a auto size element, figure out it's main size
    let isAutoMainSize = false
    if (!style[mainSize]) {
        style[mainSize] = 0
        for (const item of items) {
            const itemStyle = getStyle(item)
            if (itemStyle[mainSize]) {
                style[mainSize] += itemStyle[mainSize]
            }
        }
        isAutoMainSize = true
    }

    // deal all 
    let flexLine = []
    let flexLines = [flexLine]

    let mainSpace = style[mainSize]
    let crossSpace = 0

    for (const item of items) {
        const itemStyle = getStyle(item)

        if (!itemStyle[mainSize]) {
            itemStyle[mainSize] = 0
        }

        if (itemStyle.flex) {
            // flex item 
            flexLine.push(item)
        } else if (style.flexWrap == 'nowrap' && isAutoMainSize) {
            // auto size element will never be full
            mainSpace -= itemStyle[mainSize]
            if (itemStyle[crossSize]) {
                crossSpace = crossSpace > itemStyle[crossSize] ? crossSpace : itemStyle[crossSize]
            }
            flexLine.push(item)
        } else {
            if (itemStyle[mainSize] > style[mainSize]) {
                itemStyle[mainSize] = style[mainSize]
            }
            if (mainSpace < itemStyle[mainSize]) {
                // not enough
                // save current line
                flexLine.mainSpace = mainSpace
                flexLine.crossSpace = crossSpace

                // create a new line
                flexLine = [item]
                flexLines.push(flexLine)

                flexLine.mainSpace = style[mainSize] - itemStyle[mainSize]
                crossSpace = itemStyle[crossSpace]

            } else {
                // enough
                flexLine.push(item)
            }
            if (itemStyle[crossSize]) {
                crossSpace = crossSpace > itemStyle[crossSize] ? crossSpace : itemStyle[crossSize]
            }
            mainSpace -= itemStyle[mainSize]
        }
    }
    flexLine.mainSpace = mainSpace

    if (style.flexWrap == 'nowrap' || isAutoMainSize) {
        // single line
        flexLine.crossSpace = style[crossSize] ? style[crossSize] : crossSpace
    } else {
        // multi lines
        flexLine.crossSpace = crossSpace
    }

    if (mainSpace < 0) {
        // set every flex to 0, scale other, only happens with single line
        const scale = style[mainSize] / (style[mainSize] - mainSpace)
        let currentMain = mainBase
        for (const item of items) {
            const itemStyle = getStyle(item)

            if (item.flex) {
                itemStyle[mainSize] = 0
            } else {
                itemStyle[mainSize] *= scale
            }

            itemStyle[mainStart] = currentMain
            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
            currentMain = itemStyle[mainEnd]
        }
    } else {
        // figure flex width
        for (const flexLine of flexLines) {
            const mainSpace = flexLine.mainSpace
            let totalFlex = 0

            for (let i = 0; i < flexLine.length; i++) {
                const item = flexLine[i];
                if (item && item.flex) {
                    const itemStyle = getStyle(item)
                    totalFlex += itemStyle.flex
                }
                continue
            }

            if (totalFlex > 0) {
                let currentMain = mainBase
                for (let i = 0; i < flexLine.length; i++) {
                    const item = flexLine[i];
                    const itemStyle = getStyle(item)

                    if (itemStyle.flex) {
                        itemStyle[mainSize] = mainSpace * itemStyle.flex / totalFlex
                    }

                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
                    currentMain = itemStyle[mainEnd]
                }
            } else {
                // no flex
                let currentMain = 0
                let step = 0 // gap 
                if (style.justifyContent == 'flex-start') {
                    currentMain = mainBase
                } else if (style.justifyContent == 'flex-end') {
                    currentMain = mainBase + mainSign * mainSpace
                } else if (style.justifyContent == 'flex-end') {
                    currentMain = mainBase + mainSign * mainSpace
                } else if (style.justifyContent == 'center') {
                    currentMain = mainBase + mainSign * mainSpace / 2
                } else if (style.justifyContent == 'space-between') {
                    currentMain = mainBase
                    step = mainSpace / (flexLine.length - 1) * mainSign
                } else if (style.justifyContent == 'space-arount') {
                    step = mainSpace / (flexLine.length) * mainSign
                    currentMain = step / 2 + mainBase
                }
                for (let i = 0; i < flexLine.length; i++) {
                    const item = flexLine[i];
                    const itemStyle = getStyle(item)
                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
                    currentMain = itemStyle[mainEnd]
                }
            }
        }
    }

    crossSpace = 0

    if (!style[crossSize]) { // flex
        crossSpace = 0
        elementStyle[crossSize] = 0
        for (let i = 0; i < flexLines.length; i++) {
            elementStyle[crossSize] = elementStyle[crossSize] + flexLines[i].crossSpace
        }
    }else {
        crossSpace = style[crossSize]
        // space that lefts
        for (let i = 0; i < flexLines.length; i++) {
            crossSpace -= flexLines[i].crossSpace
        }
    }

    // like main direction
    if (style.flexWrap == 'wrap-reverse') {
        crossBase = style[crossSize]
    } else {
        crossBase = 0
    }

    let lineSize = style[crossSize] / flexLines.length

    let step = 0
    if (style.alignContent == 'flex-start') {
        crossBase += 0
    } else if (style.alignContent == 'flex-end') {
        crossBase += crossSign * crossSpace
    } else if (style.alignContent == 'center') {
        crossBase += crossSign * crossSpace / 2
    } else if (style.alignContent == 'space-between') {
        crossBase += 0
        step = crossSpace / (flexLines.length - 1)
    } else if (style.alignContent == 'space-around') {
        step = crossSpace / (flexLines.length)
        crossBase += crossSign * step / 2 
    } else if (style.alignContent == 'stretch') {
        crossBase = 0
    }

    for (const flexLine of flexLines) {
        const lineCrossSize = style.alignContent == 'stretch' ? 
        flexLine.crossSpace + crossSpace / flexLines.length : 
        flexLine.crossSpace

        for (const item of flexLine) {
            const itemStyle = getStyle(item)

            const align = itemStyle.alignSelf || style.alignItems

            if (!itemStyle[crossSize]) {
                itemStyle[crossSize] = (align == 'stretch') ? lineCrossSize : 0
            }

            if (align == 'flex-start') {
                itemStyle[crossStart] = crossBase
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * crossSign[crossSize]
            } else if (align == 'flex-end') {
                itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize
                itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize]
            } else if (align == 'center') {
                itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
            } else if (align == 'stretch') {
                itemStyle[crossStart] = crossBase
                itemStyle[crossEnd] = crossBase + crossSign * (itemStyle[crossSize]) ? itemStyle[crossSize] : lineCrossSize
                itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart])
            }
        }
        crossBase += crossSign * (lineCrossSize + step)
    }
}

module.exports = layout