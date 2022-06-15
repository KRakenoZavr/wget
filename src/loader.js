const fs = require("fs")
const http = require("http")
const https = require("https")
const stream = require("stream")
const path = require("path")
const os = require('os')
const {formatDate, checkFileExistence, getArgs, getR} = require("./utils.js")
const {Logger} = require("./logger")
const {ProgressBar} = require("./progressBar")
const util = require("util")

const clearAndWrite = (text) => {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(text)
}

const logRequestInfo = ({r, logger, args}) => {
    const infoMsg = `sending request, awaiting response... status ${r.statusCode} ${http.STATUS_CODES[r.statusCode]}`
    if (args.flags.BACKGROUND) {
        logger.log(infoMsg)
    } else {
        clearAndWrite(`${infoMsg}\n`)
    }

    if (r.statusCode >= 400) {
        logger.log(`finished at ${formatDate(new Date())} ERROR: ${r.statusCode} ${http.STATUS_CODES[r.statusCode]}`)
        process.exit(0)
    }
}

const chunkLoader = async ({href, host, pathname, protocol, requestOptions, fileName, progressBar, args}) => {
    let totalBytesDownloaded = 0;
    const timeBeforeStart = Date.now();
    const speedLimit = 5000000

    const opts = {
        transform: async (chunk, encoding, next) => {
            // Accumulate the total number of bytes received
            totalBytesDownloaded += chunk.byteLength;

            // Sleep to throttle towards desired transfer speed
            const sleepMs = Math.max(0, (totalBytesDownloaded / speedLimit * 1000) - Date.now() + timeBeforeStart);
            // update progress bar
            progressBar.update(totalBytesDownloaded)
            sleepMs && await new Promise(resolve => setTimeout(resolve, sleepMs));

            // Propagate the chunk to the stream writable
            next(null, chunk);
        }
    }

    await util.promisify(stream.pipeline)(
        // Start the download stream
        await new Promise(resolve => defineRequest({href, host, pathname, protocol}, requestOptions, resolve)),

        // Throttle data by combining setTimeout with a stream.Transform
        new stream.Transform(opts),

        // Save the file to disk
        fs.createWriteStream(fileName, {flags: "a"})
    );
}

const findPath = (path) => {
    const homeDirectory = os.homedir()

    return homeDirectory ? path.replace(/^~(?=$|\/|\\)/, homeDirectory) : path
}

const getOptions = ({host, pathname, protocol}) => {
    return {
        host,
        path: pathname,
        method: "GET",
        protocol: protocol,
        pathname,
        headers: {
            "accept": "application/json, text/plain, */*",
            "connection": "close",
            "user-agent": "nodejs wget",
            "host": host
        }
    }
}

const defineRequest = ({href, host, pathname, protocol}, options = {}, resolve) => {
    if (protocol === "http:") {
        const opts = getOptions({host, pathname, protocol})
        const mergedOpts = {...opts, headers: {...opts.headers, ...options}}
        return http.get(href, mergedOpts, resolve)
    } else if (protocol === "https:") {
        return https.get(href, resolve)
    }
    return ""
}

const loader = async (args) => {
    const logger = new Logger(args.flags.BACKGROUND)

    try {
        const {url} = args
        const {href, host, pathname, protocol} = new URL(url)
        // flag -O
        const origFileName = args.flags.FILENAME || url.split("/").slice(-1)[0]
        const fileName = args.flags.FILEPATH ? checkFileExistence(findPath(path.join(args.flags.FILEPATH, origFileName))) : checkFileExistence(origFileName)

        let data
        try {
            data = fs.readFileSync(fileName)
        } catch (err) {
            if (err) {
                data = {
                    length: 0
                }
            }
        }

        logger.log(`Started at ${formatDate(new Date())}`)

        const req = defineRequest({host, pathname, protocol, href})


        !args.flags.BACKGROUND && clearAndWrite("sending request, awaiting response...")
        const r = await new Promise((res, rej) => {
            req.once("response", async r => {
                    req.destroy()
                    res(r)
                }
            )
        })
        logRequestInfo({r, logger, args})

        const clen = r.headers["content-length"]
        const isPausable = r.headers["accept-ranges"] === "bytes" && clen
        const requestOptions = isPausable ? {headers: {"Range": `bytes=${data.length}-${clen}`}} : {}
        const progressBar = new ProgressBar(args.flags.BACKGROUND, new Date(), clen)

        logger.log(`content size: ${clen ? `${clen} [~${getR(clen, true)}]` : "unspecified"}`)
        logger.log(`saving file to: ${fileName}`)
        progressBar.init(clen)

        await chunkLoader({href, host, pathname, protocol, requestOptions, fileName, progressBar, args})
        logger.log()
        logger.log(`Downloaded [${url}]`)
        logger.log(`finished at ${formatDate(new Date())}`)


    } catch (err) {
        if (err.code === "ENOTFOUND") {
            console.log("Resolving some_url.ogr (some_url.ogr)... failed: Name or service not known.")
        }
    }
}

const fetch = async () => {
    const args = getArgs()
    if (!args.flags.FROM_FILE) {
        await loader(args)
        return
    }

    fs.readFile(args.flags.FROM_FILE, async (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                console.log(`${args.flags.FROM_FILE}: No such file or directory`)
            } else {
                console.log(`${args.flags.FROM_FILE}: Error reading file`, err)
            }
            return
        }
        const urls = data.toString().split("\n").filter(el => el)
        for (const url of urls) {
            args.url = url
            await loader(args)
        }
    })
}

if (process.argv.includes("-B")) {
    fetch()
}

module.exports = {
    fetch
}
