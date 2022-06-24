const fs = require("fs")
const http = require("http")
const https = require("https")
const stream = require("stream")
const path = require("path")
const os = require('os')
const { formatDate, checkFileExistence, getArgs, getR } = require("./utils.js")
const { Logger } = require("./logger")
const { ProgressBar } = require("./progressBar")
const util = require("util")

const cache = {}

const clearAndWrite = (text) => {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(text)
}

const logRequestInfo = ({ r, logger, args, href }) => {
    const infoMsg = `sending request, awaiting response... status ${ r.statusCode } ${ http.STATUS_CODES[r.statusCode] }`
    if (args.flags.BACKGROUND) {
        logger.log(infoMsg)
    } else {
        clearAndWrite(`${ infoMsg }\n`)
    }

    if (r.statusCode >= 400) {
        logger.log(`finished at ${ formatDate(new Date()) } ERROR: ${ href } ${ r.statusCode } ${ http.STATUS_CODES[r.statusCode] }`)
        return false
    }

    if (r.statusCode >= 300 && r?.headers?.location) {
        return r?.headers?.location
    }
    return null
}

const chunkLoader = async ({ href, host, pathname, protocol, origin, requestOptions, fileName, progressBar, args }) => {
    try {
        let totalBytesDownloaded = 0
        const timeBeforeStart = Date.now()
        const speedLimit = args.flags.LIMIT
        let data = ""

        const opts = {
            transform: async (chunk, encoding, next) => {
                // Accumulate the total number of bytes received
                totalBytesDownloaded += chunk.byteLength

                // Update progress bar
                progressBar.update(totalBytesDownloaded)

                // Sleep to throttle towards desired transfer speed
                const sleepMs = Math.max(0, (totalBytesDownloaded / speedLimit * 1000) - Date.now() + timeBeforeStart)
                sleepMs && await new Promise(resolve => setTimeout(resolve, sleepMs))

                // Save loaded data to local variable
                if (args.flags.MIRROR) {
                    data += chunk.toString()
                }

                // Propagate the chunk to the stream writable
                next(null, chunk)
            }
        }
        const optsWithoutSleep = {
            transform: async (chunk, encoding, next) => {
                // Accumulate the total number of bytes received
                totalBytesDownloaded += chunk.byteLength

                // Update progress bar
                progressBar.update(totalBytesDownloaded)
                if (args.flags.MIRROR) {
                    data += chunk.toString()
                }

                // Propagate the chunk to the stream writable
                next(null, chunk)
            }
        }

        await util.promisify(stream.pipeline)(
            // Start the download stream
            await new Promise(resolve => defineRequest({ href, host, pathname, protocol }, requestOptions, resolve)),

            // Throttle data by combining setTimeout with a stream.Transform
            new stream.Transform(args.flags.LIMIT ? opts : optsWithoutSleep),

            // Save the file to disk
            fs.createWriteStream(fileName, { flags: "a" })
        )

        if (!args.flags.MIRROR) return null

        const re = /(?:href|src)=(["'])(?!mailto).*?\1/gm
        const matchedSources = data.match(re)
        if (matchedSources === null) return null
        const sources = matchedSources.map(el => el.split("=").slice(1).join("=").slice(1, -1))
        const sourcesWithUrl = sources.map(el => {
            try {
                const url = new URL(el)
                if (!url.host) return null
                return url
            } catch (e) {
                try {
                    if (el[0] !== '/') {
                        return new URL(`${ origin }/${ el }`)
                    }
                    return new URL(`${ origin }${ el }`)
                } catch (err) {
                    return null
                }
            }
        })
            .filter(el => el !== null)
            .map(el => el.href)

        if (args.flags.REJECT) {
            for (let i = 0; i < sourcesWithUrl.length; i++) {
                for (const flag of args.flags.REJECT) {
                    if (sourcesWithUrl[i].split('.').slice(-1)[0].includes(flag)) {
                        sourcesWithUrl.splice(i, 1)
                        if (i > 0) i--
                    }
                }
            }
        }

        if (args.flags.EXCLUDE) {
            for (let i = 0; i < sourcesWithUrl.length; i++) {
                for (const flag of args.flags.EXCLUDE) {
                    if (sourcesWithUrl[i].includes(flag)) {
                        sourcesWithUrl.splice(i, 1)
                        if (i > 0) i--
                    }
                }
            }
        }

        return sourcesWithUrl

    } catch (err) {
        console.log(err)
        return null
    }

}

const findPath = (path) => {
    const homeDirectory = os.homedir()

    return homeDirectory ? path.replace(/^~(?=$|\/|\\)/, homeDirectory) : path
}

const getOptions = ({ host, pathname, protocol }) => {
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

const defineRequest = ({ href, host, pathname, protocol }, options = {}, resolve) => {
    if (protocol === "http:") {
        const opts = getOptions({ host, pathname, protocol })
        const mergedOpts = { ...opts, headers: { ...opts.headers, ...options } }
        return http.get(href, mergedOpts, resolve)
    } else if (protocol === "https:") {
        const opts = getOptions({ host, pathname, protocol })
        const mergedOpts = { ...opts, headers: { ...opts.headers, ...options } }
        return https.get(href, mergedOpts, resolve)
    }
    return ""
}

const loader = async (args) => {
    try {
        const logger = new Logger(args.flags.BACKGROUND)

        const { url } = args
        // check if already loaded the source
        if (cache[url] === true) {
            return true
        }
        cache[url] = false
        const { href, host, origin, pathname, protocol } = new URL(url)
        if (args.flags.MIRROR) {
            // remember first host
            if (!cache.host) cache.host = host
            // dont load from other sources
            if (cache.host && cache.host !== host) {
                return false
            }
        }

        let fileName = "index.html"
        if (args.flags.MIRROR) {
            const after = href.split(origin).slice(1).join("")
            fileName = after !== "/" ? `${ host }${ after }` : `${ host }/${ fileName }`

            fileName.split("/").reduce((fullPath, path, idx) => {
                if (idx === 0) return fullPath
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath)
                }
                fullPath += `/${ path }`
                return fullPath
            }, host)

        } else {
            // flag -O
            const origFileName = args.flags.FILENAME || url.split("/").slice(-1)[0] || "index.html"
            fileName = args.flags.FILEPATH ? checkFileExistence(findPath(path.join(args.flags.FILEPATH, origFileName))) : checkFileExistence(origFileName)
        }

        if (fileName[fileName.length - 1] === '/') {
            fileName = `${ fileName }index.html`
        }

        if (args.flags.MIRROR && fs.existsSync(fileName)) {
            console.log(`File already exists: ${ fileName }`)
            return true
        }

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

        logger.log(`Started at ${ formatDate(new Date()) }`)

        const req = defineRequest({ host, pathname, protocol, href })


        !args.flags.BACKGROUND && clearAndWrite("sending request, awaiting response...")
        const r = await new Promise((res, rej) => {
            req.once("response", async r => {
                    req.destroy()
                    res(r)
                }
            )
        })
        const maybeNewUrl = logRequestInfo({ r, logger, args, href })
        if (maybeNewUrl === false) {
            return false
        }
        if (maybeNewUrl !== null) {
            args.url = maybeNewUrl
            const res = await loader(args)
            cache[url] = res
            cache[maybeNewUrl] = res
            return res
        }

        const clen = r.headers["content-length"]
        const isPausable = r.headers["accept-ranges"] === "bytes" && clen
        const requestOptions = isPausable ? { headers: { "Range": `bytes=${ data.length }-${ clen }` } } : {}
        const progressBar = new ProgressBar(args.flags.BACKGROUND, new Date(), !!args.flags.FROM_FILE)

        logger.log(`content size: ${ clen ? `${ clen } [~${ getR(clen, true) }]` : "unspecified" }`)
        logger.log(`saving file to: ${ fileName }`)
        progressBar.init(clen)

        const urls = await chunkLoader({
            href,
            host,
            pathname,
            origin,
            protocol,
            requestOptions,
            fileName,
            progressBar,
            args
        })
        logger.log()
        logger.log(`Downloaded [${ url }]`)
        logger.log(`finished at ${ formatDate(new Date()) }`)

        cache[url] = true
        // flag mirror
        if (urls !== null) {
            for (const url of urls) {
                args.url = url
                cache[url] = await loader(args)
            }
        }
        return true

    } catch (err) {
        if (err.code === "ENOTFOUND") {
            console.log("Resolving some_url.ogr (some_url.ogr)... failed: Name or service not known.")
        }
        return false
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
                console.log(`${ args.flags.FROM_FILE }: No such file or directory`)
            } else {
                console.log(`${ args.flags.FROM_FILE }: Error reading file`, err)
            }
            return
        }
        const urls = data.toString().split("\n").filter(el => el)
        for (const url of urls) {
            args.url = url
            loader(args)
        }
    })
}

if (process.argv.includes("-B")) {
    fetch()
}

module.exports = {
    fetch
}
