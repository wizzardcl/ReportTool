var mongoose = require('../libs/mongoose');
var helpers = require('../middleware/helpers');
var STATUS = require('../public/jsc/models/statusList').STATUS;
var RESOLUTION = require('../public/jsc/models/statusList').RESOLUTION;

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');
var statusExport = require('../public/jsc/models/statusList');
var statusList = new statusExport.statuses();

exports.getData = function (req, res) {
    parsePages(function (moduledata) {
        res.json(moduledata);
    });
};

function moduleData() {
    this.module = [];
}

function SortData(moduledata) {
    moduledata.module.sort(function (a, b) {
        a = a.name;
        b = b.name;
        return a > b ? 1 : a < b ? -1 : 0;
    });
}

function parsePages(callback) {
    var moduledata = new moduleData();
    moduledata.module = [];

    async.series([
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                async.series([
                    async.eachSeries(modules, function(module, callback) {
                            var count = 0;
                            Page.find({epicKey: module.key}).exec(function (err, pages) {
                            if(pages != null && pages.length > 0) {
                                async.eachSeries(pages, function(page, callback) {
                                        if(helpers.isActive(page.status, page.resolution)) {
                                            putDataPoint(moduledata, module, page, ++count);
                                        }
                                        callback();
                                },
                                function(err) {
                                    callback();
                                });
                            }
                            else {
                                putDataPoint(moduledata, module, null, count);
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
        function () {
            SortData(moduledata);
            callback(moduledata);
        }
    ]);
}

function putDataPoint(moduledata, module, page, count) {
    var labels = module._doc.labels ? module._doc.labels : "";
    var teamName = helpers.getTeamName(labels);
    var streamName = helpers.getStreamName(labels);
    var storyPoints, moduleGroup, progress, calcStoryPoints;
    if(page) {
        storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
        moduleGroup = helpers.getModuleGroupName(page.labels);
        progress = page.progress == null ? 0 : parseInt(page.progress);
        calcStoryPoints = storyPoints * progress / 100;
    }
    else {
        storyPoints = 0;
        calcStoryPoints = 0;
        moduleGroup = "Unknown Module Group";
    }

    var initUri = "https://jira.epam.com/jira/browse/";

    //module
    var moduled;
    for (var k = 0; k < moduledata.module.length; k++) {
        if (moduledata.module[k].key == module.key) {
            moduled = moduledata.module[k];
            break;
        }
    }
    if(!moduled) {
        moduled = {
            key: module.key,
            name: module.summary,
            duedate: module.duedate,
            smename: module.assignee,
            moduleGroup: moduleGroup,
            moduleStatus: module.status,
            moduleResolution: module.resolution,
            status: page ? helpers.updateStatus(page.status, page.resolution) : STATUS.CANCELED.name,
            uri: initUri + module.key,
            fixVersions: module.fixVersions,
            dueDateConfirmed: helpers.getDueDateConfirmed(labels),
            priority: module.priority,
            progress: 0,
            reportedSP: 0,
            summarySP: 0,
            teamName: teamName,
            streamName: streamName
        };
        moduledata.module.push(moduled);
    }

    moduled.reportedSP += calcStoryPoints;
    moduled.summarySP += storyPoints;
    moduled.progress = moduled.reportedSP*100/moduled.summarySP;
    moduled.pagescount = count;

    if(page) {
        moduled.hasblockers = page.status == STATUS.BLOCKED.name;
        moduled.hasdeferred = page.status == STATUS.DEFERRED.name;

        var moduleStatus = statusList.getStatusByName(moduled.status);
        var newStatus = statusList.getStatusByName(helpers.updateStatus(page.status, page.resolution));

        if(newStatus.weight < moduleStatus.weight){
            moduled.status = newStatus.name;
        }
    }
}
