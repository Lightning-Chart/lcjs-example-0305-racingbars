/*
 * COVID-19 Bar chart race on LightningChartJS.
 */

// Import LightningChartJS
const lcjs = require('@arction/lcjs')

// Extract required parts from LightningChartJS.
const {
    lightningChart,
    SolidFill,
    ColorHEX,
    AnimationEasings,
    Animator,
    UIOrigins,
    UILayoutBuilders,
    AxisTickStrategies,
    UIElementBuilders,
    AxisScrollStrategies,
    emptyLine,
    emptyFill,
    Themes
} = lcjs

const ls = lightningChart()

// Variables used in the example
const rectThickness = 1
const rectGap = 0.5
const bars = []
const duration = 400 // duration of timer and animation

let y = 0
let initday = 15
// 2 days ago. the final day of the race
let yesterday = new Date(new Date().getFullYear(),new Date().getMonth() , new Date().getDate() - 2).toISOString() // ((d) => { d.setDate(d.getDate() - 2); return d })(new Date)
let connectionError = '' 

const barChart = options => {
    // Create a XY chart and add a RectSeries to it for rendering rectangles.
    const chart = ls.ChartXY(options)
        // Use Chart's title to track date
        .setTitle('COVID-19 cases ' + new Date(2020, 2, 15).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }))
        // Disable AutoCursor (hide information of bar by hover the mouse over it)
        .setAutoCursorMode(0)
        // Add padding to Chart's right side
        .setPadding({ right: 40 })
        .setMouseInteractions(false);

    // Cache X axis
    const axisX = chart.getDefaultAxisX()
        // Disable the scrolling animation for the X Axis, so it doesn't interfere.
        .setAnimationScroll(false)
        .setMouseInteractions(false);

    // Cache Y axis 
    const axisY = chart.getDefaultAxisY()
        // Hide default ticks
        .setTickStrategy(AxisTickStrategies.Empty)
        // Disable Mouse interactions for the Y Axis
        .setMouseInteractions(false)

    // Set custom label for Y-axis
    const createTickLabel = (entry, y) => {
        return axisY.addCustomTick(UIElementBuilders.AxisTick)
            .setValue(y + rectGap)
            .setGridStrokeLength(0)
            .setTextFormatter(_ => entry.country)
            .setMarker((marker) => marker
                .setTextFillStyle(new SolidFill({ color: ColorHEX('#aaaf') }))
                .setTextFont(fontSettings => fontSettings.setSize(17))
            )
    }

    // Function returns single bar with property of dimensions, data(entry) and label
    const addCountryHandler = entry => {
        const rectDimensions = {
            x: 0,
            y: y,
            width: entry.value,
            height: rectThickness
        }

        // Each country has its own rectangle series for different style.
        const rectSeries = chart.addRectangleSeries()
        const rect = rectSeries.add(rectDimensions)

        // Add TextBox element to the bar
        const label = chart.addUIElement(
            UILayoutBuilders.TextBox,
            { x: axisX, y: axisY }
        )
            .setOrigin(UIOrigins.LeftBottom)
            .setPosition({
                x: entry.value,
                y: y
            })
            .setText(entry.value.toLocaleString())
            .setTextFont(fontSettings => fontSettings.setSize(15))
            .setPadding(10)
            .setBackground((background) => background
                .setFillStyle(emptyFill)
                .setStrokeStyle(emptyLine)
            )

        // Set label title and position
        const tick = createTickLabel(entry, y)

        // Set interval for Y axis
        axisY.setInterval(-rectThickness, y)

        // Increase value of Y variable 
        y += rectThickness

        // Return figure
        return {
            entry,
            rect,
            label,
            tick,
        }
    }

    // Loop for adding bars
    const addCountries = (entries) => {
        axisX
            .setMouseInteractions(false) // Cache Y axis
            .setTickStrategy(
                AxisTickStrategies.Numeric,
                (tickStrategy) => tickStrategy
                    //   .setMinorTickStyle((tickStyle) => tickStyle.setTickPadding(3, 20))
                    .setFormattingFunction(timeScaled => {
                        if (timeScaled / 1000 >= 1000) {
                            return timeScaled / 1000000 + 'M'
                        }
                        return timeScaled / 1000 + 'K'
                    }
                    )
            )
        for (const entry of entries) {
            bars.push(addCountryHandler(entry))
        }
    }

    // Sorting and splicing array of data
    const sortCountries = (data, raceDay) => {

        let myday = (raceDay.getMonth() + 1) + '/' + raceDay.getDate() + '/' + raceDay.getFullYear().toString().substr(-2)
        const countries = { ...data }

        // Map list of countries and sort them in the order (First sort by value, then by country)
        const countryList = Object.values(countries).map((c) => (
            { country: c.country, value: c.history[myday] }
        )).sort((a, b) => (a.value > b.value) ? 1 : (a.value === b.value) ? ((a.country > b.country) ? 1 : -1) : -1)

        // Keep only top 20 countries
        countryList.splice(0, countryList.length - 20)

        return countryList
    }

    // Loop for re-rendering list of data
    const startRace = (data) => {

        // Inital day of race
        let raceDay = new Date(2020, 2, initday)

        // Set title of chart 
        chart.setTitle(connectionError + ' COVID-19 cases ' + raceDay.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }))

        // Get sorting data
        const sortedCountries = sortCountries(data, raceDay)

        // Check if the functions(startRace) has already done first pass
        if (bars.length > 0) {
            for (let i = 0; i < sortedCountries.length; i++) {

                // Prevent automatic scrolling of Y axis
                axisY.setScrollStrategy(AxisScrollStrategies.progressive)

                // Get index of each bar before sorting
                const initY = bars.map((e) => (e.entry.country)).indexOf(sortedCountries[i].country);

                // Get index of each bar after sorting
                const finalY = sortedCountries.map((e) => (e.country)).indexOf(sortedCountries[i].country);

                // Get Dimensions, Position And Size of bar[i]
                const rectDimensions = bars[i].rect.getDimensionsPositionAndSize()

                // Animation of changing the position of bar[i] by Y axis
                bars[i].animator = Animator(() => { undefined }) // function that executes after animation 
                    // Time for animation and easing type
                    (duration, AnimationEasings.linear)
                    // functions gets 2 arrays of 2 values (range) - initY (prev Y pos) and finalY.y(new Y pos) and rectDimensions.width, sortedCountries[i].value - prev and next width of each bar 
                    // and creates loop with increasing intermediate value (newPos, newWidth)
                    ([[initY, finalY], [rectDimensions.width, sortedCountries[i].value]], ([animatedYPosition, animatedValue]) => {
                        // Reset values 
                        bars[i].entry.country = sortedCountries[i].country
                        // Animate x and y positions
                        bars[i].rect.setDimensions({
                            x: 0,
                            y: animatedYPosition,
                            width: animatedValue,
                            height: 0.98
                        })
                            .restore()

                        // Animate labels
                        bars[i].label
                            // The topmost country's label should be inside the bar, the others should be to the right of the bar.
                            .setOrigin(i !== bars.length - 1 ? UIOrigins.LeftCenter : UIOrigins.RightCenter)
                            // Position the label
                            .setPosition({
                                x: animatedValue,
                                y: animatedYPosition > 0 ? (animatedYPosition + rectGap) : rectGap
                            })
                            .setText(Math.round(animatedValue).toLocaleString())
                            .setPadding(10, 0, 10, 0)
                            // Disable mouse interactions for the label
                            .setMouseInteractions(false)
                        // update tick position
                        bars[i].tick.setValue(animatedYPosition + rectGap)
                    })
            }

        } else {
            // If function executes for the first time, add countries to the Chart.
            addCountries(sortedCountries)
        }

        // we've bot reached the last day (i.e. yesterday) execute the function again and increase the day
        if (raceDay.toISOString() !== yesterday) {
            initday++
            setTimeout(() => startRace(data), duration)
        }
    }

    // function is used for showing errors on line 328
    const setTitle = (msg) => {
        chart.setTitle(msg)
    }

    return {
        addCountries,
        startRace,
        setTitle
    }

}

const startRaceHandler = (chart) => {

    // Fetch all countries and history of cases
    fetch('https://www.arction.com/lightningchart-js-interactive-examples/data/covid/confirmed.json')
        .then(res => res.json())
        .then(data => {

            const dat = [...data.locations]

            // After fetching and merging data create bars
            chart.startRace(mergeData(dat))
        })
        .catch(err => {
            yesterday = '2020-05-30T21:00:00.000Z'
            connectionError = 'Example of data'
            chart.startRace(mergeData(fallbackData))
        })

    // Some countries are divided by region and it is needed to megre them
    const mergeData = data => {
        const result = []
        // Return only specific information 
        data.forEach(basket => {

            let ob = {
                country: basket['country'],
                history: { ...basket['history'] }
            }

            // Check if array already contains the country
            let has = false
            result.find(obj => obj.country == ob.country
                ? has = true
                : has = false
            )

            // Unite object values
            const sum = (obj, newObj) => {
                Object.keys(obj).map(date => (
                    obj[date] += newObj[date]
                ))
            }

            // Format the data
            if (has) {
                result.find(obj => (
                    obj.country == ob.country
                    && sum(obj.history, ob.history))
                )
            } else {
                result.push(ob)
            }
        });

        return result;
    };
}

// Create chart
const newchart = barChart({
    // theme: Themes.light
})

// Start fetching
startRaceHandler(newchart)


//fallback data 
const fallbackData = [
    {
        country: 'US',
        history: {
            '3/15/20': 3212,
            '3/16/20': 4679,
            '3/17/20': 6512,
            '3/18/20': 9169,
            '3/19/20': 13663,
            '3/20/20': 20030,
            '3/21/20': 26025,
            '3/22/20': 34855,
            '3/23/20': 46086,
            '3/24/20': 56698,
            '3/25/20': 68773,
            '3/26/20': 86613,
            '3/27/20': 105293,
            '3/28/20': 124900,
            '3/29/20': 143779,
            '3/30/20': 165861,
            '3/31/20': 192177,
            '4/1/20': 224418,
            '4/2/20': 256636,
            '4/3/20': 288906,
            '4/4/20': 321318,
            '4/5/20': 351203,
            '4/6/20': 382613,
            '4/7/20': 413382,
            '4/8/20': 444580,
            '4/9/20': 480534,
            '4/10/20': 514942,
            '4/11/20': 544119,
            '4/12/20': 571400,
            '4/13/20': 598310,
            '4/14/20': 627082,
            '4/15/20': 652513,
            '4/16/20': 682548,
            '4/17/20': 715267,
            '4/18/20': 743223,
            '4/19/20': 769416,
            '4/20/20': 799212,
            '4/21/20': 825046,
            '4/22/20': 853818,
            '4/23/20': 887386,
            '4/24/20': 919658,
            '4/25/20': 950100,
            '4/26/20': 976680,
            '4/27/20': 1000298,
            '4/28/20': 1024746,
            '4/29/20': 1051136,
            '4/30/20': 1080303,
            '5/1/20': 1115219,
            '5/2/20': 1142639,
            '5/3/20': 1167095,
            '5/4/20': 1191071,
            '5/5/20': 1215543,
            '5/6/20': 1240053,
            '5/7/20': 1267418,
            '5/8/20': 1294224,
            '5/9/20': 1319414,
            '5/10/20': 1338381,
            '5/11/20': 1357566,
            '5/12/20': 1380423,
            '5/13/20': 1400812,
            '5/14/20': 1427725,
            '5/15/20': 1452425,
            '5/16/20': 1476586,
            '5/17/20': 1495068,
            '5/18/20': 1517302,
            '5/19/20': 1538241,
            '5/20/20': 1560975,
            '5/21/20': 1586662,
            '5/22/20': 1610252,
            '5/23/20': 1631496,
            '5/24/20': 1651676,
            '5/25/20': 1670442,
            '5/26/20': 1689948,
            '5/27/20': 1708342,
            '5/28/20': 1730551,
            '5/29/20': 1755010,
            '5/30/20': 1778689,
            '5/31/20': 1797763,
        }
    },
    {
        country: 'Russia',
        history: {
            '3/15/20': 63,
            '3/16/20': 90,
            '3/17/20': 114,
            '3/18/20': 147,
            '3/19/20': 199,
            '3/20/20': 253,
            '3/21/20': 306,
            '3/22/20': 367,
            '3/23/20': 438,
            '3/24/20': 495,
            '3/25/20': 658,
            '3/26/20': 840,
            '3/27/20': 1036,
            '3/28/20': 1264,
            '3/29/20': 1534,
            '3/30/20': 1836,
            '3/31/20': 2337,
            '4/1/20': 2777,
            '4/2/20': 3548,
            '4/3/20': 4149,
            '4/4/20': 4731,
            '4/5/20': 5389,
            '4/6/20': 6343,
            '4/7/20': 7497,
            '4/8/20': 8672,
            '4/9/20': 10131,
            '4/10/20': 11917,
            '4/11/20': 13584,
            '4/12/20': 15770,
            '4/13/20': 18328,
            '4/14/20': 21102,
            '4/15/20': 24490,
            '4/16/20': 27938,
            '4/17/20': 32008,
            '4/18/20': 36793,
            '4/19/20': 42853,
            '4/20/20': 47121,
            '4/21/20': 52763,
            '4/22/20': 57999,
            '4/23/20': 62773,
            '4/24/20': 68622,
            '4/25/20': 74588,
            '4/26/20': 80949,
            '4/27/20': 87147,
            '4/28/20': 93558,
            '4/29/20': 99399,
            '4/30/20': 106498,
            '5/1/20': 114431,
            '5/2/20': 124054,
            '5/3/20': 134687,
            '5/4/20': 145268,
            '5/5/20': 155370,
            '5/6/20': 165929,
            '5/7/20': 177160,
            '5/8/20': 187859,
            '5/9/20': 198676,
            '5/10/20': 209688,
            '5/11/20': 221344,
            '5/12/20': 232243,
            '5/13/20': 242271,
            '5/14/20': 252245,
            '5/15/20': 262843,
            '5/16/20': 272043,
            '5/17/20': 281752,
            '5/18/20': 290678,
            '5/19/20': 299941,
            '5/20/20': 308705,
            '5/21/20': 317554,
            '5/22/20': 326448,
            '5/23/20': 335882,
            '5/24/20': 344481,
            '5/25/20': 353427,
            '5/26/20': 362342,
            '5/27/20': 370680,
            '5/28/20': 379051,
            '5/29/20': 387623,
            '5/30/20': 396575,
            '5/31/20': 405843
        }
    },
    {
        country: 'Spain',
        history: {
            '3/15/20': 7798,
            '3/16/20': 9942,
            '3/17/20': 11748,
            '3/18/20': 13910,
            '3/19/20': 17963,
            '3/20/20': 20410,
            '3/21/20': 25374,
            '3/22/20': 28768,
            '3/23/20': 35136,
            '3/24/20': 39885,
            '3/25/20': 49515,
            '3/26/20': 57786,
            '3/27/20': 65719,
            '3/28/20': 73235,
            '3/29/20': 80110,
            '3/30/20': 87956,
            '3/31/20': 95923,
            '4/1/20': 104118,
            '4/2/20': 112065,
            '4/3/20': 119199,
            '4/4/20': 126168,
            '4/5/20': 131646,
            '4/6/20': 136675,
            '4/7/20': 141942,
            '4/8/20': 148220,
            '4/9/20': 153222,
            '4/10/20': 158273,
            '4/11/20': 163027,
            '4/12/20': 166831,
            '4/13/20': 170099,
            '4/14/20': 172541,
            '4/15/20': 177644,
            '4/16/20': 184948,
            '4/17/20': 190839,
            '4/18/20': 191726,
            '4/19/20': 198674,
            '4/20/20': 200210,
            '4/21/20': 204178,
            '4/22/20': 208389,
            '4/23/20': 213024,
            '4/24/20': 202990,
            '4/25/20': 205905,
            '4/26/20': 207634,
            '4/27/20': 209465,
            '4/28/20': 210773,
            '4/29/20': 212917,
            '4/30/20': 213435,
            '5/1/20': 215216,
            '5/2/20': 216582,
            '5/3/20': 217466,
            '5/4/20': 218011,
            '5/5/20': 219329,
            '5/6/20': 220325,
            '5/7/20': 221447,
            '5/8/20': 222857,
            '5/9/20': 223578,
            '5/10/20': 224350,
            '5/11/20': 227436,
            '5/12/20': 228030,
            '5/13/20': 228691,
            '5/14/20': 229540,
            '5/15/20': 230183,
            '5/16/20': 230698,
            '5/17/20': 230698,
            '5/18/20': 231606,
            '5/19/20': 232037,
            '5/20/20': 232555,
            '5/21/20': 233037,
            '5/22/20': 234824,
            '5/23/20': 235290,
            '5/24/20': 235772,
            '5/25/20': 235400,
            '5/26/20': 236259,
            '5/27/20': 236259,
            '5/28/20': 237906,
            '5/29/20': 238564,
            '5/30/20': 239228,
            '5/31/20': 239479
        }
    },
    {
        country: 'Turkey',
        history: {
            '3/15/20': 6,
            '3/16/20': 18,
            '3/17/20': 47,
            '3/18/20': 98,
            '3/19/20': 192,
            '3/20/20': 359,
            '3/21/20': 670,
            '3/22/20': 1236,
            '3/23/20': 1529,
            '3/24/20': 1872,
            '3/25/20': 2433,
            '3/26/20': 3629,
            '3/27/20': 5698,
            '3/28/20': 7402,
            '3/29/20': 9217,
            '3/30/20': 10827,
            '3/31/20': 13531,
            '4/1/20': 15679,
            '4/2/20': 18135,
            '4/3/20': 20921,
            '4/4/20': 23934,
            '4/5/20': 27069,
            '4/6/20': 30217,
            '4/7/20': 34109,
            '4/8/20': 38226,
            '4/9/20': 42282,
            '4/10/20': 47029,
            '4/11/20': 52167,
            '4/12/20': 56956,
            '4/13/20': 61049,
            '4/14/20': 65111,
            '4/15/20': 69392,
            '4/16/20': 74193,
            '4/17/20': 78546,
            '4/18/20': 82329,
            '4/19/20': 86306,
            '4/20/20': 90980,
            '4/21/20': 95591,
            '4/22/20': 98674,
            '4/23/20': 101790,
            '4/24/20': 104912,
            '4/25/20': 107773,
            '4/26/20': 110130,
            '4/27/20': 112261,
            '4/28/20': 114653,
            '4/29/20': 117589,
            '4/30/20': 120204,
            '5/1/20': 122392,
            '5/2/20': 124375,
            '5/3/20': 126045,
            '5/4/20': 127659,
            '5/5/20': 129491,
            '5/6/20': 131744,
            '5/7/20': 133721,
            '5/8/20': 135569,
            '5/9/20': 137115,
            '5/10/20': 138657,
            '5/11/20': 139771,
            '5/12/20': 141475,
            '5/13/20': 143114,
            '5/14/20': 144749,
            '5/15/20': 146457,
            '5/16/20': 148067,
            '5/17/20': 149435,
            '5/18/20': 150593,
            '5/19/20': 151615,
            '5/20/20': 152587,
            '5/21/20': 153548,
            '5/22/20': 154500,
            '5/23/20': 155686,
            '5/24/20': 156827,
            '5/25/20': 157814,
            '5/26/20': 158762,
            '5/27/20': 159797,
            '5/28/20': 160979,
            '5/29/20': 162120,
            '5/30/20': 163103,
            '5/31/20': 163942,
        }
    },
    {
        country: 'Germany',
        history: {
            '3/15/20': 5795,
            '3/16/20': 7272,
            '3/17/20': 9257,
            '3/18/20': 12327,
            '3/19/20': 15320,
            '3/20/20': 19848,
            '3/21/20': 22213,
            '3/22/20': 24873,
            '3/23/20': 29056,
            '3/24/20': 32986,
            '3/25/20': 37323,
            '3/26/20': 43938,
            '3/27/20': 50871,
            '3/28/20': 57695,
            '3/29/20': 62095,
            '3/30/20': 66885,
            '3/31/20': 71808,
            '4/1/20': 77872,
            '4/2/20': 84794,
            '4/3/20': 91159,
            '4/4/20': 96092,
            '4/5/20': 100123,
            '4/6/20': 103374,
            '4/7/20': 107663,
            '4/8/20': 113296,
            '4/9/20': 118181,
            '4/10/20': 122171,
            '4/11/20': 124908,
            '4/12/20': 127854,
            '4/13/20': 130072,
            '4/14/20': 131359,
            '4/15/20': 134753,
            '4/16/20': 137698,
            '4/17/20': 141397,
            '4/18/20': 143342,
            '4/19/20': 145184,
            '4/20/20': 147065,
            '4/21/20': 148291,
            '4/22/20': 150648,
            '4/23/20': 153129,
            '4/24/20': 154999,
            '4/25/20': 156513,
            '4/26/20': 157770,
            '4/27/20': 158758,
            '4/28/20': 159912,
            '4/29/20': 161539,
            '4/30/20': 163009,
            '5/1/20': 164077,
            '5/2/20': 164967,
            '5/3/20': 165664,
            '5/4/20': 166152,
            '5/5/20': 167007,
            '5/6/20': 168162,
            '5/7/20': 169430,
            '5/8/20': 170588,
            '5/9/20': 171324,
            '5/10/20': 171879,
            '5/11/20': 172576,
            '5/12/20': 173171,
            '5/13/20': 174098,
            '5/14/20': 174478,
            '5/15/20': 175233,
            '5/16/20': 175752,
            '5/17/20': 176369,
            '5/18/20': 176551,
            '5/19/20': 177778,
            '5/20/20': 178473,
            '5/21/20': 179021,
            '5/22/20': 179710,
            '5/23/20': 179986,
            '5/24/20': 180328,
            '5/25/20': 180600,
            '5/26/20': 181200,
            '5/27/20': 181524,
            '5/28/20': 182196,
            '5/29/20': 182922,
            '5/30/20': 183189,
            '5/31/20': 183410,
        }
    },
    {
        country: 'Brazil',
        history: {
            '3/15/20': 162,
            '3/16/20': 200,
            '3/17/20': 321,
            '3/18/20': 372,
            '3/19/20': 621,
            '3/20/20': 793,
            '3/21/20': 1021,
            '3/22/20': 1546,
            '3/23/20': 1924,
            '3/24/20': 2247,
            '3/25/20': 2554,
            '3/26/20': 2985,
            '3/27/20': 3417,
            '3/28/20': 3904,
            '3/29/20': 4256,
            '3/30/20': 4579,
            '3/31/20': 5717,
            '4/1/20': 6836,
            '4/2/20': 8044,
            '4/3/20': 9056,
            '4/4/20': 10360,
            '4/5/20': 11130,
            '4/6/20': 12161,
            '4/7/20': 14034,
            '4/8/20': 16170,
            '4/9/20': 18092,
            '4/10/20': 19638,
            '4/11/20': 20727,
            '4/12/20': 22192,
            '4/13/20': 23430,
            '4/14/20': 25262,
            '4/15/20': 28320,
            '4/16/20': 30425,
            '4/17/20': 33682,
            '4/18/20': 36658,
            '4/19/20': 38654,
            '4/20/20': 40743,
            '4/21/20': 43079,
            '4/22/20': 45757,
            '4/23/20': 50036,
            '4/24/20': 54043,
            '4/25/20': 59324,
            '4/26/20': 63100,
            '4/27/20': 67446,
            '4/28/20': 73235,
            '4/29/20': 79685,
            '4/30/20': 87187,
            '5/1/20': 92202,
            '5/2/20': 97100,
            '5/3/20': 101826,
            '5/4/20': 108620,
            '5/5/20': 115455,
            '5/6/20': 126611,
            '5/7/20': 135773,
            '5/8/20': 146894,
            '5/9/20': 156061,
            '5/10/20': 162699,
            '5/11/20': 169594,
            '5/12/20': 178214,
            '5/13/20': 190137,
            '5/14/20': 203165,
            '5/15/20': 220291,
            '5/16/20': 233511,
            '5/17/20': 241080,
            '5/18/20': 255368,
            '5/19/20': 271885,
            '5/20/20': 291579,
            '5/21/20': 310087,
            '5/22/20': 330890,
            '5/23/20': 347398,
            '5/24/20': 363211,
            '5/25/20': 374898,
            '5/26/20': 391222,
            '5/27/20': 411821,
            '5/28/20': 438238,
            '5/29/20': 465166,
            '5/30/20': 498440,
            '5/31/20': 514849,
        }
    },
    {
        country: 'Italy',
        history: {
            '3/15/20': 24747,
            '3/16/20': 27980,
            '3/17/20': 31506,
            '3/18/20': 35713,
            '3/19/20': 41035,
            '3/20/20': 47021,
            '3/21/20': 53578,
            '3/22/20': 59138,
            '3/23/20': 63927,
            '3/24/20': 69176,
            '3/25/20': 74386,
            '3/26/20': 80589,
            '3/27/20': 86498,
            '3/28/20': 92472,
            '3/29/20': 97689,
            '3/30/20': 101739,
            '3/31/20': 105792,
            '4/1/20': 110574,
            '4/2/20': 115242,
            '4/3/20': 119827,
            '4/4/20': 124632,
            '4/5/20': 128948,
            '4/6/20': 132547,
            '4/7/20': 135586,
            '4/8/20': 139422,
            '4/9/20': 143626,
            '4/10/20': 147577,
            '4/11/20': 152271,
            '4/12/20': 156363,
            '4/13/20': 159516,
            '4/14/20': 162488,
            '4/15/20': 165155,
            '4/16/20': 168941,
            '4/17/20': 172434,
            '4/18/20': 175925,
            '4/19/20': 178972,
            '4/20/20': 181228,
            '4/21/20': 183957,
            '4/22/20': 187327,
            '4/23/20': 189973,
            '4/24/20': 192994,
            '4/25/20': 195351,
            '4/26/20': 197675,
            '4/27/20': 199414,
            '4/28/20': 201505,
            '4/29/20': 203591,
            '4/30/20': 205463,
            '5/1/20': 207428,
            '5/2/20': 209328,
            '5/3/20': 210717,
            '5/4/20': 211938,
            '5/5/20': 213013,
            '5/6/20': 214457,
            '5/7/20': 215858,
            '5/8/20': 217185,
            '5/9/20': 218268,
            '5/10/20': 219070,
            "5/11/20": 219814,
            "5/12/20": 221216,
            "5/13/20": 222104,
            "5/14/20": 223096,
            "5/15/20": 223885,
            "5/16/20": 224760,
            "5/17/20": 225435,
            "5/18/20": 225886,
            "5/19/20": 226699,
            "5/20/20": 227364,
            "5/21/20": 228006,
            "5/22/20": 228658,
            "5/23/20": 229327,
            "5/24/20": 229858,
            "5/25/20": 230158,
            "5/26/20": 230555,
            "5/27/20": 231139,
            "5/28/20": 231732,
            "5/29/20": 232248,
            "5/30/20": 232664,
            "5/31/20": 232997
        }
    },
    {
        country: 'India',
        history: {
            '3/15/20': 113,
            '3/16/20': 119,
            '3/17/20': 142,
            '3/18/20': 156,
            '3/19/20': 194,
            '3/20/20': 244,
            '3/21/20': 330,
            '3/22/20': 396,
            '3/23/20': 499,
            '3/24/20': 536,
            '3/25/20': 657,
            '3/26/20': 727,
            '3/27/20': 887,
            '3/28/20': 987,
            '3/29/20': 1024,
            '3/30/20': 1251,
            '3/31/20': 1397,
            '4/1/20': 1998,
            '4/2/20': 2543,
            '4/3/20': 2567,
            '4/4/20': 3082,
            '4/5/20': 3588,
            '4/6/20': 4778,
            '4/7/20': 5311,
            '4/8/20': 5916,
            '4/9/20': 6725,
            '4/10/20': 7598,
            '4/11/20': 8446,
            '4/12/20': 9205,
            '4/13/20': 10453,
            '4/14/20': 11487,
            '4/15/20': 12322,
            '4/16/20': 13430,
            '4/17/20': 14352,
            '4/18/20': 15722,
            '4/19/20': 17615,
            '4/20/20': 18539,
            '4/21/20': 20080,
            '4/22/20': 21370,
            '4/23/20': 23077,
            '4/24/20': 24530,
            '4/25/20': 26283,
            '4/26/20': 27890,
            '4/27/20': 29451,
            '4/28/20': 31324,
            '4/29/20': 33062,
            '4/30/20': 34863,
            '5/1/20': 37257,
            '5/2/20': 39699,
            '5/3/20': 42505,
            '5/4/20': 46437,
            '5/5/20': 49400,
            '5/6/20': 52987,
            '5/7/20': 56351,
            '5/8/20': 59695,
            '5/9/20': 62808,
            '5/10/20': 67161,
            '5/11/20': 70768,
            '5/12/20': 74292,
            '5/13/20': 78055,
            '5/14/20': 81997,
            '5/15/20': 85784,
            '5/16/20': 90648,
            '5/17/20': 95698,
            '5/18/20': 100328,
            '5/19/20': 106475,
            '5/20/20': 112028,
            '5/21/20': 118226,
            '5/22/20': 124794,
            '5/23/20': 131423,
            '5/24/20': 138536,
            '5/25/20': 144950,
            '5/26/20': 150793,
            '5/27/20': 158086,
            '5/28/20': 165386,
            '5/29/20': 173491,
            '5/30/20': 181827,
            '5/31/20': 190609,
        }
    }
]