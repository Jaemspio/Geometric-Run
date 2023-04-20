import {levels, achievements} from "./data.js"

if (typeof CanvasRenderingContext2D.prototype.roundRect != "function") {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2
        if (h < 2 * r) r = h / 2
        this.moveTo(x + r, y)
        this.arcTo(x + w, y, x + w, y + h, r)
        this.arcTo(x + w, y + h, x, y + h, r)
        this.arcTo(x, y + h, x, y, r)
        this.arcTo(x, y, x + w, y, r)
    }
}

const cvs = document.querySelector("canvas")
const ctx = cvs.getContext("2d")
const doc = $(document)
const tilesize = 120
const gridWidth = cvs.width / tilesize
const gridHeight = cvs.height / tilesize
const bottom = cvs.height - tilesize
const grid = []
const fps = 30
const jumpforce = 65
const gravity = 8
const terminal = 76
const spawn = 160

let editorMode = false
let isDemoing = false
let dirty = false
let paused = false
let state = 1
let camX = 0
let speed = 32
let levelSize
let level = 1
let unlocked = 1
let unlockedAchievements = []
let isTabOpen = false
let currentPage = 1
let maxPage = 1
let currentBrush
let isDown = false
let resetTimeout

function getLevelData() {
    const level = {}
    level.size = levelSize
    level.tiles = {}
    for (let h = 0; h < gridHeight; h++) {
        for (let w = 0; w < level.size; w++) {
            const tile = grid[w][h]
            if (tile.type != "air") {
                level.tiles[w + "," + h] = tile.type
            }
        }
    }
    return level
}

/* function initButtons() {
    if (typeof $("#buttons")[0] !== "undefined") {
        $("#buttons").show()
        return
    }
    $("body").append("<div id='buttons'></div>")
    let div = $("#buttons")
    div.append("<div id='materials'></div>")
    div = $("#materials")
    div.append("<button id='air'>Air</button>")
    div.append("<button id='block'>Block</button>")
    div.append("<button id='platform'>Platform</button>")
    div.append("<button id='spike'>Spike</button>")
    div.append("<button id='down-spike'>ǝʞᴉdS</button>")
    div.append("<button id='jump-pad'>Booster</button>")
    div.append("<button id='jump-star'>Star</button>")
    div.append("<button id='gportal'>Gravity</button>")
    $("#buttons button").click(function(e) {
        for (let coords in selectedTiles) {
            const [x, y] = coords.split(",")
            grid[+x][+y].type = this.id
        }
        selectedTiles = {}
        if (selectedTile) {
            selectedTile.type = this.id
            selectedTile = null
        }
        dirty = true
    })
    $("#buttons").append("<div id='control'></div>")
    div = $("#control")
    div.append("<button id='demo'>Demo</button")
    div.append("<button id='save'>Save</button")
    div.append("<button id='load'>Load</button")
    div.append("<button id='export'>Export</button")
    div.append("<button id='import'>Import</button")
    $("#demo").click(function() {
        editorMode = false
        isDemoing = true
        selectedTile = null
        selectedTiles = {}
        $("#buttons").hide()
    })
    $("#save").click(function() {
        if (dirty) {
            const level = getLevelData()
            localStorage.removeItem("savedData")
            localStorage.setItem("savedData", JSON.stringify(level))
        }
        dirty = false
    })
    $("#load").click(function() {
        const data = JSON.parse(localStorage.getItem("savedData"))
        if (!data) {return}
        const m = "Are you sure you want to load your saved level? This will replace the current level!"
        if (!confirm(m)) {return}
        camX = 0
        loadLevel(data)
        const page = $("#page")[0]
        page.dataset.cur = 1
        page.dataset.max = data.size / gridWidth
        $(page).text(` ${page.dataset.cur} / ${page.dataset.max} `)
        dirty = false
    })
    $("#export").click(function() {
        navigator.clipboard.writeText(JSON.stringify(getLevelData()))
        $(this).text("Copied!")
        setTimeout(() => {
            $(this).text("Export")
        }, 1800)
    })
    $("#import").click(function() {
        let level = prompt("Input valid level data:")
        if (level) {
            level = JSON.parse(level)
            camX = 0
            loadLevel(level)
            const page = $("#page")[0]
            page.dataset.cur = 1
            page.dataset.max = level.size / gridWidth
            $(page).text(` ${page.dataset.cur} / ${page.dataset.max} `)
        }
    })
    $("#buttons").append("<div id='pages'></div>")
    div = $("#pages")
    div.append("<button id='first'>First</button")
    div.append("<button id='previous'>Previous Page</button")
    div.append("<span id='page' data-cur='1' data-max='1'> 1 / 1 </span>")
    div.append("<button id='next'>Next Page</button>")
    div.append("<button id='last'>Last</button")
    const page = $("#page")[0]
    $("#previous").click(function() {
        const cur = +page.dataset.cur
        const max = +page.dataset.max
        if (cur > 1) {
            page.dataset.cur = cur - 1
            $(page).text(` ${page.dataset.cur} / ${page.dataset.max} `)
            camX = (+page.dataset.cur - 1) * gridWidth * tilesize
        }
    })
    $("#next").click(function() {
        const cur = +page.dataset.cur
        const max = +page.dataset.max
        if (cur == max) {
            page.dataset.max = max + 1
            const start = levelSize
            levelSize = (max + 1) * gridWidth
            for (let i = start; i < levelSize; i++) {
                grid[i] = []
            }
            for (let h = 0; h < gridHeight; h++) {
                for (let w = start; w < levelSize; w++) {
                    new Tile(w, h)
                }
            }
        }
        page.dataset.cur = cur + 1
        $(page).text(` ${page.dataset.cur} / ${page.dataset.max} `)
        camX = (+page.dataset.cur - 1) * gridWidth * tilesize
    })
    $("#first").click(e => {
        page.dataset.cur = 1
        $(page).text(` ${page.dataset.cur} / ${page.dataset.max} `)
        camX = (+page.dataset.cur - 1) * gridWidth * tilesize
    })
    $("#last").click(e => {
        page.dataset.cur = page.dataset.max
        $(page).text(` ${page.dataset.cur} / ${page.dataset.max} `)
        camX = (+page.dataset.cur - 1) * gridWidth * tilesize
    })
} */

class Tile {
    constructor(x = 0, y = 0, type = "air") {
        this.x = x
        this.y = y
        this.vel = 0
        this.offset = 0
        this.cooldown = 0
        this.used = false
        this.type = type
        grid[x][y] = this
    }
    getEffectivePosition() {
        return [tilesize * this.x - camX, tilesize * this.y + this.offset]
    }
    collidesWithPlayer(width = tilesize, height = tilesize, oy = 0) {
        if (editorMode || paused) {return false}
        const [x, y] = this.getEffectivePosition()
        const [px, py] = p.getEffectivePosition()
        const w = (tilesize - width) / 2
        const h = tilesize - height
        return px + tilesize > x + w && px < x - w + tilesize
        && py + tilesize > y + h - oy && py < y + tilesize - oy
    }
    update() {
        const [x, y] = this.getEffectivePosition()
        if (x < -tilesize || x > cvs.width || this.used) {return}
        if (this.cooldown && !paused) {
            this.cooldown--
        }
        switch(this.type) {
        case "air":
            break
        case "block":
            ctx.fillStyle = "black"
            ctx.fillRect(x, y, tilesize, tilesize)
            if (this.collidesWithPlayer()) {
                p.die()
            }
            break
        case "platform":
            ctx.fillStyle = "black"
            ctx.fillRect(x, y, tilesize, tilesize / 2)
            if (this.collidesWithPlayer(tilesize, tilesize / 2, tilesize / 2)) {
                p.die()
            }
            /* ctx.strokeStyle = "blue"
            ctx.strokeRect(x, y, tilesize, tilesize / 2) */
            break
        case "spike":
            ctx.fillStyle = "red"
            ctx.beginPath()
            ctx.moveTo(x, y + tilesize)
            ctx.lineTo(x + tilesize / 2, y)
            ctx.lineTo(x + tilesize, y + tilesize)
            ctx.fill()
            if (this.collidesWithPlayer(tilesize / 2, tilesize * 0.7)) {
                p.die()
            }
            /* ctx.strokeStyle = "blue"
            const width = tilesize / 2
            const w = (tilesize - width) / 2
            ctx.strokeRect(x + w, y + tilesize * 0.3, width, tilesize * 0.7) */
            break
        case "down-spike":
            ctx.fillStyle = "red"
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x + tilesize / 2, y + tilesize)
            ctx.lineTo(x + tilesize, y)
            ctx.fill()
            if (this.collidesWithPlayer(tilesize / 2, tilesize * 0.7, tilesize * 0.3)) {
                p.die()
            }
            /* ctx.strokeStyle = "blue"
            const width = tilesize / 2
            const w = (tilesize - width) / 2
            ctx.strokeRect(x + w, y + tilesize, width, tilesize * 0.7) */
            break
        case "jump-pad":
            ctx.fillStyle = "yellow"
            ctx.beginPath()
            ctx.arc(x + tilesize / 2, y + tilesize, tilesize / 2.2, Math.PI, 2 * Math.PI)
            ctx.lineTo(x, y + tilesize)
            ctx.fill()
            if (this.collidesWithPlayer(tilesize, tilesize / 2)) {
                p.vel = jumpforce * 1.4
            }
            break
        case "jump-star":
            ctx.fillStyle = "yellow"
            ctx.beginPath()
            ctx.arc(x + tilesize / 2, y + tilesize / 2, tilesize / 4.85, 0, 2 * Math.PI)
            ctx.fill()
            break
        case "gportal":
            ctx.fillStyle = "lightblue"
            ctx.beginPath()
            ctx.ellipse(x + tilesize / 2, y + tilesize / 2, tilesize * 0.3, tilesize * 1.5, 0, 0, 2 * Math.PI)
            ctx.fill()
            if (this.collidesWithPlayer(tilesize * 0.7, tilesize * 3, -tilesize)) {
                if (!this.cooldown) {
                    this.cooldown = 20
                    p.gravityReversed = !p.gravityReversed
                }
            }
            /* ctx.strokeStyle = "blue"
            ctx.strokeRect(x + tilesize * 0.15, y - tilesize, tilesize * 0.7, tilesize * 3) */
            break
        case "falling-spike":
            ctx.fillStyle = "red"
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x + tilesize / 2, y + tilesize)
            ctx.lineTo(x + tilesize, y)
            ctx.fill()
            if (editorMode) {
                ctx.fillStyle = "blue"
                ctx.beginPath()
                ctx.moveTo(x + tilesize / 2 - 10, y + tilesize / 4)
                ctx.lineTo(x + tilesize / 2 - 10, y + tilesize / 2)
                ctx.lineTo(x + tilesize / 2 - 20, y + tilesize / 2)
                ctx.lineTo(x + tilesize / 2, y + tilesize / 1.4)
                ctx.lineTo(x + tilesize / 2 + 20, y + tilesize / 2)
                ctx.lineTo(x + tilesize / 2 + 10, y + tilesize / 2)
                ctx.lineTo(x + tilesize / 2 + 10, y + tilesize / 4)
                ctx.fill()
            }
            if (editorMode || paused) {break}
            const [px, py] = p.getEffectivePosition()
            const g = gravity / 2
            if (px + tilesize * 3 >= x && py > y && !this.vel) {
                this.vel = g
            } else if (this.vel) {
                this.vel = Math.min(terminal, this.vel + g)
            }
            this.offset += this.vel
            try {
                const tile = grid[this.x][Math.ceil(((this.y * tilesize) + this.offset) / tilesize)]
                if (tile.type == "block" || tile.type == "platform") {
                    this.used = true
                }
            } catch(e) {
                this.used = true
            }
            if (this.collidesWithPlayer(tilesize / 2, tilesize * 0.7, tilesize * 0.3)) {
                p.die()
                this.used = true
            }
            break
        }
        if (editorMode) {
            ctx.lineWidth = 4
            ctx.strokeStyle = "red"
            ctx.strokeRect(x, y, tilesize, tilesize)
        }
    }
}

class Player {
    constructor() {
        this.x = spawn
        this.y = 0
        this.vel = 0
        this.jumped = false
        this.isDead = false
        this.gravityReversed = false
    }
    jump() {
        this.jumped = true
        if (this.gravityReversed) {
            this.vel = -jumpforce
            return
        }
        this.vel = jumpforce
    }
    die() {
        if (this.isDead || state != 2) {return}
        this.isDead = true
        if (!isDemoing) {
            if (!isUnlocked(0)) {
                unlockAchievement(0)
            }
            if (this.x > spawn && !isUnlocked(3)) {
                unlockAchievement(3)
            }
        }
        resetTimeout = setTimeout(() => {
            gameOver()
        }, 1200)
    }
    getEffectivePosition() {
        return [this.x, bottom - this.y]
    }
    getNearbyTiles() {
        const ret = []
        const [_, by] = this.getEffectivePosition()
        const x = Math.min(levelSize - 1, (this.x + camX) / tilesize)
        const y = Math.min(gridHeight - 1, by / tilesize)
        ret.push(grid[Math.floor(x)][Math.floor(y)])
        ret.push(grid[Math.ceil(x)][Math.floor(y)])
        ret.push(grid[Math.floor(x)][Math.ceil(y)])
        ret.push(grid[Math.ceil(x)][Math.ceil(y)])
        return ret.filter((item, index) => ret.indexOf(item) === index)
    }
    update() {
        if (editorMode) {
            this.render()
            return
        }
        if (isDown && !this.jumped && this.x < cvs.width - 150) {this.jump()}
        if (this.gravityReversed) {
            const [_, oldY] = this.getEffectivePosition()
            const ceil = (gridHeight - 1) * tilesize
            this.y += this.vel
            if (this.y <= 0) {
                this.vel = 0
            }
            this.y = Math.max(0, this.y)
            this.y = Math.min(ceil, this.y)
            let adjustedY = ceil
            const tiles = this.getNearbyTiles()
            for (let t of tiles) {
                const [x, y] = t.getEffectivePosition()
                if (t.type != "block" && t.type != "platform") {continue}
                const [px, py] = this.getEffectivePosition()
                if (t.type == "block" && t.collidesWithPlayer()) {
                    if (py + tilesize > y && oldY + tilesize <= y) {
                        this.vel = 0
                        this.y = bottom - y + tilesize
                    } else if (py < y + tilesize && oldY >= y + tilesize) {
                        adjustedY = bottom - y - tilesize
                    }
                } else if (t.type == "platform" && t.collidesWithPlayer(tilesize, tilesize / 2, tilesize / 2)) {
                    if (py + tilesize > y && oldY + tilesize <= y) {
                        this.vel = 0
                        this.y = bottom - y + tilesize
                    } else if (py < y + tilesize / 2 && oldY >= y + tilesize / 2) {
                        adjustedY = bottom - y - tilesize / 2
                    }
                }
            }
            if (this.y < ceil && adjustedY == ceil) {
                this.vel = Math.min(terminal, this.vel + gravity)
                this.jumped = true
            } else {
                this.y = adjustedY
                this.vel = 0
                this.jumped = false
            }
            this.render()
            if (this.x >= cvs.width + 200) {
                gameOver(true)
            }
        } else {
            const [_, oldY] = this.getEffectivePosition()
            const ceil = (gridHeight - 1) * tilesize
            this.y += this.vel
            if (this.y >= ceil) {
                this.vel = 0
            }
            this.y = Math.min(ceil, this.y)
            let adjustedY = 0
            const tiles = this.getNearbyTiles()
            for (let t of tiles) {
                const [x, y] = t.getEffectivePosition()
                if (t.type != "block" && t.type != "platform") {continue}
                const [px, py] = this.getEffectivePosition()
                if (t.type == "block" && t.collidesWithPlayer()) {
                    if (py + tilesize > y && oldY + tilesize <= y) {
                        adjustedY = bottom - y + tilesize
                    } else if (py < y + tilesize && oldY >= y + tilesize) {
                        this.vel = 0
                        this.y = bottom - y - tilesize
                    }
                } else if (t.type == "platform" && t.collidesWithPlayer(tilesize, tilesize / 2, tilesize / 2)) {
                    if (py + tilesize > y && oldY + tilesize <= y) {
                        adjustedY = bottom - y + tilesize
                    } else if (py < y + tilesize / 2 && oldY >= y + tilesize / 2) {
                        this.vel = 0
                        this.y = bottom - y - tilesize / 2
                    }
                }
            }
            if (this.y > 0 && !adjustedY) {
                this.vel = Math.max(-terminal, this.vel - gravity)
                this.jumped = true
            } else {
                this.y = adjustedY
                this.vel = 0
                this.jumped = false
            }
            this.render()
        }
    }
    render() {
        const [x, y] = this.getEffectivePosition()
        ctx.fillStyle = "rgb(0, 20, 140)"
        ctx.strokeStyle = "black"
        ctx.lineWidth = 4
        ctx.fillRect(x, y, tilesize, tilesize)
        ctx.strokeRect(x, y, tilesize, tilesize)
    }
}

function loadLevel(l) {
    const isLoaded = l != null
    l = l || levels[level]
    levelSize = l.size
    let t = l.tiles
    if (editorMode && !isLoaded) {
        levelSize = gridWidth
        t = {}
        currentPage = 1
        maxPage = 1
    }
    grid.length = 0 // Empty the grid
    for (let i = 0; i < levelSize; i++) {
        grid[i] = []
    }
    for (let h = 0; h < gridHeight; h++) {
        for (let w = 0; w < levelSize; w++) {
            const tile = t[w + "," + h]
            if (tile) {
                new Tile(w, h, tile) 
            } else {
                new Tile(w, h)
            }
        }
    }
}

let timer = 10
let achievementQueue = []

function unlockAchievement(id) {
    unlockedAchievements.push(id)
    saveGameData()
    achievementQueue.push({
        id: id,
        timer: 0,
    })
}

function isUnlocked(id) {
    return unlockedAchievements.includes(id)
}

function gameOver(isWin = false, reset = false) {
    if (isWin && !isDemoing) {
        timer = 20
        state = 3
        if (unlocked == level && typeof levels[level + 1] != "undefined") {
            unlocked++
            saveGameData()
        }
        if (level == 1 && !isUnlocked(1)) {
            unlockAchievement(1)
        } else if (level == 3 && !isUnlocked(2)) {
            unlockAchievement(2)
        }
        return
    } else if (isWin && isDemoing) {
        isDemoing = false
        editorMode = true
        camX = (currentPage - 1) * gridWidth * tilesize
    }
    camX = isDemoing ? (currentPage - 1) * gridWidth * tilesize : 0
    p.x = spawn
    p.y = 0
    p.vel = 0
    p.isDead = false
    p.gravityReversed = false
    for (let h = 0; h < gridHeight; h++) {
        for (let w = 0; w < levelSize; w++) {
            const tile = grid[w][h]
            tile.used = false
            tile.offset = 0
            tile.vel = 0
        }
    }
    if (reset) {
        if (resetTimeout) {
            clearTimeout(resetTimeout)
        }
        return
    }
}

let frameCount = 0
const p = new Player()
function update() {
    frameCount++
    ctx.clearRect(0, 0, 9999, 9999)
    if (state == 1) {
        ctx.font = "124px Righteous"
        ctx.textAlign = "center"
        if (!document.fonts.check(ctx.font)) {
            ctx.fillText(" ", 0, 0)
            return
        }
        const angle = (Math.sin(frameCount / 10) * 0.8) - 0.4
        ctx.rotate(angle * Math.PI / 180)
        ctx.fillStyle = "rgb(0, 20, 140)"
        ctx.fillText("Geometric Run", cvs.width / 2, 220)
        ctx.font = "58px Source Sans Pro"
        ctx.rotate(-angle * Math.PI / 180)
        ctx.fillStyle = "black"
        const center = cvs.height / 2
        ctx.fillText("Play", cvs.width / 2, center - 72)
        ctx.fillText("Editor", cvs.width / 2, center)
        ctx.fillText("Achievements", cvs.width / 2, center + 72)
        p.x = ((frameCount * speed) % (cvs.width + 600)) - 500
        p.y += p.vel
        if (p.y > 0) {
            p.vel = Math.max(-terminal, p.vel - gravity)
            p.jumped = true
        } else {
            p.vel = 0
            p.y = 0
            p.jumped = false
        }
        if (!p.jumped && isDown) {p.jump()}
        p.render()
    } else if (state == 2) {
        if (editorMode) {
            if (dirty) {
                document.title = "*Geometric Run - Editor Mode"
            } else {
                document.title = "Geometric Run - Editor Mode"
            }
            for (let col of grid) {
                for (let tile of col) {
                    const [x, y] = tile.getEffectivePosition()
                    tile.update()
                }
            }
            p.update()
            const h = isTabOpen ? 160 : 0
            ctx.fillStyle = "lightgrey"
            ctx.strokeStyle = "grey"
            ctx.lineWidth = 3
            if (isTabOpen) {
                ctx.fillRect(0, cvs.height - h, 9999, h)
                ctx.strokeRect(0, cvs.height - h, 9999, h)
            }
            ctx.beginPath()
            ctx.moveTo(100, cvs.height - h + 2)
            ctx.bezierCurveTo(100, cvs.height - 55 - h, 140, cvs.height - 55 - h, 140, cvs.height - 55 - h)
            ctx.lineTo(200, cvs.height - 55 - h)
            ctx.bezierCurveTo(200, cvs.height - 55 - h, 240, cvs.height - 55 - h, 240, cvs.height - h + 2)
            ctx.fill()
            ctx.beginPath()
            ctx.moveTo(100, cvs.height - h)
            ctx.bezierCurveTo(100, cvs.height - 55 - h, 140, cvs.height - 55 - h, 140, cvs.height - 55 - h)
            ctx.lineTo(200, cvs.height - 55 - h)
            ctx.bezierCurveTo(200, cvs.height - 55 - h, 240, cvs.height - 55 - h, 240, cvs.height - h)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(cvs.width, 80)
            ctx.lineTo(cvs.width - 620, 80)
            ctx.bezierCurveTo(cvs.width - 740, 80, cvs.width - 740, 0, cvs.width - 740, 0)
            ctx.lineTo(cvs.width, 0)
            ctx.fill()
            ctx.beginPath()
            ctx.moveTo(cvs.width, 80)
            ctx.lineTo(cvs.width - 620, 80)
            ctx.bezierCurveTo(cvs.width - 740, 80, cvs.width - 740, 0, cvs.width - 740, 0)
            ctx.lineTo(cvs.width, 0)
            ctx.stroke()
            ctx.fillStyle = "grey"
            ctx.beginPath()
            ctx.moveTo(150, cvs.height - 10 - h)
            ctx.lineTo(170, cvs.height - 45 - h)
            ctx.lineTo(190, cvs.height - 10 - h)
            ctx.fill()
            ctx.fillStyle = "rgb(0, 20, 140)"
            ctx.font = "36px Source Sans Pro"
            ctx.textAlign = "left"
            ctx.fillText(`Page ${currentPage} / ${maxPage}`, 10, 40)
            ctx.fillStyle = "rgb(0, 20, 140)"
            ctx.textAlign = "center"
            ctx.font = "42px Righteous"
            ctx.fillText("Demo", cvs.width - 640, 50)
            ctx.fillText("Save", cvs.width - 520, 50)
            ctx.fillText("Load", cvs.width - 400, 50)
            ctx.fillText("Export", cvs.width - 260, 50)
            ctx.fillText("Import", cvs.width - 100, 50)
            if (isTabOpen) {
                ctx.fillStyle = "grey"
                ctx.beginPath()
                ctx.moveTo(20, cvs.height - 80)
                ctx.lineTo(90, cvs.height - 120)
                ctx.lineTo(90, cvs.height - 40)
                ctx.fill()
                ctx.beginPath()
                ctx.moveTo(cvs.width - 20, cvs.height - 80)
                ctx.lineTo(cvs.width - 90, cvs.height - 120)
                ctx.lineTo(cvs.width - 90, cvs.height - 40)
                ctx.fill()
                const ts = 100
                for (let i = 0; i <= 8; i++) {
                    const [x, y] = [120 + i * (ts + 30), cvs.height - ts - 35]
                    switch(i) {
                    case 0:
                        break
                    case 1:
                        ctx.fillStyle = "black"
                        ctx.fillRect(x, y, ts, ts)
                        break
                    case 2:
                        ctx.fillStyle = "black"
                        ctx.fillRect(x, y, ts, ts / 2)
                        break
                    case 3:
                        ctx.fillStyle = "red"
                        ctx.beginPath()
                        ctx.moveTo(x, y + ts)
                        ctx.lineTo(x + ts / 2, y)
                        ctx.lineTo(x + ts, y + ts)
                        ctx.fill()
                        break
                    case 4:
                        ctx.fillStyle = "red"
                        ctx.beginPath()
                        ctx.moveTo(x, y)
                        ctx.lineTo(x + ts / 2, y + ts)
                        ctx.lineTo(x + ts, y)
                        ctx.fill()
                        break
                    case 5:
                        ctx.fillStyle = "yellow"
                        ctx.beginPath()
                        ctx.arc(x + ts / 2, y + ts, ts / 2.2, Math.PI, 2 * Math.PI)
                        ctx.lineTo(x, y + ts)
                        ctx.fill()
                        break
                    case 6:
                        ctx.fillStyle = "yellow"
                        ctx.beginPath()
                        ctx.arc(x + ts / 2, y + ts / 2, ts / 4.85, 0, 2 * Math.PI)
                        ctx.fill()
                        break
                    case 7:
                        ctx.fillStyle = "lightblue"
                        ctx.beginPath()
                        ctx.ellipse(x + ts / 2, y + ts / 2, ts * 0.2, ts * 0.6, 0, 0, 2 * Math.PI)
                        ctx.fill()
                        break
                    case 8:
                        ctx.fillStyle = "red"
                        ctx.beginPath()
                        ctx.moveTo(x, y)
                        ctx.lineTo(x + ts / 2, y + ts)
                        ctx.lineTo(x + ts, y)
                        ctx.fill()
                        ctx.fillStyle = "blue"
                        ctx.beginPath()
                        ctx.moveTo(x + ts / 2 - 10, y + ts / 4)
                        ctx.lineTo(x + ts / 2 - 10, y + ts / 2)
                        ctx.lineTo(x + ts / 2 - 20, y + ts / 2)
                        ctx.lineTo(x + ts / 2, y + ts / 1.4)
                        ctx.lineTo(x + ts / 2 + 20, y + ts / 2)
                        ctx.lineTo(x + ts / 2 + 10, y + ts / 2)
                        ctx.lineTo(x + ts / 2 + 10, y + ts / 4)
                        ctx.fill()
                        break
                    }
                    if (currentBrush == i) {
                        ctx.strokeStyle = "blue"
                        ctx.lineWidth = 5
                        ctx.strokeRect(x, y, ts, ts)
                    }
                }
            }
            return
        } else {
            document.title = "Geometric Run"
        }
        for (let col of grid) {
            for (let tile of col) {
                tile.update()
            }
        }
        if (paused && !p.isDead) {
            p.render()
        }
        if (!paused && !p.isDead) {
            p.update()
            if (camX + cvs.width == levelSize * tilesize) {
                p.x += speed
            } else {
                camX += speed
                camX = Math.min(camX, (levelSize * tilesize) - cvs.width)
            }
            if (p.x >= cvs.width + 200) {
                gameOver(true)
            }
        }
        if (paused) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
            ctx.fillRect(0, 0, 9999, 9999)
            ctx.fillStyle = "grey"
            ctx.fillStyle = "white"
            ctx.font = "84px Source Sans Pro"
            ctx.textAlign = "center"
            ctx.fillText("Resume", cvs.width / 2, 320)
            if (isDemoing) {
                ctx.fillText("Stop", cvs.width / 2, cvs.height / 2)
            } else {
                ctx.fillText("Retry", cvs.width / 2, cvs.height / 2)
            }
            ctx.fillText("Back", cvs.width / 2, cvs.height - 320)
            ctx.fillStyle = "lightgrey"
            ctx.beginPath()
            ctx.moveTo(tilesize * 0.35, tilesize * 0.2)
            ctx.lineTo(tilesize * 0.9, tilesize * 0.5)
            ctx.lineTo(tilesize * 0.35, tilesize * 0.8)
            ctx.fill()
        } else {
            ctx.fillStyle = "grey"
            ctx.fillRect(tilesize * 0.35, tilesize * 0.2, tilesize * 0.2, tilesize * 0.6)
            ctx.fillRect(tilesize * 0.7, tilesize * 0.2, tilesize * 0.2, tilesize * 0.6)
        }
    } else if (state == 3) {
        for (let col of grid) {
            for (let tile of col) {
                tile.update()
            }
        }
        if (timer > 0) {timer--}
        ctx.fillStyle = `rgba(0, 0, 0, ${(10 - timer) / 24})`
        ctx.fillRect(0, 0, 9999, 9999)
        ctx.fillStyle = "grey"
        ctx.strokeStyle = "black"
        ctx.lineWidth = 5
        const size = [cvs.width / 1.4, cvs.height / 1.55]
        const pos = [cvs.width / 2 - size[0] / 2, cvs.height / 2 - size[1] / 2]
        const offset = timer ** 2 * 6
        ctx.fillRect(pos[0], pos[1] - offset, size[0], size[1])
        ctx.strokeRect(pos[0], pos[1] - offset, size[0], size[1])
        ctx.fillStyle = "rgb(40, 40, 180)"
        ctx.textAlign = "center"
        ctx.font = "146px Righteous"
        ctx.fillText("Level Complete!", cvs.width / 2, pos[1] + 140 - offset)
        ctx.font = "76px Source Sans Pro"
        ctx.fillStyle = "white"
        const height = cvs.height / 2 + 260
        ctx.fillText("Back", cvs.width / 3.45, height - offset)
        ctx.fillText("Retry", cvs.width / 2, height - offset)
        if (typeof levels[level + 1] === "undefined") {
            ctx.fillStyle = "rgb(180, 180, 180)"
        }
        ctx.fillText("Next", cvs.width / 1.35, height - offset)
        p.x = cvs.width / 2 - tilesize / 2
        p.y = cvs.height / 2 - tilesize / 2 + offset
        p.render()
    } else if (state == 4) {
        ctx.fillStyle = "black"
        ctx.font = "124px Righteous"
        ctx.textAlign = "center"
        ctx.fillText("Level Select", cvs.width / 2, 200)
        ctx.font = "66px Righteous"
        ctx.fillText("Back", cvs.width / 2, cvs.height - 80)
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = "grey"
            if (i + 1 <= unlocked) {
                ctx.fillStyle = "rgb(210, 210, 210)"
            }
            ctx.strokeStyle = "black"
            ctx.lineWidth = 5
            ctx.beginPath()
            ctx.roundRect(540 + i * 180, 260, 150, 150, 10)
            ctx.fill()
            ctx.beginPath()
            ctx.roundRect(540 + i * 180, 260, 150, 150, 10)
            ctx.stroke()
            ctx.fillStyle = "black"
            ctx.font = "82px Source Sans Pro"
            ctx.fillText(`${i + 1}`, 615 + i * 180, 360)
        }
    } else if (state == 5) {
        ctx.fillStyle = "black"
        ctx.font = "124px Righteous"
        ctx.textAlign = "center"
        ctx.fillText("Achievements", cvs.width / 2, 200)
        ctx.font = "66px Righteous"
        ctx.fillText("Back", cvs.width / 2, cvs.height - 80)
        if (selectedAchievement != null) {
            ctx.fillStyle = "black"
            ctx.font = "54px Source Sans Pro"
            ctx.fillText(achievements[selectedAchievement].name, cvs.width / 2, cvs.height - 200)
            ctx.font = "32px Source Sans Pro"
            ctx.fillText(achievements[selectedAchievement].description, cvs.width / 2, cvs.height - 160)
        }
        for (let i = 0; i < achievements.length; i++) {
            ctx.fillStyle = "lightgrey"
            ctx.strokeStyle = "black"
            if (i == selectedAchievement) {ctx.strokeStyle = "blue"}
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.roundRect(360 + i * 180, 250, 150, 150, 10)
            ctx.fill()
            achievements[i].render()
            if (!isUnlocked(i)) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
                ctx.beginPath()
                ctx.roundRect(360 + i * 180, 250, 150, 150, 10)
                ctx.fill()
            }
            ctx.beginPath()
            ctx.roundRect(360 + i * 180, 250, 150, 150, 10)
            ctx.stroke()
        }
    }
    if (typeof achievementQueue[0] != "undefined") {
        achievementQueue[0].timer++
        const t = achievementQueue[0].timer
        const id = achievementQueue[0].id
        if (t <= 10) {
            achievements[id].display((10 - t) ** 2 * 4)
        } else if (t >= 90) {
            achievements[id].display((t - 90) ** 2 * 4)
        } else {
            achievements[id].display()
        }
        if (t > 100) {
            achievementQueue.splice(0, 1)
        }
    }
}

$(function() {
    onSizeChange()
    const data = getGameData()
    unlocked = data.unlockedLevel
    unlockedAchievements = data.achievements || []
})

function onSizeChange() {
    const mult = innerWidth/ cvs.width
    const c = $(cvs)
    if (cvs.height * mult > innerHeight) {
        c.css("width", "auto")
        c.css("height", "99svh")
    } else {
        c.css("width", "100%")
        c.css("height", "auto")
    }
}

function checkBrowser() {
    let userAgentString = navigator.userAgent
    let chromeAgent = userAgentString.indexOf("Chrome") > -1
    let iExplorerAgent = userAgentString.indexOf("MSIE") > -1 || userAgentString.indexOf("rv:") > -1
    let firefoxAgent = userAgentString.indexOf("Firefox") > -1
    let safariAgent = userAgentString.indexOf("Safari") > -1
    if ((chromeAgent) && (safariAgent)) {safariAgent = false}
    let operaAgent = userAgentString.indexOf("OP") > -1
    if ((chromeAgent) && (operaAgent)) {chromeAgent = false}
    if (chromeAgent) {
        return "Chrome"
    } else if (iExplorerAgent) {
        return "IE"
    } else if (firefoxAgent) {
        return "Firefox"
    } else if (safariAgent) {
        return "Safari"
    } else if (operaAgent) {
        return "Opera"
    } else {
        return "Unknown"
    }
}

addEventListener("resize", onSizeChange)

function saveGameData() {
    const data = {
        unlockedLevel: unlocked,
        achievements: unlockedAchievements,
    }
    localStorage.setItem("gameData", JSON.stringify(data))
}

function getGameData() {
    const data = JSON.parse("" + localStorage.getItem("gameData"))
    if (!data) {
        saveGameData()
        return getGameData()
    }
    return data
}

function getClickPosition(e) {
    const rect = cvs.getBoundingClientRect()
    if (e.type.includes("touch")) {
        const evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent
        const touch = evt.touches[0] || evt.changedTouches[0]
        return [Math.floor(touch.pageX - rect.left), Math.floor(touch.pageY)]
    }
    return [Math.floor(e.clientX - rect.left), Math.floor(e.clientY)]
}

function isTouchScreen() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
}

const brushes = ["air", "block", "platform", "spike", "down-spike", "jump-pad", "jump-star", "gportal", "falling-spike"]
let selectedAchievement

$(cvs).on("click", e => {
    const cx = cvs.width / 2
    const cy = cvs.height / 2
    const rect = cvs.getBoundingClientRect()
    const mult = cvs.width / rect.width
    const [clientX, clientY] = [Math.floor(e.clientX - rect.left), Math.floor(e.clientY)]
    if (state == 1) {
        const [x, y] = [Math.floor(clientX * mult), Math.floor(clientY * mult)]
        if (y > cy - 72 * 2 && y < cy + 72) {
            if (x > cx - 170 && x < cx + 170) {
                paused = false
                if (y < cy - 72) {
                    state = 4
                } else if (y < cy) {
                    editorMode = true
                    gameOver(false, true)
                    loadLevel()
                    state = 2
                } else if (y < cy + 72) {
                    state = 5
                }
            }
        }
    } else if (state == 2) {
        if (paused && !editorMode) {
            const [x, y] = [Math.floor(clientX * mult), Math.floor(clientY * mult)]
            if (x > 780 && x < 1100) {
                if (y > 320 - 84 && y < 320) {
                    paused = false
                } else if (y > cvs.height / 2 - 62 && y < cvs.height / 2 + 32) {
                    paused = false
                    gameOver(false, true)
                    if (isDemoing) {
                        isDemoing = false
                        editorMode = true
                        camX = (currentPage - 1) * gridWidth * tilesize
                    }
                } else if (y > cvs.height - 320 - 84 && y < cvs.height - 320) {
                    paused = false
                    if (isDemoing) {
                        gameOver(false, true)
                        isDemoing = false
                        state = 1
                    } else {
                        state = 4
                    }
                }
            }
        }
        if (!editorMode) {return}
        const [x, y] = [Math.floor((clientX * mult + camX) / tilesize), Math.floor(clientY * mult / tilesize)]
        const [tx, ty] = [Math.floor(clientX * mult), Math.floor(clientY * mult)]
        const tile = grid[x][y]
        const h = isTabOpen ? 160 : 0
        if (isTabOpen) {
            const ts = 100
            for (let i = 0; i < brushes.length; i++) {
                const [rx, ry] = [120 + i * (ts + 30), cvs.height - ts - 35]
                if (tx > rx && ty > ry && tx < rx + ts && ty < ry + ts) {
                    if (currentBrush == i) {
                        currentBrush = null
                    } else {
                        currentBrush = i
                    }
                }
            }
            if (tx > 20 && tx < 90 && ty > cvs.height - 120 && ty < cvs.height - 40) {
                if (currentPage > 1) {
                    currentPage--
                    camX = (currentPage - 1) * gridWidth * tilesize
                }
            }
            if (tx > cvs.width - 90 && tx < cvs.width - 20 && ty > cvs.height - 120 && ty < cvs.height - 40) {
                if (currentPage == maxPage) {
                    maxPage++
                    const start = levelSize
                    levelSize = maxPage * gridWidth
                    for (let i = start; i < levelSize; i++) {
                        grid[i] = []
                    }
                    for (let h = 0; h < gridHeight; h++) {
                        for (let w = start; w < levelSize; w++) {
                            new Tile(w, h)
                        }
                    }
                }
                currentPage++
                camX = (currentPage - 1) * gridWidth * tilesize
            }
        }
        if (ty > cvs.height - 55 - h && ty < cvs.height - h && tx > 100 && tx < 240) {
            isTabOpen = !isTabOpen
        } else if (ty < 80 && tx > cvs.width - 740) {
            if (tx > cvs.width - 740 && tx < cvs.width - 580) {
                editorMode = false
                isDemoing = true
                currentBrush = null
                isTabOpen = false
            } else if (tx > cvs.width - 580 && tx < cvs.width - 460) {
                if (dirty) {
                    const level = getLevelData()
                    localStorage.removeItem("savedData")
                    localStorage.setItem("savedData", JSON.stringify(level))
                }
                dirty = false
            } else if (tx > cvs.width - 460 && tx < cvs.width - 340) {
                const data = JSON.parse(localStorage.getItem("savedData"))
                if (!data) {return}
                const m = "Are you sure you want to load your saved level? This will replace the current level!"
                if (!confirm(m)) {return}
                camX = 0
                loadLevel(data)
                currentPage = 1
                maxPage = data.size / gridWidth
                dirty = false
            } else if (tx > cvs.width - 340 && tx < cvs.width - 180) {
                navigator.clipboard.writeText(JSON.stringify(getLevelData()))
                alert("Copied!")
            } else {
                let level = prompt("Input valid level data:")
                if (level) {
                    level = JSON.parse(level)
                    camX = 0
                    loadLevel(level)
                    currentPage = 1
                    maxPage = level.size / gridWidth
                }
            }
        } else if (ty < 60 && tx < 170) {
            let p = prompt("Jump to page:")
            if (p == null) {return}
            p = +p
            if (isNaN(p) || p > maxPage || p < 1) {
                alert("Invalid Page!")
                return
            }
            currentPage = p
            camX = (currentPage - 1) * gridWidth * tilesize
        } else if (ty < cvs.height - h) {
            if (currentBrush != null) {
                tile.type = brushes[currentBrush]
                dirty = true
            }
        }
    } else if (state == 3) {
        if (timer) {return}
        const [x, y] = [Math.floor(clientX * mult), Math.floor(clientY * mult)]
        const height = cvs.height / 2 + 260
        if (y > height - 76 && y < height) {
            if (x > cvs.width / 3.45 - 100 && x < cvs.width / 3.45 + 100) {
                state = 4
            } else if (x > cvs.width / 2 - 120 && x < cvs.width / 2 + 120) {
                gameOver(false, true)
                state = 2
            } else if (x > cvs.width / 1.35 - 100 && x < cvs.width / 1.35 + 100) {
                if (typeof levels[level + 1] === "undefined") {return}
                level++
                loadLevel()
                gameOver(false, true)
                state = 2
            }
        }
    } else if (state == 4) {
        const [x, y] = [Math.floor(clientX * mult), Math.floor(clientY * mult)]
        if (y > cvs.height - 130 && y < cvs.height - 80 && x > cvs.width / 2 - 80 && x < cvs.width / 2 + 80) {
            gameOver(false, true)
            state = 1
        }
        for (let i = 0; i < 5; i++) {
            if (y > 260 && y < 410) {
                if (x > 540 + i * 180 && x < 690 + i * 180) {
                    const l = i + 1
                    if (l <= unlocked) {
                        level = l
                        gameOver(false, true)
                        loadLevel()
                        state = 2
                    }
                }
            }
        }
    } else if (state == 5) {
        const [x, y] = [Math.floor(clientX * mult), Math.floor(clientY * mult)]
        if (y > cvs.height - 130 && y < cvs.height - 80 && x > cvs.width / 2 - 80 && x < cvs.width / 2 + 80) {
            gameOver(false, true)
            state = 1
            selectedAchievement = null
        }
        for (let i = 0; i < achievements.length; i++) {
            if (y > 250 && y < 400 && x > 360 + i * 180 && x < 510 + i * 180) {
                if (selectedAchievement == i) {
                    selectedAchievement = null
                    return
                }
                selectedAchievement = i
            }
        }
    }
})

$(cvs).on("mousemove touchmove", e => {
    if (!editorMode || !isDown) {return}
    const [tx, ty] = getClickPosition(e)
    const rect = cvs.getBoundingClientRect()
    const mult = cvs.width / rect.width
    const [x, y] = [Math.floor((tx * mult + camX) / tilesize), Math.floor(ty * mult / tilesize)]
    const tile = grid[x][y]
    const h = isTabOpen ? 160 : 0
    if (ty < cvs.height - h) {
        if (currentBrush != null) {
            tile.type = brushes[currentBrush]
            dirty = true
        }
    }
})

doc.on(isTouchScreen() ? "touchstart keydown" : "mousedown keydown", e => {
    if (state > 2) {return}
    if (e.type.includes("key")) {
        if (e.key == " " || e.key == "ArrowUp") {isDown = true}
    } else {
        const [tx, ty] = getClickPosition(e)
        const rect = cvs.getBoundingClientRect()
        const mult = cvs.width / rect.width
        const [x, y] = [Math.floor(tx * mult / tilesize), Math.floor(ty * mult / tilesize)]
        isTouchScreen
        if (!editorMode && x == 0 && y == 0) {
            paused = !paused
            return
        }
        isDown = true
    }
    if (state != 2 || editorMode) {return}
    const tiles = p.getNearbyTiles()
    for (let t of tiles) {
        if (t.type == "jump-star" && !t.cooldown) {
            if (t.collidesWithPlayer()) {
                p.jump()
                break
            }
        }
    }
})

doc.on("mouseup touchend keyup", e => {
    if (e.type.includes("key")) {
        if (e.key == " " || e.key == "ArrowUp") {isDown = false}
    } else {
        isDown = false
    }
})

doc.on("keydown", e => {
    if (state == 2 && (e.key == "p" || e.key == "Escape")) {
        paused = !paused
    }
})

addEventListener("blur", function(e) {
    if (state == 2 && !editorMode) {
        paused = true
    }
})

onbeforeunload = function(e) {
    if (editorMode && dirty) {
        e.preventDefault()
        return "Are you sure you want to leave? Your level might not be saved!"
    }
}

setInterval(update, 1000 / fps)
update()

export {cvs, ctx}
