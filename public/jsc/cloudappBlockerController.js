/**
 * Created by Edhar_Liashok on 10/15/2014.
 */

function cloudAppController($scope, $resource, $window, $filter){
    var cloudAppDataResource = $resource('/cloudappsdata?team=:team', {team: "@filteredTeam", cloudApp: "@cloudAppInput"});

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/

    $scope.init = function () {
        //$scope.common = {};
        $scope.isLoading = true;

        if(!$scope.filteredTeam)
        {
            $scope.filteredTeam = 'TeamNova';
        }

        $scope.dataLoad();
    };

    $scope.predicate = 'appName';

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

    $scope.previousCloud = '';
    $scope.previousCloudSkipped = false;

    $scope.showCloud = function(cloud){

        if(cloud == $scope.previousCloud){
            $scope.previousCloudSkipped = true;
            return false;
        }

        $scope.previousCloud = cloud;
        $scope.previousCloudSkipped = false;

        return true;
    };

    $scope.getSpan = function(cloudName, rowspans)
    {
        return rowspans[cloudName];
    };

    $scope.color_codes = {};
    $scope.stringToColorCode = function(str) {
        return (str in $scope.color_codes) ? $scope.color_codes[str] : ($scope.color_codes[str] = '#'+ ('000000' + (Math.random()*0xFFFFFF<<0).toString(16)).slice(-6));
    };

    $scope.init();
}