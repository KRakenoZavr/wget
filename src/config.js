const path = require("path")

const PATH = path.join(__dirname, "../")

const CONFIG = {
    BACKGROUND: {
        key: "-B",
        value: false
    },
    FILENAME: {
        key: "-O",
        value: ""
    },
    FILEPATH: {
        key: "-P",
        value: "./"
    },
    LIMIT: {
        key: "--rate-limit",
        value: 0
    },
    FROM_FILE: {
        key: "-i",
        value: ""
    },
    MIRROR: {
        key: "--mirror",
        value: false,
        children: {
            REJECT: {
                key: "-R",
                value: ""
            },
            EXCLUDE: {
                key: "-X",
                value: ""
            }
        }
    }
}

module.exports = {CONFIG, PATH}
