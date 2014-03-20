var mongoose = require('../libs/mongoose');
var progressModel = require('../models/progress').progress;
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var async = require('async');
var log = require('../libs/log')(module);

exports.getData = function(req, res) {
    parsePages(function(err, progress) {
        if(err) throw err;
        res.json(progress);
    });
}

function sortData(progress) {
    progress.dates.sort(function (a, b) {
        a = new Date(a.date);
        b = new Date(b.date);
        return a > b ? 1 : a < b ? -1 : 0;
    });
}

function parsePages(callback) {
    var progress = new progressModel();
    //1. grab all pages
    Page.find({}, function (err, pages) {
        progress.dates = [];
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            var storyPoints = parseInt(page.storyPoints) == null ? 0 : parseInt(page.storyPoints);
            var teamName = getTeamName(page.labels);
            var key = page.key;
            for (var j = 0; j < page.progressHistory.length; j++) {
                var history = page.progressHistory[j];
                var date = new Date(Date.parse(history.dateChanged));
                date.setHours(12,0,0,0);
                //date = date.getTime();
                var person = history.person;
                var from = parseInt(history.progressFrom);
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                var progressDiff = to - from;
                var calcStoryPoints = storyPoints * progressDiff / 100;
                var uri = page.uri;
                putDataPoint(key, progress, teamName, date, calcStoryPoints, person, uri);
            }
        }

        //2. sort
        sortData(progress);

        callback(err, progress);
    })
}

function getTeamName(labels) {
    if(labels.indexOf("TeamRenaissance") > -1)
        return "TeamRenaissance";
    if(labels.indexOf("TeamInspiration") > -1)
        return "TeamInspiration";
    if(labels.indexOf("TeamNova") > -1)
        return "TeamNova";
}

function putDataPoint(key, progress, teamName, date, calcStoryPoints, person, uri){
    var dateFound = false;
    for(var k=0; k<progress.dates.length; k++) {
        var pdate = progress.dates[k];
        if((pdate.date - date) == 0) {
            dateFound = true;
            var teamFound = false;
            for(var b=0; b<pdate.teams.length; b++) {
                var team = pdate.teams[b];
                if(team.name == teamName) {
                    teamFound = true;
                    var pages = team.pages;
                    if(pages) {
                        for(var l=0; l< pages.length; l++) {
                            var page = pages[l];
                            if(page.key == key) {
                                page.person = person;
                                page.progress = page.progress + calcStoryPoints;
                                return;
                            }
                        }
                        pages.push({
                              key: key
                            , progress: calcStoryPoints
                            , person: person
                            , uri: uri
                        });
                    }
                    else {
                        team.pages = [{
                              key: key
                            , progress: calcStoryPoints
                            , person: person
                            , uri: uri
                        }];
                    }
                }
            }
            if(!teamFound) {
                pdate.teams.push({
                      name: teamName
                    , pages: [{
                          key: key
                        , progress: calcStoryPoints
                        , person: person
                        , uri: uri
                    }]
                });
            }
        }
    }
    if(!dateFound) {
        progress.dates.push({
              date: date
            , teams: [{
                  name: teamName
                , pages: [{
                      key: key
                    , progress: calcStoryPoints
                    , person: person
                    , uri: uri
                }]
            }]
        });
    }
}
