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
    this.cloudApps = [
        {
            appName: "",
            pageKey: "",
            pageName: "",
            storyPoints: 0,
            team: "",
            stream: "",
            taskStatus: "",
            blockers: [
                {
                    key: "",
                    uri: "",
                    status: "",
                    hotLevel: 0
                }
            ]
        }
    ]
}

function parsePages(teamToSearch, cloudAppToSearch, callback) {
    var cloudAppsData = new cloudAppData();
    cloudAppsData.cloudApps = [];

    var query = {};
    if (teamToSearch) {
        query.labels = new RegExp(teamToSearch);
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

                            var cloudAppName = jiraTextUtility.getCloudAppName(page.labels);
                            var pageKey = page.key;
                            var pageName = page.summary;
                            var storyPoints = page.storyPoints;
                            var team = jiraTextUtility.getTeamName(page.labels);
                            var streamName = jiraTextUtility.getStreamName(page.labels);
                            var pageStatus = page.status;

                            var blockers = [];
                            for (var i = 0, issuesLength = issues.length; i < issuesLength; i++) {
                                // TODO - do NOT include bugs or other types?
                                var pageIssue = issues[i];
                                blockers.push({
                                    key: pageIssue.key,
                                    uri: pageIssue.uri,
                                    status: pageIssue.status,
                                    hotLevel: pageIssue.pages.length
                                })
                            }

                            putDataPoint(cloudAppsData, cloudAppName, pageKey, pageName, storyPoints, team, streamName, pageStatus, blockers);

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

function putDataPoint(cloudAppsData, appName, pageKey, pageName, sp, team, stream, taskStatus, blockers) {
    var appd = {
        appName: appName,
        pageKey: pageKey,
        pageName: pageName,
        storyPoints: sp,
        team: team,
        stream: stream,
        taskStatus: taskStatus,
        blockers: blockers
    };
    cloudAppsData.cloudApps.push(appd);
}