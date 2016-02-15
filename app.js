// File: app.js
;(function() {

    // Data for graph
    var lineChartData = {
        labels : [],
        datasets : [
            {
                label: "Graph",
                fillColor : "rgba(230, 239, 245, 0.2)",
                strokeColor : "rgba(220, 220, 220, 1)",
                pointColor : "rgba(220, 220, 220, 1)",
                pointStrokeColor : "#fff",
                pointHighlightFill : "#fff",
                pointHighlightStroke : "rgba(220, 220, 220, 1)",
                data : []
            }
        ]
    };

    // Boolean used to stop stop the display of the graph if the InfoBox is closed while the graph is loading
    var showGraphBox = true;

    // Data for spinner
    var opts = {
        lines: 11 // The number of lines to draw
        , length: 28 // The length of each line
        , width: 14 // The line thickness
        , radius: 42 // The radius of the inner circle
        , scale: 1 // Scales overall size of the spinner
        , corners: 1 // Corner roundness (0..1)
        , color: '#000' // #rgb or #rrggbb or array of colors
        , opacity: 0.25 // Opacity of the lines
        , rotate: 0 // The rotation offset
        , direction: 1 // 1: clockwise, -1: counterclockwise
        , speed: 0.8 // Rounds per second
        , trail: 80 // Afterglow percentage
        , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
        , zIndex: 5 // The z-index (defaults to 2000000000)
        , className: 'spinner' // The CSS class to assign to the spinner
        , top: '170px' // Top position relative to parent
        , left: '50%' // Left position relative to parent
        , shadow: false // Whether to render a shadow
        , hwaccel: false // Whether to use hardware acceleration
        , position: 'absolute' // Element positioning
    };
    var target = document.getElementById('InfoBox');
    var spinner = new Spinner(opts);


    var mSensorDataURL = 'http://backup.evothings.com:8082/output/';
    //var mSensorDataURL = 'http://smartspaces.r1.kth.se:8082/output/';
    // Entire URL = mSensorDataURL + PUBLIC_KEY + '.json';

    // Original pixel size for the map.
    var mMapWidth = 1240;
    var mMapHeight = 726;

    // Map data.
    var mSensorCircleSize = 25;
    var mMapImage = null; // Created below
    var mCanvasScale; // Calculated below

    // Sensor data/objects.
    // Most recent data is stored in the field "data" which is
    // loaded using JSONP.
    var mSensors = {
        1: { "x": 420, "y": 220,
            "key":"BQa4EqqbgxfMgpBQ8XwNhvP82Dj",
            "image":"https://evothings.com/demos/dome_pics/IMG_1758.JPG",
            "data": null,
            "fullData": null
        },
        2: { "x": 600, "y": 300,
            "key":"J3Wgj9qegGFX4r9KlxxGfaeMXQB",
            "image":"https://evothings.com/demos/dome_pics/IMG_1759.JPG",
            "data": null,
            "fullData": null
        },
        3: { "x": 600, "y": 470,
            "key":"lB6p49pzXdFGQjpLwzzOTWj10rd",
            "image":"https://evothings.com/demos/dome_pics/IMG_1762.JPG",
            "data": null,
            "fullData": null
        },
        4: { "x": 330, "y": 530,
            "key":"LAjQ9E8PBOiOdzx3PggKIaWmMGA",
            "image":"https://evothings.com/demos/dome_pics/IMG_1760.JPG",
            "data": null,
            "fullData": null
        },
        5: { "x": 930, "y": 510,
            "key":"L4D98lO9ObtOdzx3PggKIaWmMGA",
            "image":"https://evothings.com/demos/dome_pics/IMG_1761.JPG",
            "data": null,
            "fullData": null
        },
        6: { "x": 800, "y": 220,
            "key":"BkPNOapq2WSMgpVlNQQKFYXPBWr",
            "image":"https://evothings.com/demos/dome_pics/IMG_1763.JPG",
            "data": null,
            "fullData": null

        }
    };

    // Public key is used as sensorID
    var mSelectedSensorID = null;
    var currentSensor;
    var currentSensorNumber;

    // Title height
    var titleHeight = 110;

    // Scroll values
    var pageScrollTop = null;
    var pageScrollLeft = null;

    // First function called
    function main() {
        // Setup the map canvas.
        setupCanvas();
        sizeCanvas();
        onResize(sizeCanvas);

        // Load data now and then every x seconds.
        loadData();
        setInterval(loadData, 60 * 1000)
    }

    // Setting scroll values onScroll
    window.onscroll = function() {setScrollValues()};

    function setScrollValues() {
        var page = document.documentElement;
        pageScrollTop = page.scrollTop || window.pageYOffset;
        pageScrollLeft = page.scrollLeft || window.pageXOffset;
    }

    // Setting canvas attributes
    function setupCanvas() {
        var canvas = $('#MapCanvas');
        canvas.attr('width', mMapWidth);
        canvas.attr('height', mMapHeight);

        mMapImage = new Image();
        mMapImage.src = 'dome_sketch3.png';
        mMapImage.onload = drawCanvas;

        // Click/tap on canvas.
        var hammer = new Hammer(canvas[0], {});
        hammer.on('tap', function(event) {
            handleTap(event.center.x, event.center.y);
            return false;
            //alert("tapped at " + event.center.x + "," + event.center.y);
        })
    }

    // Make the canvas fill the browser window.
    function sizeCanvas() {
        var ratio = mMapHeight / mMapWidth;
        var width = window.innerWidth;
        var height = width * ratio;
        var canvas = $('#MapCanvas');
        canvas.css('width', width + 'px');
        canvas.css('height', height + 'px');

        document.getElementById("Instructions").style.top = height + titleHeight - 8 + "px";

        // Save scale value for use with touch events.
        mCanvasScale = mMapWidth / width
    }

    // The timer is needed because the resize event is trigged
    // multiple times when rotating the device. The timer makes
    // the last even trigger within the delay.
    function onResize(callback) {
        var timer = null;
        $(window).resize(function(event) {
            timer && clearTimeout(timer);
            timer = setTimeout(function() {
                clearTimeout(timer);
                callback(event)
            }, 200)
        })
    }

    // Setting up the canvas
    function drawCanvas() {
        var canvas = $('#MapCanvas');
        var ctx = canvas.get(0).getContext('2d');

        // Draw the map image on canvas
        ctx.drawImage(mMapImage, 0, 0);

        // Draw multi-colored circle overlays.
        for (var i in mSensors) {
            var sensor = mSensors[i];
            var color = getSensorColor(sensor);
            var arrowColor = getArrowColor(sensor);
            drawCircle(ctx, sensor.x, sensor.y, mSensorCircleSize, color);
            drawArrow(ctx, sensor.x, sensor.y, arrowColor)
        }
    }

    // Drawing circles
    function drawCircle(ctx, x, y, size, color) {
        ctx.beginPath();
        // ctx.translate(0,0);
        if (x==600)
        {ctx.globalAlpha = 0.3}
        else
        {ctx.globalAlpha = 1}

        ctx.fillStyle = color;
        ctx.arc(x, y, size, 0, Math.PI*2, true);

        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'gray';
        ctx.stroke();
    }

    // Drawing arrows
    function drawArrow(ctx, x, y, color){

        ctx.beginPath();
        if (x==600) {ctx.globalAlpha = 0.3;}
        else {ctx.globalAlpha = 1;}

        ctx.translate(x,y-100);
        ctx.lineTo(22, 20);
        ctx.lineTo(45, 20);
        ctx.lineTo(48, 60);
        ctx.lineTo(60, 60);
        ctx.lineTo(35, 98);

        ctx.lineTo(5, 60);
        ctx.lineTo(18, 60);
        ctx.lineTo(22, 20);

        ctx.closePath();

        ctx.fillStyle = color;

        ctx.fill();
        ctx.strokeStyle = 'gray';
        ctx.stroke();

        ctx.translate(-x,-y+100);


    }

    // Selecting circle color
    function getSensorColor(sensor) {
        if (sensor.key == mSelectedSensorID) {
            return '#5555FF'; // Blue (selected)
        } else
        if (sensor && sensor.data){
            return '#00FF00'; // Green
        }
        else
        {
            return '#AAAAAA'; // Gray
        }
    }

    // selecting arrow color
    function getArrowColor(sensor) {
        if (sensor.key == mSelectedSensorID) {
            return '#5555FF'; // Blue (selected)
        } else
        if (sensor && sensor.data){
            return '#FFFF00'; // Yellow
        }
        else
        {
            return '#AAAAAA'; // Gray
        }
    }
    // Detect if tapping on sensor
    function handleTap(pageX, pageY) {
        var sensor = findSensorAtXY((pageX + pageScrollLeft) * mCanvasScale, (pageY + pageScrollTop - titleHeight) * mCanvasScale);
        if (sensor) {
            mSelectedSensorID = sensor.key;
            showSensorInfo(sensor);
            hideGraph();
        }
    }

    // Detect which sensor is at tap location
    function findSensorAtXY(x, y) {
        var minDelta = mSensorCircleSize / 2 + 40;
        for (var i in mSensors) {
            var sensor = mSensors[i];
            var dx = Math.abs(sensor.x - x);
            var dy = Math.abs(sensor.y - y);
            if (dx < minDelta && dy < minDelta) {
                currentSensorNumber = i;
                return sensor
            }
        }
        return null
    }

    // Showing sensor info box with html
    function showSensorInfo(sensor) {
        // Draw canvas with selected room highlighted.
        currentSensor = sensor;
        drawCanvas();
        var html;

        if (sensor && sensor.data) {
            // Display info.
            html =
                '<input id="close" type="image" src="close.png">'
                + '<h1>Sensor Data</h1>'
                + '<br /><div id="time">Time</div>  ' + fixTimeData(sensor.data.timestamp) + '<br />'
                + '<button id="lum" class="dataButton">Luminosity</button>  ' + sensor.data.l + ' lum<br />'
                + '<button id="hum" class="dataButton">Humidity</button>  ' + sensor.data.h + ' %<br />'
                + '<button id="temp" class="dataButton">Temperature</button>  ' + sensor.data.t + ' celcius<br />'
                + '<button id="press" class="dataButton">Pressure</button>  ' + sensor.data.p + ' Pascal<br />'
                + '<button id="co2" class="dataButton">CO2</button>  ' + sensor.data.c + ' ppm<br />'
                + '<img src="' + sensor.image + '" />'
        } else {
            html =
                '<input id="close" type="image" src="close.png">'
                + '<h1>Sensor Data</h1>'
                + '<br />Sorry, sensor data not available right now :(</br>'
                + '<img src="' + sensor.image + '" />'
        }

        showInfo(html);
    }

    function hideSensorInfo() {
        // Boolean used to stop stop the display of the graph if the InfoBox is closed while the graph is loading
        showGraphBox = false;
        var infoBox = $('#InfoBox');
        infoBox.hide();

        // Draw canvas with no room highlighted.
        drawCanvas();
        $('html, body').scrollTop(0);
    }



    function showInfo(html) {
        setTimeout(function() {$('#InfoBox').html(html).show();}, 20);

        setTimeout(function() {
            // Close button
            document.getElementById("close").onclick = function() {
                mSelectedSensorID = null;
                hideSensorInfo()
            };

            // Graphs
            document.getElementById("lum").onclick = function() {
                spinner.spin(target);
                document.getElementById("graphTitle").innerHTML = "Graph of luminosity (lum)";
                setGraphData(mSensors[currentSensorNumber], 1, showGraph)
            };
            document.getElementById("hum").onclick = function() {
                spinner.spin(target);
                document.getElementById("graphTitle").innerHTML = "Graph of humidity (%)";
                setGraphData(mSensors[currentSensorNumber], 2, showGraph)
            };
            document.getElementById("temp").onclick = function() {
                spinner.spin(target);
                document.getElementById("graphTitle").innerHTML = "Graph of temperature (°C)";
                setGraphData(mSensors[currentSensorNumber], 3, showGraph)
            };
            document.getElementById("press").onclick = function() {
                spinner.spin(target);
                document.getElementById("graphTitle").innerHTML = "Graph of pressure (Pascal)";
                setGraphData(mSensors[currentSensorNumber], 4, showGraph)
            };
            document.getElementById("co2").onclick = function() {
                spinner.spin(target);
                document.getElementById("graphTitle").innerHTML = "Graph of CO2 (ppm)";
                setGraphData(mSensors[currentSensorNumber], 5, showGraph)
            }
        }, 30);
    }


    function showGraph() {
        hideSensorInfo();
        $('#GraphBox').show();
        var ctx = document.getElementById("GraphCanvas").getContext("2d");
        window.myLine = new Chart(ctx).Line(lineChartData, {
            responsive: true,
            maintainAspectRatio: false,
            pointHitDetectionRadius: 2
        });
        document.getElementById('closeGraph').onclick = function () {
            hideGraph()
        };
        document.getElementById('GraphBox').scrollIntoView();
    }

    function hideGraph() {
        if (window.myLine) {
            window.myLine.destroy()
        }
        $('#GraphBox').hide();
        showSensorInfo(currentSensor);
        $('html, body').scrollTop(0);
    }

    function loadData() {
        for (var i in mSensors) {
            getJSON(mSensors[i])
        }
    }

    function fixTimeData(time) {
        var fixedTime = time.substring(11, 19);
        var hour = parseInt(fixedTime.substring(0, 2));
        var fixedHour = "";
        if (hour == 23) {
            fixedHour = "00";
        } else {
            fixedHour = hour + 1;
        }
        return fixedHour + fixedTime.substring(2);
    }



    function fixGraphData(dataArray) {
        var currentTime = dataArray[0].timestamp;
        var currentMinute = currentTime.substring(14, 16);
        var currentHour = "";
        for (var i = dataArray.length - 1; i >= 0; i--) {
            if (dataArray[i].timestamp.substring(14, 16) != (currentMinute) || currentHour == dataArray[i].timestamp.substring(11, 13)) {
                dataArray.splice(i, 1);
            } else {
                currentHour = dataArray[i].timestamp.substring(11, 13);
            }
        }
        return dataArray
    }


    // Creates an array of the sensor data according to the type of data set in parameter ("data")
    function sortGraphData(graphData, data, callback) {
        var valueList =  [];
        for (var i = graphData.length - 1; i >= 0; i--) {
            switch (data) {
                case 0:
                    valueList.push(fixTimeData(graphData[i].timestamp));
                    break;
                case 1:
                    valueList.push(graphData[i].l);
                    break;
                case 2:
                    valueList.push(graphData[i].h);
                    break;
                case 3:
                    valueList.push(graphData[i].t);
                    break;
                case 4:
                    valueList.push(graphData[i].p);
                    break;
                case 5:
                    valueList.push(graphData[i].c);
                    break;
            }
        }
        callback(valueList)
    }

    // Gets graph data through Cordova plugin if on mobile device or through ajax request if on browser
    function getGraphData(sensor, data, callback) {
        if (window.cordova) {
            cordovaHTTP.get(
                mSensorDataURL + sensor.key + '.json?gt[timestamp]=now-1day',
                function (response) {
                    sortGraphData(response, data, callback)
                },
                function (error) {
                    console.log(JSON.stringify(error));
                }
            );
        } else {
            $.ajax({
                url: mSensorDataURL + sensor.key + ".json?gt[timestamp]=now-1day",
                jsonp: "callback",
                cache: true,
                dataType: "jsonp",
                success: function(response) {
                    sortGraphData(response, data, callback)
                }
            })
        }
    }

    function setGraphData(sensor, data, callback) {
        showGraphBox = true;
        sortGraphData(sensor.fullData, 0, function(sensorData) {
            lineChartData.labels = sensorData
        });
        sortGraphData(sensor.fullData, data, function(sensorData) {
            lineChartData.datasets[0].data = sensorData;
            if (showGraphBox) {
                setTimeout(callback, 100)
            }
        })
    }

    /*
    // Fills the two arrays needed to create the graph
    function setGraphData(sensor, data, callback) {
        // Boolean used to stop stop the display of the graph if the InfoBox is closed while the graph is loading
        showGraphBox = true;
        getGraphData(sensor, 0,  function(data) {
            lineChartData.labels = data
        });
        getGraphData(sensor, data, function(data) {
            lineChartData.datasets[0].data = data;
            if (showGraphBox) {
                setTimeout(callback, 100)
            }
        })
    }
    */


    // Get data for the InfoBox through Cordova plugin if on mobile device or through ajax request if on browser
    function getJSON(sensor) {
        if (window.cordova) {
            cordovaHTTP.get(
                mSensorDataURL + sensor.key + '.json?gt[timestamp]=now-1day&page=1',
                function (response) {
                    if (response) {
                        sensor.data = JSON.parse(response.data)[0];
                        sensor.fullData = fixGraphData(JSON.parse(response.data));
                        drawCanvas()
                    }
                },
                function (error) {
                    console.log(JSON.stringify(error));
                }
            );
        } else {
            $.ajax({
                url: mSensorDataURL + sensor.key + ".json?gt[timestamp]=now- 1day",
                jsonp: "callback",
                cache: true,
                dataType: "jsonp",
                data: {
                    page: 1
                }
                ,
                success: function(response) {
                    if (response && response[0]) {
                        sensor.data = response[0];
                        sensor.fullData = fixGraphData(response);
                        drawCanvas()
                    }
                }
            })
        }
    }

    // Call main to get things started. If on mobile device, wait for "deviceready" so that Cordova plugin fully loads
	if (window.cordova) {
		document.addEventListener("deviceready", main, false);
	} else {
		main();
	}


})(); // Calling closure
