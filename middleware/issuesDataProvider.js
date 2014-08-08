/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */
var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var Issue = require('../models/issue').Issue;
var issuesViewModel = require('../models/issuesViewModel');
var log = require('../libs/log')(module);
var async = require('async');
var jiraTextUtility = require('./Utility/JiraTextUtility');
var _ = require('underscore');

var statusExport = require('../public/jsc/Models/statusList');
var statusList = new statusExport.statuses();

exports.getData = function (req, res) {
    parsePages(function (err, personaldata) {
        if (err) throw err;
        res.json(personaldata);
    });
};

function parsePages(callback) {


    Issue.find({})
        .populate('pages.page')
        .exec(function (err, issues) {
            var issueList = new issuesViewModel.issues();

            if (err) {
                callback(err);
            }

            _.each(issues, function (dbIssue) {

                if(dbIssue.status == statusList.accepted ||
                    dbIssue.status == statusList.cancelled ||
                    dbIssue.status == statusList.resolved ||
                    dbIssue.status == statusList.readyForQA ||
                    dbIssue.status == statusList.codeReview
                    )
                {
                    return;
                }

                var linkedPages = [];
                _.each(dbIssue.pages, function (dbPageItem) {
                    var dbPage = dbPageItem.page;
                    var linkedPage = new issuesViewModel.linkedPage(dbPage.key, dbPage.reporter, dbPage.timeSpent, dbPage.labels, dbPage.assignee, jiraTextUtility.getTeamName(dbPage.labels));
                    linkedPages.push(new issuesViewModel.link(dbPageItem.linkType, linkedPage));
                });

                var issue = new issuesViewModel.issue(
                    dbIssue.key,
                    dbIssue.reporter,
                    dbIssue.timeSpent,
                    dbIssue.labels.split(','),
                    dbIssue.assignee,
                    linkedPages
                );

                issueList.issues.push(issue)
            });

            callback(err, issueList.issues);
        });
}

