/**
 * Created by Edhar_Liashok on 10/15/2014.
 */

function cloudAppController($scope, $resource, $window, $filter){
    var cloudAppDataResource = $resource('/cloudappsdata?team=:team', {team: "@filteredTeam", cloudApp: "@cloudAppInput"});

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/

    $scope.init = function () {
        //$scope.common = {};
        $scope.isLoading = true;
        $scope.filteredTeam = 'TeamNova';

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.isLoading = true;
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.getCloudAppData();
    };

    /* --------------------------------------------- Actions ------------------------------*/

    $scope.getCloudAppData = function () {
        var loadingDfrd = $.Deferred();

        var getTimeSheetSuccess = function (data) {
            $scope.cloudAddData = data;
            $scope.isLoading = false;
            loadingDfrd.resolve();
        };

        var getTimeSheetFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        cloudAppDataResource.get({team: $scope.filteredTeam, cloudApp: $scope.cloudAppInput},getTimeSheetSuccess, getTimeSheetFail);
        return loadingDfrd.promise();
    };

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/

    $scope.onTeamChange = function()
    {
        $scope.reInit();
    };

    $scope.onCloudAppChange = function()
    {
        //$scope.reInit();
    };

    $scope.init();
}