/**
 * Created by Mikita_Stalpinski on 10/6/2014.
 */
var Page = require("../models/page").Page;
var Issue = require('../models/issue').Issue;
var jiraTextUtility = require("./Utility/JiraTextUtility");
var _ = require('underscore');
var async = require('async');

exports.getData = function (req, res) {
    var teamName = req.query.team;
    var cloudAppName = req.query.cloudApp;

    //var teamName = req.params.team;
    //var cloudAppName = req.params.cloudApp;

    parsePages(teamName, cloudAppName, function (err, cloudAppData) {
        if (err) {
            throw err;
        }
        res.json(cloudAppData);
    })
}

function cloudAppData() {
    this.modules = [
        {
            moduleName: "",
            cloudApps: [
                {
                    appName: "",
                    pages: [
                        {
                            pageKey: "",
                            pageName: "",
                            storyPoints: 0,
                            team: "",
                            stream: "",
                            taskStatus: "",
                            checklistStatus: "",
                            blockers: [
                                {
                                    key: "",
                                    uri: "",
                                    status: "",
                                    pagesInvolved: 0
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

function parsePages(teamToSearch, cloudAppToSearch, callback) {
    var cloudAppsData = new cloudAppData();
    cloudAppsData.modules = [];

    var query = {};
    if (teamToSearch) {
        query.labels = new RegExp(teamToSearch.indexOf("Team") == 0 ? teamToSearch : "Team" + teamToSearch);
    }

    Page.find(query, { worklogHistory: 0, progressHistory: 0 })
        .exec(function (err, pages) {
            if (err) {
                callback(err);
            }

            async.eachLimit(pages, 10, function (page, callback) {
                    (function (page) {
                        if (cloudAppToSearch && jiraTextUtility.getCloudAppName(page.labels) != cloudAppToSearch) {
                            callback();
                            return;
                        }

                        Issue.find({ "pages.page": page._id }, function (err, issues) {
                            if (err) {
                                callback(err);
                            }

                            var moduleName = jiraTextUtility.getModuleName(page.labels);
                            var cloudAppName = jiraTextUtility.getCloudAppName(page.labels);
                            var pageKey = page.key;
                            var shortPageName = page.summary.split("\\").pop();
                            var storyPoints = page.storyPoints;
                            var team = jiraTextUtility.getTeamName(page.labels);
                            var streamName = jiraTextUtility.getStreamName(page.labels);
                            var pageStatus = page.status;
                            var checklistStatus = page.checklistStatus;

                            var blockers = [];
                            for (var i = 0, issuesLength = issues.length; i < issuesLength; i++) {
                                var pageIssue = issues[i];
                                blockers.push({
                                    key: pageIssue.key,
                                    uri: pageIssue.uri,
                                    status: pageIssue.status,
                                    pagesInvolved: pageIssue.pages.length,
                                    type: pageIssue.type,
                                    isF5Issue: pageIssue.labels.indexOf("F5") > -1
                                })
                            }

                            putDataPoint(cloudAppsData, moduleName, cloudAppName, pageKey, shortPageName, storyPoints, team, streamName, pageStatus, checklistStatus, blockers);

                            callback();
                        })
                    }(page))

                },
                function (err) {
                    callback(err, cloudAppsData);
                }
            );
        })
}

function putDataPoint(cloudAppsData, moduleName, appName, pageKey, pageName, sp, team, stream, taskStatus, checklistStatus, blockers) {
    var module = _.find(cloudAppsData.modules, function (moduleItem) {
        return moduleItem.moduleName == moduleName;
    });

    if (_.isUndefined(module)) {
        module = {
            moduleName: moduleName,
            cloudApps: []
        };

        cloudAppsData.modules.push(module);
    }

    var cloudApp = _.find(module.cloudApps, function (cloudAppItem) {
        return cloudAppItem.appName == appName;
    });

    if (_.isUndefined(cloudApp)) {
        cloudApp = {
            appName: appName,
            pages: []
        };

        module.cloudApps.push(cloudApp);
    }

    var pageItem = {
        pageKey: pageKey,
        pageName: pageName,
        storyPoints: sp,
        team: team,
        stream: stream,
        taskStatus: taskStatus,
        checklistStatus: checklistStatus,
        blockers: blockers
    };

    cloudApp.pages.push(pageItem);
}