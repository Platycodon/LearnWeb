function contain(string, char) {
    for (const c of string) {
        if (c == char) {
            return true
        }
    }
    return false
}

let con = contain('today','a')
console.log(con)


// function contains(string, chars) {
//     if (!chars || chars.length == 0) return false
    
//     for (let i = 0; i < string.length; i++) {
//         if (string[i] == chars[0]) {
//             for (let j = 1; j < chars.length; j++) {
//                 if (string[i + j] && string[i + j] == chars[j]) {
//                     if (j == chars.length - 1) return true
//                     continue
//                 }else break
//             }
//         }
//     }
//     return false
// }
// con = contains('todayabcc','ab')

// console.log(con)


// find abababx

function contains(string) {

    let state = start

    for (const c of string) {
        state = state(c)
    }
    return state === end

    function start(c) {
        if (c === 'a') {
            return foundA
        }else {
            return start
        }
    }

    function end(c) {
        return end
    }

    function foundA(c) {
        if (c === 'b') {
            return foundB
        }else {
            return start(c)
        }
    }

    function foundB(c) {
        if (c === 'a') {
            return foundA2
        }else {
            return start(c)
        }
    }

    function foundA2(c) {
        if (c === 'b') {
            return foundB2
        }else {
            return start(c)
        }
    }

    function foundB2(c) {
        if (c === 'a') {
            return foundA3
        }else {
            return foundB(c)
        }
    }

    function foundA3(c) {
        if (c === 'b') {
            return foundB3
        }else {
            return start(c)
        }
    }

    function foundB3(c) {
        if (c === 'x') {
            return foundX(c)
        }else if (c === 'a'){
            return foundA3
        }else {
            return start(c)
        }
    }

    function foundX(c) {
        return end
    }
}

con = contains('abababababxcc')

console.log(con)