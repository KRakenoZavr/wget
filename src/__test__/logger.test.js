process.argv.push("-B")
const fs = require("fs")
const {PATH} = require("../config")
const {Logger} = require("../logger")

describe("test logger", () => {
    it("fs logger", () => {
        const expected = "asd"
        const logger = new Logger(true)

        logger.log(expected)

        fs.readFile(`${PATH}wget-log`, (err, buf) => {
            if (err) {
                console.log(err)
                return
            }
            const res = buf.toString()
            if (res !== `${expected}\n`) {
                throw new Error(`${JSON.stringify({res, expected})}`)
            }
        })
    })
})

after(() => {
    // remove created files
    fs.readdir("./", (err, res) => {
        if (err) {
            console.log(err)
            return
        }

        const unnesFiles = res.filter(el => el.includes("wget-log"))
        for (const item of unnesFiles) {
            fs.unlink(item, () => {
            })
        }
    })

    process.argv.splice(-1)
});
