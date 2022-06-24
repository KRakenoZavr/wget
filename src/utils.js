const fs = require("fs")
const path = require("path")
const {PATH, CONFIG} = require("./config")

const deepEqual = (obj1, obj2) => {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false
    for (const key of Object.keys(obj1)) {
        if (Object.prototype.toString.call(obj1[key]) === "[object Object]") {
            return deepEqual(obj1[key], obj2[key])
        } else if (obj1[key] !== obj2[key]) {
            return false
        }
    }
    return true
}

const checkFlags = (args) => {
    const baseUrls = ["http", "https", "ftp"]
    const defaultFlags = []
    // TODO
    // make recursive search
    for (const item in CONFIG) {
        defaultFlags.push(CONFIG[item]["key"])
        if (CONFIG[item]["children"]) {
            for (const item2 in CONFIG[item]["children"]) {
                defaultFlags.push(CONFIG[item]["children"][item2]["key"])
            }
        }
    }

    for (const arg of args) {
        if (!defaultFlags.some(flag => arg.includes(flag)) &&
            !baseUrls.some(url => arg.includes(url))) {
            return false
        }
    }
    return true
}

const getFlags = (args) => {
    if (!checkFlags(args)) {
        console.log("Invalid flag")
        console.log("Try 'see README.md' for more options")
        process.exit(0)
    }

    const flags = {}

    for (const arg of args) {
        for (const flag in CONFIG) {
            // TODO
            // make recursive search
            if (CONFIG[flag]["children"]) {
                for (const childFlag in CONFIG[flag]["children"]) {
                    if (arg.includes(CONFIG[flag]["children"][childFlag]["key"])) {
                        const [, v] = arg.split("=")
                        flags[childFlag] = v
                    }
                }
            }
            if (arg.includes(CONFIG[flag]["key"])) {

                const [, v] = arg.split("=")

                // if no value means its flag -B or --mirror
                flags[flag] = v || true
            }
        }
    }

    return flags
}

const getUrl = (args) => args[args.length - 1]

const getArgs = () => {
    const args = process.argv.slice(2)

    return {
        flags: getFlags(args),
        url: getUrl(args),
    }
}

const getLastNum = (filename) => {
    const splitted = filename.split(".")
    const lastEl = parseInt(splitted.splice(-1)[0])

    if (Number.isNaN(lastEl)) {
        return `${filename}.1`
    }
    return `${splitted.join(".")}.${lastEl + 1}`
}

const checkFileExistence = (fileName) => {
    const fullPath = path.isAbsolute(fileName) ? fileName : path.join(PATH, fileName)
    if (fs.existsSync(fullPath)) {
        return checkFileExistence(getLastNum(fileName))
    }
    return fileName
}

const formatDate = (date) => date.toISOString().substr(0, 19).split("T").join(" ")

const nextIter = (bytes) => Math.ceil(bytes / 1024 * 100) / 100

const rates = {
    BYTES: "B",
    KB: "KiB",
    MB: "MB",
    GB: "GB"
}

const getObjectI = (obj, i) => {
    let j = 0
    for (const key in obj) {
        if (j === i) return obj[key]
        j++
    }
    throw new Error("nixua xua")
}

// last means to 0.01MB instead of 1KiB
const getR = (bytes, last = false) => {
    if (bytes === 0) return 0
    let r = bytes
    let i = 0
    if (last) {
        while (nextIter(r) !== 0.01) {
            r = nextIter(r)
            i++
        }
    } else {
        while (nextIter(nextIter(r)) !== 0.01) {
            r = nextIter(r)
            i++
        }
    }
    return `${Math.ceil(r * 100) / 100}${getObjectI(rates, i)}`
}

module.exports = {
    checkFileExistence,
    formatDate,
    getR,
    getArgs,
    getFlags,
    deepEqual
}
