/**
 * Created by Edhar_Liashok on 10/15/2014.
 */

function cloudAppController($scope, $resource, $window){
    var cloudAppDataResource = $resource('/cloudappsdata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/

    $scope.init = function () {
        $scope.common = {};
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

        cloudAppDataResource.get(getTimeSheetSuccess, getTimeSheetFail);
        return loadingDfrd.promise();
    };

    $scope.init();
}