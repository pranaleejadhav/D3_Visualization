var dataset;
var state_name_map = {};
var usdata;
var mydata;
var COLOR_COUNTS = 9;
var COLOR_FIRST = "#c3e2ff",
    COLOR_LAST = "#08306B";
var rgb = hexToRgb(COLOR_FIRST);
var COLOR_START = new Color(rgb.r, rgb.g, rgb.b);
rgb = hexToRgb(COLOR_LAST);
var COLOR_END = new Color(rgb.r, rgb.g, rgb.b);
var startColors = COLOR_START.getColors(),
    endColors = COLOR_END.getColors();
var colors = [];
for (var i = 0; i < COLOR_COUNTS; i++) {
    var r = Interpolate(startColors.r, endColors.r, COLOR_COUNTS, i);
    var g = Interpolate(startColors.g, endColors.g, COLOR_COUNTS, i);
    var b = Interpolate(startColors.b, endColors.b, COLOR_COUNTS, i);
    colors.push(new Color(r, g, b));
}

var quantize = d3.scaleQuantize()
    .domain([0, 300000000])
    .range(d3.range(COLOR_COUNTS).map(function(i) {
        return i
    }));


function loadDashboard() {
    d3.csv("https://raw.githubusercontent.com/pranaleejadhav/D3_Visualization/master/losses2015_transformed.csv?token=AVPWBFLxeGBtHXX8TgbmxHHJO3ejP69Jks5bxmEdwA%3D%3D", function(error, data) {
        if (error) throw error;
        dataset = data;

        d3.tsv("https://s3-us-west-2.amazonaws.com/vida-public/geo/us-state-names.tsv", function(error, state_names) {

            for (var i = 0; i < state_names.length; i++) {
                state_name_map[state_names[i].id] = state_names[i].code;
            }

            d3.json("https://raw.githubusercontent.com/pranaleejadhav/D3_Visualization/master/us-10m.json?token=AVPWBF9G852ajisYkm5Q-NWoLtnQ_6NSks5bxmgXwA%3D%3D", function(error, us) {
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

    var tooltip = d3.select("body").append("div").attr("class", "toolTip");

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
            tooltip
                .style("left", d3.event.pageX - 50 + "px")
                .style("top", d3.event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html((d.key) + "<br>" + "$" + (d.value));
        })
        .on("mouseout", function(d) {
            createMap()
            tooltip.style("display", "none");
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
        .attr("class", "categories-choropleth")
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
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += state_name_map[parseInt(d.id)];
            html += " : ";
            html += val;
            html += "</span>";
            html += "</div>";

            $("#tooltip-container").html(html);
            $(this).attr("fill-opacity", "0.8");
            $("#tooltip-container").show();

            var coordinates = d3.mouse(this);

            var map_width = $('.categories-choropleth')[0].getBoundingClientRect().width;

            if (d3.event.pageX < map_width / 2) {
                d3.select("#tooltip-container")
                    .style("top", (d3.event.pageY + 15) + "px")
                    .style("left", (d3.event.pageX + 15) + "px");
            } else {
                var tooltip_width = $("#tooltip-container").width();
                d3.select("#tooltip-container")
                    .style("top", (d3.event.pageY + 15) + "px")
                    .style("left", (d3.event.pageX - tooltip_width - 30) + "px");
            }
        })
        .on("mouseout", function() {
            createBarChart()
            $(this).attr("fill-opacity", "1.0");
            $("#tooltip-container").hide();
        });

    svg.append("path")
        .datum(topojson.mesh(usdata, usdata.objects.states, function(a, b) {
            return a !== b;
        }))
        .attr("class", "categories")
        .attr("transform","scale("+ SCALE + ")")
        .attr("d", path);


}

function Interpolate(start, end, steps, count) {
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