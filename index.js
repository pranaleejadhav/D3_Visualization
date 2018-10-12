//Code developed by pranalee jadhav
//Defining  variables

var losses_fileurl = "https://raw.githubusercontent.com/pranaleejadhav/D3_Visualization/master/losses2015_transformed.csv"
var usjson_url = "https://raw.githubusercontent.com/pranaleejadhav/D3_Visualization/master/us-10m.json"
var tsv_url = "https://raw.githubusercontent.com/pranaleejadhav/D3_Visualization/master/us-state-names.tsv"

var dataset;
var state_name_map = {};
var colors = [];
var usdata;
var mydata;


//Defining color related variables
var COUNT_OF_COLOR = 9;
var COLOR1 = "#c3e2ff", COLOR2 = "#08306B";
var rgb = hexToRgb(COLOR1);
var COLOR_BEGIN = new Color(rgb.r, rgb.g, rgb.b);
rgb = hexToRgb(COLOR2);
var COLOR_LAST = new Color(rgb.r, rgb.g, rgb.b);
var colors_start = COLOR_BEGIN.getColors(),
    colors_end = COLOR_LAST.getColors();

for (var i = 0; i < COUNT_OF_COLOR; i++) {
    var r = processColor(colors_start.r, colors_end.r, COUNT_OF_COLOR, i);
    var g = processColor(colors_start.g, colors_end.g, COUNT_OF_COLOR, i);
    var b = processColor(colors_start.b, colors_end.b, COUNT_OF_COLOR, i);
    colors.push(new Color(r, g, b));
}

var quantize = d3.scaleQuantize()
    .domain([0, 300000000])
    .range(d3.range(COUNT_OF_COLOR).map(function(i) {
        return i
    }));


// initial function to fetch data and show dashboard
function loadDashboard() {
    d3.csv(losses_fileurl, function(error, data) {
        if (error) throw error;
        dataset = data;

        d3.tsv(tsv_url, function(error, state_names) {
            // map state name with state code
            for (var i = 0; i < state_names.length; i++) {
                state_name_map[state_names[i].id] = state_names[i].code;
            }

            d3.json(usjson_url, function(error, us) {
                // fetch us-10m data
                usdata = us
                if (error) throw error;
                createBarChart()
                createMap()
            });
        });
    });
}

function createBarChart(state_name = "") {

    $('#svg_bar').empty();

    var svg = d3.select("#svg_bar"),
        margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 200
        },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    var bartooltip = d3.select("body").append("div").attr("class", "barToolTip");

    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleBand().range([height, 0]);

    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    if (state_name == "") {
        $("#state_lb").html("All");
        mydata = d3.nest()
            .key(function(d) {
                return d.Damage_Descp;
            })
            .rollup(function(d) { //rollup --->sum the values -->aggreagte
                return d3.sum(d, function(g) {
                    return g.Amount;
                });
            })
            .entries(dataset);

    } else {
        $("#state_lb").html(state_name);
        mydata = d3.nest()
            .key(function(d) {
                return d.Damage_Descp;
            })
            .rollup(function(d) { //rollup --->sum the values -->aggreagte
                return d3.sum(d, function(g) {
                    return g.Amount;
                });
            })
            .entries(dataset.filter(function(d) {
                return d.State_Abv == state_name;
            }));
    }



    console.log(mydata);

    mydata.sort(function(a, b) {
        return b.value - a.value;
    });

    x.domain([0, d3.max(mydata, function(d) {
        return d.value;
    })]);

    y.domain(mydata.map(function(d) {
        return d.key;
    })).padding(0.1);

    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(5).tickFormat(function(d) {
            return parseInt(d / 1000);
        }).tickSizeInner([-height]));

    g.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y));

    g.selectAll(".bar")
        .data(mydata)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("y", function(d) {
            return y(d.key);
        })
        .attr("width", function(d) {
            return x(d.value);
        })
        .style("fill", function(d) {
            var i = quantize(d.value);
            var color = colors[i].getColors();
            return "rgb(" + color.r + "," + color.g +
                "," + color.b + ")";
        })
        .on("mousemove", function(d) {
            createMap(d.key)
            bartooltip
                .style("left", d3.event.pageX - 50 + "px")
                .style("top", d3.event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html((d.key) + "<br>" + "$" + (d.value));
        })
        .on("mouseout", function(d) {
            createMap()
            bartooltip.style("display", "none");
        });
}

function createMap(damage_name = "") {
    var svg = d3.select("#svg_map");
    var path = d3.geoPath();
    var SCALE = 0.7;


    if (damage_name == "") {
        $("#damage_lb").html("All");
        mydata = d3.nest()
            .key(function(d) {
                return d.State_Code;
            })
            .rollup(function(d) { //rollup --->sum the values -->aggreagte
                return d3.sum(d, function(g) {
                    return g.Amount;
                });
            })
            .entries(dataset);
    } else {
        $("#damage_lb").html(damage_name);
        mydata = d3.nest()
            .key(function(d) {
                return d.State_Code;
            })
            .rollup(function(d) { //rollup --->sum the values -->aggreagte
                return d3.sum(d, function(g) {
                    return g.Amount;
                });
            })
            .entries(dataset.filter(function(d) {
                return d.Damage_Descp == damage_name;
            }));
    }


   console.log(mydata);


    // mapping us-10m json with csv file
    name_id_map = {};

    for (var i = 0; i < mydata.length; i++) {

        var dataState = mydata[i].key;
        var dataValue = mydata[i].value;
        name_id_map[dataState] = dataValue;
        for (var j = 0; j < usdata.objects.states.length; j++) {
            var jsonState = usdata.objects.states[j].id;

            if (dataState == jsonState) {
                usdata.states[j].properties.value = dataValue;
                break;
            }
        }

    }

    
    svg.append("g")
        .attr("class", "choropleth_states")
        .selectAll("path")
        .data(topojson.feature(usdata, usdata.objects.states).features)
        .enter().append("path")
        .attr("d", path)
        .attr("transform","scale("+ SCALE + ")")
        .style("fill", function(d) {
            var temp = parseInt(d.id, 10)
            if (name_id_map[temp]) {
                var i = quantize(name_id_map[temp]);
                var color = colors[i].getColors();
                return "rgb(" + color.r + "," + color.g +
                    "," + color.b + ")";
            } else {
                return "";
            }
        })
        .on("mousemove", function(d) {
            createBarChart(state_name_map[parseInt(d.id)])
            var html = "";
            var val = name_id_map[parseInt(d.id)];
            html += "<div>";
            html += "<span class=\"tooltip_sname\">";
            html += state_name_map[parseInt(d.id)];
            html += " : ";
            html += val;
            html += "</span>";
            html += "</div>";

            $("#tooltip_div").html(html);
            $(this).attr("fill-opacity", "0.8");
            $("#tooltip_div").show();

            var coordinates = d3.mouse(this);

            var map_width = $('.choropleth_states')[0].getBoundingClientRect().width;

            if (d3.event.pageX < map_width / 2) {
                d3.select("#tooltip_div")
                    .style("top", (d3.event.pageY + 15) + "px")
                    .style("left", (d3.event.pageX + 15) + "px");
            } else {
                var tooltip_width = $("#tooltip_div").width();
                d3.select("#tooltip_div")
                    .style("top", (d3.event.pageY + 15) + "px")
                    .style("left", (d3.event.pageX - tooltip_width - 30) + "px");
            }
        })
        .on("mouseout", function() {
            createBarChart()
            $(this).attr("fill-opacity", "1.0");
            $("#tooltip_div").hide();
        });

    svg.append("path")
        .datum(topojson.mesh(usdata, usdata.objects.states, function(a, b) {
            return a !== b;
        }))
        .attr("class", "states")
        .attr("transform","scale("+ SCALE + ")")
        .attr("d", path);


}

function processColor(start, end, steps, count) {
    var s = start,
        e = end,
        final = s + (((e - s) / steps) * count);
    return Math.floor(final);
}

function Color(_r, _g, _b) {
    var r, g, b;
    var setColors = function(_r, _g, _b) {
        r = _r;
        g = _g;
        b = _b;
    };

    setColors(_r, _g, _b);
    this.getColors = function() {
        var colors = {
            r: r,
            g: g,
            b: b
        };
        return colors;
    };
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}