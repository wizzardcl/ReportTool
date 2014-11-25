var updateLabels = require('../middleware/updateLabels');

exports.post = function (req, res) {
    var params = {
        username: req.body.username,
        password: req.body.password,
        jqlQuery: req.body.jqlquery,
        labelsToAdd: req.body.labelstoadd,
        labelsToDelete: req.body.labelstodelete,
        watchersToAdd: req.body.watcherstoadd,
        watchersToDelete: req.body.watcherstodelete,
        assigneeName: req.body.assigneename,
        priorityName: req.body.priorityname
    };

    updateLabels.processItems(params, function (err) {
        if (err) {
        }
    });
    res.send({});
};

exports.rememberResponse = function(res) {
    updateLabels.rememberResponse(res);
};