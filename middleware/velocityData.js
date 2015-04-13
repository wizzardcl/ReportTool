var mongoose = require('../libs/mongoose');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var SizeChange = require('../models/sizeChange').SizeChange;
var OriginalJiraIssue = require('../models/originalJiraIssue').Issue;

var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');
var cache = require('node_cache');
var helpers = require('../middleware/helpers');
var STATUS = require('../public/jsc/models/statusList').STATUS;

var statusExport = require('../public/jsc/Models/statusList');
var versionHelper  = new statusExport.versionHelper();

exports.getData = function (req, res) {

    cache.getData("velocityData",function(setterCallback){
        parsePages(function (data) {
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};

BurnTypeEnum = {
    All : 0,
    Core : 1,
    Automation : 2
}


function distribution (){
    this.data =  [
                {
                    name: STATUS.LAREADY.name,
                    data: [0,0]
                },
                {
                    name: STATUS.PMREVIEW.name,
                    data: [0,0]
                },
                {
                    name: STATUS.PRODUCTION.name,
                    data: [0,0]
                },
                {
                    name: STATUS.ACCEPTED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.RESOLVED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.TESTINGINPROGRESS.name,
                    data: [0,0]
                },
                {
                    name: STATUS.READYFORQA.name,
                    data: [0,0]
                },
                {
                    name: STATUS.CODEREVIEW.name,
                    data: [0,0]
                },
                {
                    name: STATUS.REOPENED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.BLOCKED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.INPROGRESS.name,
                    data: [0,0]
                },
                {
                    name: STATUS.ASSIGNED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.OPEN.name,
                    data: [0,0]
                },
                {
                    name: STATUS.DEFERRED.name,
                    data: [0,0]
                }
            ];
}

function parsePages(callback) {

    var velocity = {
        data: [
        {
            data: [],
            name: "Planned burn"
        },
        {
            data: [],
            name: "Actual burn"
        },
        {
            data: [],
            name: "Projected burn"
        },
        {
            data: [],
            name: "Planned burn core",
            visible: false
        },
        {
            data: [],
            name: "Actual burn core",
            visible: false
        },
        {
            data: [],
            name: "Projected burn core",
            visible: false
        },
         {
             data: [],
             name: "Automation burn",
             visible: false
         },
        {
            data: [],
            name: "Projected Automation burn",
            visible: false
        }],
        
        distribution: new distribution(),
        distributionByTeam: {}
    };

    var maximumBurn = 0.0;
    var maximumBurnCore = 0.0;
    var maximumAutomationBurn = 0.0;
    async.series([
        function (callback) {
            SizeChange.find({}).exec(function(err, sizeChanges) {
                velocity.sizeChanges = sizeChanges;
                velocity.sizeChanges.sort(function (a, b) {
                    a = new Date(a.date);
                    b = new Date(b.date);
                    return a < b ? 1 : a > b ? -1 : 0;
                });

                callback();
            });
        },
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                var modulesAdded = [];
                async.series([
                        async.eachSeries(modules, function(module, callback) {
                                Page.find({epicKey: module.key}).exec(function (err, pages) {
                                    if(pages != null && pages.length > 0) {
                                        async.eachSeries(pages, function(page, callback) {
                                                if(page.automationType) {
                                                    callback();
                                                    return;
                                                }
                                                var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
                                                var status = helpers.updateStatus(page);
                                                var resolution = page.resolution;
                                                var ignore = !helpers.isActive(page.status, resolution);

                                                for (var j = 0; j < page.progressHistory.length; j++) {
                                                    var history = page.progressHistory[j];
                                                    var date = new Date(Date.parse(history.dateChanged));
                                                    date.setHours(12, 0, 0, 0);
                                                    date = date.getTime();
                                                    var from = parseInt(history.progressFrom);
                                                    if(from > 1) {
                                                        if(history.progressTo == '0' ||
                                                            history.progressTo == '1' ||
                                                            history.progressTo == '' ||
                                                            history.progressTo == null)
                                                            continue;
                                                    }
                                                    var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                                                    var progress = to - from;
                                                    var calcStoryPoints = storyPoints * progress / 100;

                                                    putDataPoint(velocity, "Actual burn", date, calcStoryPoints, "");
                                                    if(versionHelper.isCoreVersion(module.fixVersions)) {
                                                        putDataPoint(velocity, "Actual burn core", date, calcStoryPoints, "");
                                                    }
                                                }
                                                if(module.duedate != null) {
                                                    if(!ignore) {
                                                        maximumBurn += storyPoints;
                                                        var date = new Date(Date.parse(module.duedate));
                                                        date.setHours(12, 0, 0, 0);
                                                        date = date.getTime();
                                                        var tooltip = "";
                                                        if(modulesAdded.indexOf(module.summary) < 0) {
                                                            tooltip = module.summary;
                                                            modulesAdded.push(module.summary);
                                                        }
                                                        putDataPoint(velocity, "Planned burn", date, storyPoints, tooltip);
                                                        if(versionHelper.isCoreVersion(module.fixVersions)) {
                                                            maximumBurnCore += storyPoints;
                                                            putDataPoint(velocity, "Planned burn core", date, storyPoints, tooltip);
                                                        }
                                                    }
                                                }
                                                if(!ignore) {
                                                    addStackedData(velocity, status, storyPoints, helpers.getTeamName(page.labels));
                                                }
                                                callback();
                                            },
                                            function(err) {
                                                callback();
                                            }
                                        );
                                    }
                                    else {
                                        callback();
                                    }
                                })
                            },
                            function(err) {
                                callback();
                            })
                    ],
                    function(err) {
                        callback();
                    });
            });
        },
                function (callback) {
                    OriginalJiraIssue.find({"object.fields.priority.name":"Major",issuetype:"Story","object.fields.summary":/^\[Automation\]/, "object.fields.customfield_10004":{$ne:null}, "object.fields.status.name":{$ne:"Deferred"}}).exec(function (err, issues) {
                        var p1Automation = _.map(issues, function(issue){ return issue.key; });

                        Page.find({automationType: true, storyPoints:{$ne:null}, status:{$ne:"Deferred"}}).exec(function (err, pages) {
                            if(pages != null && pages.length > 0) {
                                async.eachSeries(pages, function(page, callback) {
                                        if(_.contains(p1Automation, page.key) == false) {
                                            callback();
                                            return;
                                        }

                                        var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);

                                        for (var j = 0; j < page.progressHistory.length; j++) {
                                            var history = page.progressHistory[j];
                                            var date = new Date(Date.parse(history.dateChanged));
                                            date.setHours(12, 0, 0, 0);
                                            date = date.getTime();
                                            var from = parseInt(history.progressFrom);
                                            if(from > 1) {
                                                if(history.progressTo == '0' ||
                                                    history.progressTo == '1' ||
                                                    history.progressTo == '' ||
                                                    history.progressTo == null)
                                                    continue;
                                            }
                                            var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                                            var progress = to - from;
                                            var calcStoryPoints = storyPoints * progress / 100;

                                            putDataPoint(velocity, "Automation burn", date, calcStoryPoints, "");
                                        }

                                        maximumAutomationBurn += storyPoints;

                                        callback();
                                    },
                                    function(err) {
                                        callback();
                                    }
                                );
                            }
                            else {
                                callback();
                            }
                        });
                     });
                },
        function () {
            var date = new Date("January 1, 2014 00:00:00");
            date = date.getTime();
            putDataPoint(velocity, "Planned burn", date, 0.0);
            putDataPoint(velocity, "Planned burn core", date, 0.0);
            SortData(velocity);
            AddProjection(BurnTypeEnum.Core, maximumBurn, velocity);
            AddProjection(BurnTypeEnum.All, maximumBurnCore, velocity);
            AddProjection(BurnTypeEnum.Automation, maximumAutomationBurn, velocity);
            SumData(BurnTypeEnum.Core, maximumBurn, velocity);
            SumData(BurnTypeEnum.All, maximumBurnCore, velocity);
            SumData(BurnTypeEnum.Automation, maximumAutomationBurn, velocity);
            AdjustProjection(BurnTypeEnum.Core, velocity);
            AdjustProjection(BurnTypeEnum.All, velocity);
            AdjustProjection(BurnTypeEnum.Automation, velocity);
            callback(velocity);
        }
    ]);
}

function AdjustProjection(burnType, velocity) {
    var lastValue = 0.0;
    var actualName;
    var projectedName;

    switch (burnType)
    {
        case BurnTypeEnum.All:
            actualName = "Actual burn core";
            projectedName = "Projected burn core";
            break;
        case BurnTypeEnum.Core:
            actualName = "Actual burn";
            projectedName = "Projected burn";
            break;
        case BurnTypeEnum.Automation:
            actualName = "Automation burn";
            projectedName = "Projected Automation burn";
            break;
    };

    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if (burn.name == actualName) {
            lastValue = burn.data.length > 0 ? burn.data[burn.data.length-1].y : lastValue;
            break;
        }
    }

    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name == projectedName) {
            for (var l = 0; l < burn.data.length-1; l++) {
                var delta = burn.data[l].y - burn.data[l+1].y;
                if(l==0) {
                    burn.data[l].y = Math.floor(lastValue);
                }
                else if(l == burn.data.length-2) {
                    burn.data[l].y = Math.floor(burn.data[l-1].y - delta);
                    burn.data[l+1].y = Math.floor(burn.data[l].y - delta);
                }
                else {
                    burn.data[l].y = Math.floor(burn.data[l-1].y - delta);
                }
            }
            var negativeIndex = burn.data.length;
            for (var l = 0; l < burn.data.length; l++) {
                if(burn.data[l].y < 0.) {
                    negativeIndex = l;
                    break;
                }
            }
            if(negativeIndex < burn.data.length) {
                burn.data = burn.data.slice(0, negativeIndex + 1);
            }
            break;
        }
    }
}

function AddProjection(burnType, maximumBurn, velocity) {
    var actualName;
    var projectedName;

    switch (burnType)
    {
        case BurnTypeEnum.All:
            actualName = "Actual burn core";
            projectedName = "Projected burn core";
            break;
        case BurnTypeEnum.Core:
            actualName = "Actual burn";
            projectedName = "Projected burn";
            break;
        case BurnTypeEnum.Automation:
            actualName = "Automation burn";
            projectedName = "Projected Automation burn";
            break;
    };

    var monthAgo = new Date(Date.now());
    monthAgo.setMonth(monthAgo.getMonth()-3);
    var monthAgoMsc = monthAgo.getTime();
    var sum = 0.0;
    var projectedBurn = null;

    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name == actualName) {
            for (var l = 0; l < burn.data.length; l++) {
                if(burn.data[l].x > monthAgoMsc) {
                    sum += burn.data[l].y;
                }
            }
        }
        if(burn.name == projectedName) {
            projectedBurn = burn;
        }
    }

    var projectEnd = new Date(2015,8,1);
    var pointDate = new Date(Date.now());
    var pointValue = maximumBurn;
    projectedBurn.dashStyle = "ShortDash";
    while(pointDate < projectEnd) {
        var pointDateMsc = pointDate.getTime();
        projectedBurn.data.push({x:pointDateMsc, y:pointValue, tooltip: ""});
        pointValue -= sum/3.;
        pointDate.setMonth(pointDate.getMonth()+1);
    }
}

function SumData(burnType, maximumBurn, velocity) {
    var burnsList;
    switch (burnType)
    {
        case BurnTypeEnum.All:
            burnsList = ["Planned burn core", "Actual burn core"];
            break;
        case BurnTypeEnum.Core:
            burnsList = ["Planned burn", "Actual burn"];
            break;
        case BurnTypeEnum.Automation:
            burnsList = ["Automation burn"];
            break;
    };

    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name != burnsList[0] && burn.name != burnsList[1]) {
            continue;
        }
        for (var l = 0; l < burn.data.length - 1; l++) {
            burn.data[l + 1].y += burn.data[l].y;
        }
    }
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name != burnsList[0] && burn.name != burnsList[1]) {
            continue;
        }
        for (var l = 0; l < burn.data.length; l++) {
            burn.data[l].y = Math.round(maximumBurn - burn.data[l].y);
        }
    }

}

function SortData(velocity) {
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        burn.data.sort(function (a, b) {
            a = new Date(a.x);
            b = new Date(b.x);
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }
}

function addStackedData(velocity, status, storyPoints, teamName) {
    var added = false;

    var team = velocity.distributionByTeam[teamName == "--"? "NoTeam" : teamName] = velocity.distributionByTeam[teamName == "--"? "NoTeam" : teamName] || {distribution: new distribution()};

    for(var i=0; i<velocity.distribution.data.length; i++) {
        if (velocity.distribution.data[i].name == status) {
            velocity.distribution.data[i].data[0]++;
            velocity.distribution.data[i].data[1] += storyPoints || 0;

            team.distribution.data[i].data[0]++;
            team.distribution.data[i].data[1] += storyPoints || 0;

            added = true;
            break;
        }
    }
}

function putDataPoint(velocity, burnName, date, calcStoryPoints, tooltip) {
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if (burn.name == burnName) {
            var found = false;
            for (var l = 0; l < burn.data.length; l++) {
                var burnData = burn.data[l];
                if ((burnData.x - date) == 0) {
                    found = true;
                    burnData.y += calcStoryPoints;
                    if(burn.name == "Planned burn" || burn.name == "Planned burn core") {
                        burnData.tooltip += tooltip == "" ? "" : "," + tooltip;
                    }
                    return;
                }
            }
            if (!found) {
                burn.data.push({x: date, y: calcStoryPoints, tooltip: tooltip});
                return;
            }
        }
    }
}
