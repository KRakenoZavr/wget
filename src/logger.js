const fs = require("fs")
const path = require("path")
const {Console} = require("console")
const {PATH} = require("./config")
const {checkFileExistence} = require("./utils")

class Logger {
    constructor(isBg) {
        this.path = "wget-log"
        this.logger = {}
        this.log = () => {
        }
        this.isBg = isBg
        this.initFsLogger()
    }

    initFsLogger() {
        if (!this.isBg) {
            this.logger.log = console.log
        } else {
            const fileName = checkFileExistence(this.path)
            const fullPath = path.join(PATH, fileName)
            const output = fs.createWriteStream(fullPath)

            this.logger = new Console({stdout: output, stderr: output})
            console.log(`Output will be written to ${fileName}`)
        }
        // shortcut
        this.log = this.logger.log
    }
}

module.exports = {
    Logger
}
