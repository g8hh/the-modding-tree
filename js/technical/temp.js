var tmp = {}
var temp = tmp // Proxy for tmp
var NaNalert = false;

// Tmp will not call these
var activeFunctions = [
	"startData", "onPrestige", "doReset", "update", "automate",
	"buy", "buyMax", "respec", "onComplete", "onPurchase", "onPress", "onClick", "masterButtonPress",
	"sellOne", "sellAll", "pay",
]

var noCall = doNotCallTheseFunctionsEveryTick
for (item in noCall) {
	activeFunctions.push(noCall[item])
}

// Add the names of classes to traverse
var traversableClasses = []

function setupTemp() {
	tmp = {}
	tmp.pointGen = {}
	tmp.displayThings = []

	setupTempData(layers, tmp)
	for (layer in layers){
		tmp[layer].resetGain = {}
		tmp[layer].nextAt = {}
		tmp[layer].nextAtDisp = {}
		tmp[layer].canReset = {}
		tmp[layer].notify = {}
		tmp[layer].prestigeNotify = {}
		tmp[layer].prestigeButtonText = {}
		tmp[layer].computedNodeStyle = []
		setupBarStyles(layer)
	}
	temp = tmp
}

function setupTempData(layerData, tmpData) {
	for (item in layerData){
		if (layerData[item] == null) {
			tmpData[item] = null
		}
		else if (layerData[item] instanceof Decimal)
			tmpData[item] = layerData[item]
		else if (Array.isArray(layerData[item])) {
			tmpData[item] = []
			setupTempData(layerData[item], tmpData[item])
		}
		else if ((!!layerData[item]) && (layerData[item].constructor === Object)) {
			tmpData[item] = {}
			setupTempData(layerData[item], tmpData[item])
		}
		else if ((!!layerData[item]) && (typeof layerData[item] === "object") && traversableClasses.includes(layerData[item].constructor.name)) {
			tmpData[item] = new layerData[item].constructor()
		}
		else if (isFunction(layerData[item]) && !activeFunctions.includes(item)){
			tmpData[item] = new Decimal(1) // The safest thing to put probably?
		} else {
			tmpData[item] = layerData[item]
		}
	}	
}

function updateTemp() {
	if (tmp === undefined)
		setupTemp()

	updateTempData(layers, tmp)

	for (layer in layers){
		tmp[layer].resetGain = getResetGain(layer)
		tmp[layer].nextAt = getNextAt(layer)
		tmp[layer].nextAtDisp = getNextAt(layer, true)
		tmp[layer].canReset = canReset(layer)
		tmp[layer].notify = shouldNotify(layer)
		tmp[layer].prestigeNotify = prestigeNotify(layer)
		tmp[layer].prestigeButtonText = prestigeButtonText(layer)
		constructBarStyles(layer)
		constructAchievementStyles(layer)
		constructNodeStyle(layer)
		updateChallengeDisplay(layer)

	}

	tmp.pointGen = getPointGen()
	tmp.displayThings = []
	for (thing in displayThings){
		let text = displayThings[thing]
		if (isFunction(text)) text = text()
		tmp.displayThings.push(text) 
	}

}

function updateTempData(layerData, tmpData) {
	
	for (item in layerData){
		if (Array.isArray(layerData[item])) {
			updateTempData(layerData[item], tmpData[item])
		}
		else if ((!!layerData[item]) && (layerData[item].constructor === Object) || (typeof layerData[item] === "object") && traversableClasses.includes(layerData[item].constructor.name)){
			updateTempData(layerData[item], tmpData[item])
		}
		else if (isFunction(layerData[item]) && !activeFunctions.includes(item)){
			let value = layerData[item]()
			if (value !== value || value === decimalNaN){
				if (NaNalert === true || confirm ("Invalid value found in tmp, named '" + item + "'. Please let the creator of this mod know! Would you like to try to auto-fix the save and keep going?")){
					NaNalert = true
					value = (value !== value ? 0 : decimalZero)
				}
				else {
					clearInterval(interval);
					player.autosave = false;
					NaNalert = true;
				}
			}


			Vue.set(tmpData, item, value)
		}
	}	
}

function updateChallengeTemp(layer)
{
	updateTempData(layers[layer].challenges, tmp[layer].challenges)
	updateChallengeDisplay(layer)
}

function updateChallengeDisplay(layer) {
	for (id in player[layer].challenges) {
		let style = "locked"
		if (player[layer].activeChallenge == id && canCompleteChallenge(layer, id)) style = "canComplete"
		else if (hasChallenge(layer, id)) style = "done"
		tmp[layer].challenges[id].defaultStyle = style

		tmp[layer].challenges[id].buttonText = (player[layer].activeChallenge==(id)?(canCompleteChallenge(layer, id)?"Finish":"Exit Early"):(hasChallenge(layer, id)?"Completed":"Start"))
	}

}

function updateBuyableTemp(layer)
{
	updateTempData(layers[layer].buyables, tmp[layer].buyables)
}

function updateClickableTemp(layer)
{
	updateTempData(layers[layer].clickables, tmp[layer].clickables)
}

function constructNodeStyle(layer){
	let style = []
	if ((tmp[layer].isLayer && layerunlocked(layer)) || (!tmp[layer].isLayer && tmp[layer].canClick))
		style.push({'background-color': tmp[layer].color})
	if (tmp[layer].image !== undefined)
		style.push({'background-image': 'url("' + tmp[layer].image + '")'})
	style.push(tmp[layer].nodeStyle)
	Vue.set(tmp[layer], 'computedNodeStyle', style)
}




function constructAchievementStyles(layer){
	for (id in tmp[layer].achievements) {
		ach = tmp[layer].achievements[id]
		if (isPlainObject(ach)) {
			let style = []
			if (ach.image){ 
				style.push({'background-image': 'url("' + ach.image + '")'})
			} 
			if (!ach.unlocked) style.push({'visibility': 'hidden'})
			style.push(ach.style)
			Vue.set(ach, 'computedStyle', style)
		}
	}
}

function constructBarStyles(layer){
	if (layers[layer].bars === undefined)
		return
	for (id in layers[layer].bars){
		if (id !== "layer") {
			let bar = tmp[layer].bars[id]
			if (bar.progress instanceof Decimal)
				bar.progress = bar.progress.toNumber()
			bar.progress = (1 -Math.min(Math.max(bar.progress, 0), 1)) * 100

			bar.dims = {'width': bar.width + "px", 'height': bar.height + "px"}
			let dir = bar.direction
			bar.fillDims = {'width': (bar.width + 0.5) + "px", 'height': (bar.height + 0.5)  + "px"}
			if (dir !== undefined)
			{
				bar.fillDims['clip-path'] = 'inset(0% 50% 0% 0%)'
				if(dir == UP){
					bar.fillDims['clip-path'] = 'inset(' + bar.progress + '% 0% 0% 0%)'
				}
				else if(dir == DOWN){
					bar.fillDims['clip-path'] = 'inset(0% 0% ' + bar.progress + '% 0%)'
				}
				else if(dir == RIGHT){
					bar.fillDims['clip-path'] = 'inset(0% ' + bar.progress + '% 0% 0%)'
				}
				else if(dir == LEFT){
					bar.fillDims['clip-path'] = 'inset(0% 0% 0% ' + bar.progress + '%)'
				}

			}
		}

	}
}

function setupBarStyles(layer){
	if (layers[layer].bars === undefined)
		return
	for (id in layers[layer].bars){
		let bar = tmp[layer].bars[id]
		bar.dims = {}
		bar.fillDims = {}
	}
}