const images = require('images')

module.exports.render = function render (viewport, element) {
    if (element.style) {
        const img = images(element.style.width, element.style.height)

        if (element.style.background) {
            const color = element.style.background
            color.match(/rgb\((\d+),(\d+),(\d+)\)/)
            img.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3), 1)
            viewport.draw(img, element.style.left || 0, element.style.top || 0)
        }
    }

    if (element.children) {
        for (const child of element.children) {
            render(viewport, child)
        }
    }
}