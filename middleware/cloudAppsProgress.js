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
            appName: "",
            pageKey: "",
            pageName: "",
            storyPoints: 0,
            stream: "",
            taskStatus: "",
            blockers: [
                {
                    uri: "",
                    hotLevel: 0
                }
            ]
        }
    ]
}

function parsePages(callback) {
    var cloudAppsData = new cloudAppData();
    cloudAppsData.cloudApps = [];

    Page.find({}, { worklogHistory: 0, progressHistory: 0 })
        .exec(function (err, pages) {
        if (err) {
            callback(err);
        }

        for (var i = 0, pagesLength = pages.length; i < pagesLength; i++) {
            var page = pages[i];
            var cloudAppName = jiraTextUtility.getCloudAppName(page.labels);
            var pageKey = page.key;
            var pageName = page.summary;
            var storyPoints = page.storyPoints;
            var streamName = jiraTextUtility.getStreamName(page.labels);
            var pageStatus = page.status;
            // TODO - checklist status and blockers
            var blockers = [];

            putDataPoint(cloudAppsData, cloudAppName, pageKey, pageName, storyPoints, streamName, pageStatus, blockers);
        }

        callback(err, cloudAppsData);
    })
}

function putDataPoint(cloudAppsData, appName, pageKey, pageName, sp, stream, taskStatus, blockers) {
    var appd = {
        appName: appName,
        pageKey: pageKey,
        pageName: pageName,
        storyPoints: sp,
        stream: stream,
        taskStatus: taskStatus,
        blockers: blockers
    };
    cloudAppsData.cloudApps.push(appd);
}