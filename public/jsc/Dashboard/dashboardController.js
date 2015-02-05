/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */

function dashboardController($scope, $resource, $window, $filter, $modal,  $sce, $timeout, localStorageService) {
    //var timeSheetDataResource = $resource('/personalData/:from/:to',{from: "@from", to: "@to"});
    var issueDataResource = $resource('/issuesData');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.common.filteredTeam = $scope.allTeams[1].id;
        $scope.common.filteredStream = $scope.allStreams[0].id;
        $scope.loadStorageFromLocalDb();
        $scope.isLoading = true;

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.isLoading = true;
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.getDashboardData();
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getDashboardData = function () {
        var loadingDfrd = $.Deferred();

        var getIssueSuccess = function (data) {
            $scope.issueData = data;
            loadingDfrd.resolve();
            $scope.$broadcast('issueDataLoaded');
            $scope.isLoading = false;
        };

        var getIssueFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        issueDataResource.query(getIssueSuccess, getIssueFail);
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
//    $scope.onDateChange = function()
//    {
//        $scope.reInit();
//    }
//
//    $scope.onCellClick = function(item) {
//
//        var modalInstance = $modal.open({
//            templateUrl: '/pages/modal/timeSheetPageModal.html',
//            controller: timeSheetPageModalController,
//            size: "sm",
//            resolve: {
//                item: function () {
//                    return item;
//                }
//            }
//        });
//    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/

    $scope.saveStorageToLocalDb = function() {
        // save session
        var storage = {
            team:  $scope.common.filteredTeam,
            stream: $scope.common.filteredStream
        };
        localStorageService.set('dashboardController', storage);
    };

    $scope.loadStorageFromLocalDb = function() {
        // restore session
        if(!_.isEmpty(localStorageService.get('dashboardController')))
        {
            try {
                var storage = localStorageService.get('dashboardController');
                $scope.common.filteredTeam = storage.team;
                $scope.common.filteredStream = storage.stream;
            }
            catch (ex) {
                console.error(ex);
            }
        }
    };

    $timeout(function(){
        $scope.init();
    });
}
