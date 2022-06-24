// image with content len and range apply "https://i.imgur.com/z4d4kWk.jpg"
// just image from github "https://github.com/TylerLeonhardt/wgetjs/blob/master/angleman.png"

const startInBg = () => {
    const {execFile} = require('node:child_process')

    const args = ["./src/loader.js", ...process.argv.slice(2)]
    const cp = execFile("node", args)

    cp.stdout.once("data", (data) => {
        console.log(data.toString())
        process.exit(0)
    })

    console.log(`Continuing in background, pid ${cp.pid}`)
}

const startInMain = async () => {
    // should separate require statements because
    // child_process starts it 2 times if it imported in upper
    const {fetch} = require("./src/loader")

    await fetch()
}

const main = async () => {
    if (process.argv.includes("-B")) {
        startInBg()
    } else {
        await startInMain()
    }
}

main()
