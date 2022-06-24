const { checkFileExistence, getR, getFlags, deepEqual } = require("../utils")
const fs = require("fs")

describe("checkFileExistence", () => {
    it("file not exist", () => {
        const res = checkFileExistence("./asd.txt")
        const expected = "./asd.txt"
        if (res !== expected) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("not exist numbered file", () => {
        const res = checkFileExistence("./index.js")
        const expected = "./index.js.1"
        if (res !== expected) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("exist numbered file", () => {
        const newFile = "./index.js.1"
        fs.writeFileSync(newFile, "", () => {
        })

        const res = checkFileExistence(newFile)
        const expected = "./index.js.2"
        if (res !== expected) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }

        fs.unlinkSync(newFile)
    })
})

describe("getR", () => {
    it("exist numbered file", () => {
        const res = getR(1024, false)
        const expected = "1024B"
        if (res !== expected) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("exist numbered file", () => {
        const res = getR(1024, true)
        const expected = "1KiB"
        if (res !== expected) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("exist numbered file", () => {
        const res = getR(102400, false)
        const expected = "100KiB"
        if (res !== expected) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("exist numbered file", () => {
        const res = getR(102400, true)
        const expected = "0.1MB"
        if (res !== expected) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
})

describe("getFlags", () => {
    it("one flag with true false", () => {
        const expected = { BACKGROUND: true }
        const res = getFlags(["-B", "https://url.com"])

        if (!deepEqual(res, expected)) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("one flag with value", () => {
        const expected = { LIMIT: 500 }
        const res = getFlags(["--rate-limit=500", "https://url.com"])

        if (!deepEqual(res, expected)) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("two flags with value and true false", () => {
        const expected = { LIMIT: 500, BACKGROUND: true }
        const res = getFlags(["--rate-limit=500", "-B", "https://url.com"])

        if (!deepEqual(res, expected)) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("mirror flag", () => {
        const expected = { MIRROR: true }
        const res = getFlags(["--mirror", "https://url.com"])

        if (!deepEqual(res, expected)) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
    it("mirror flag with children", () => {
        const expected = { MIRROR: true, REJECT: "js", EXCLUDE: "css" }
        const res = getFlags(["--mirror", "-R=js", "-X=css", "https://url.com"])

        if (!deepEqual(res, expected)) {
            throw new Error(`${ JSON.stringify({ res, expected }) }`)
        }
    })
})
