/**
 * Created by Mikita_Stalpinski on 10/6/2014.
 */
var Page = require("../models/page").Page;
var jiraTextUtility = require("./Utility/JiraTextUtility");
var _ = require('underscore');

exports.getData = function (req, res) {
    parsePages(function (err, cloudAppData) {
        if (err) {
            throw err;
        }
        res.json(cloudAppData);
    })
}

function cloudAppData() {
    this.cloudApps = [
        {
            name: "",
            pages: [
                {
                    name: "",
                    storyPoints: 0,
                    taskStatus: "",
                    checklistStatus: "",
                    blockers: [
                        {
                            uri: "",
                            hotLevel: 0
                        }
                    ]
                }
            ]
        }
    ]
}

function parsePages(callback) {
    var cloudAppsData = new cloudAppData();
    cloudAppsData.cloudApps = [];

    Page.find({}, function (err, pages) {
        if (err) {
            callback(err);
        }

        for (var i = 0, pagesLength = pages.length; i < pagesLength; i++) {
            var page = pages[i];
            var cloudAppName = jiraTextUtility.getCloudAppName(page.labels);
            var pageName = page.summary;
            var storyPoints = page.storyPoints;
            var pageStatus = page.status;
            // TODO - checklist status and blockers
            var checklistStatus = "PUT THE STATUS";
            var blockers = [];

            putDataPoint(cloudAppsData, cloudAppName, pageName, storyPoints, pageStatus, checklistStatus, blockers);
        }

        callback(err, cloudAppsData);
    })
}

function putDataPoint(cloudAppsData, appName, pageName, sp, taskStatus, checklistStatus, blockers) {
    var appd = _.find(cloudAppsData.cloudApps, function (cloudApp) {
        return cloudApp.name == appName;
    })

    if (!appd) {
        appd = { name: appName, pages: [] };
        cloudAppsData.cloudApps.push(appd);
    }

    // TODO - think about delete iteration since the page is unique???
    var paged = _.find(appd.pages, function (page) {
        return page.name == pageName;
    });

    if (!paged) {
        paged = { name: pageName, storyPoints: sp, taskStatus: taskStatus, checklistStatus: checklistStatus, blockers: blockers };
        appd.pages.push(paged);
    }
}