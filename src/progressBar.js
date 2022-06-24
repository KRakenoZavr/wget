const {getR} = require("./utils")

class ProgressBar {
    constructor(isBg, startDate) {
        this.startDate = startDate
        this.total = 0
        this.current = 0
        this.barLength = isBg ? 50 : process.stdout.columns - 60
        this.isBg = isBg
    }

    log(msg) {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(msg)
    }

    get_bar(length, char) {
        let str = ""
        for (let i = 0; i < length; i++) {
            str += char
        }
        return str
    }

    draw(currentProgress) {
        const speed = this.current / (new Date() - this.startDate) * 1000

        if (!this.total) {
            !this.isBg && this.log(`  Current progress ${getR(this.current)}: [ <=> ] ${getR(speed)}`)
            return
        }

        const filledBarLength = (currentProgress * this.barLength).toFixed(0)
        const emptyBarLength = this.barLength - filledBarLength

        const filledBar = this.get_bar(filledBarLength, "=")
        const emptyBar = this.get_bar(emptyBarLength, " ")
        const percentageProgress = (currentProgress * 100).toFixed(2)

        const secondsLeft = ((this.total - this.current) / speed).toFixed(1)


        !this.isBg && this.log(`  ${getR(this.total)} / ${getR(this.current)}: [${filledBar}${emptyBar}] ${percentageProgress}% ${getR(speed)}/s ${secondsLeft}s`)
    }

    update(current) {
        this.current = current
        const currentProgress = this.current / this.total
        this.draw(currentProgress)
    }

    init(total) {
        console.log({total})
        this.total = total
        this.current = 0
        this.update(this.current)
    }
}

module.exports = {ProgressBar}
