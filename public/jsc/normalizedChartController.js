/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function normalizedChartController($scope, $resource, $window) {
    var velocitySeriesResource = $resource('/normalizeddata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $.when($scope.getReportData())
            .done($scope.initCharts);
    };

    // Original link to use setup chart directive
    // https://github.com/pablojim/highcharts-ng
    $scope.initCharts = function () {
        $('#container').highcharts({
            chart: {
                type: 'areaspline',
                zoomType: 'x'
            },
            title: {
                text: 'Hours per SP by Cloud App',
                x: -20 //center
            },
            subtitle: {
                text: 'Source: jira.epam.com',
                x: -20
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: {
                title: {
                    text: 'Development effort (Hours)'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            tooltip: {
                formatter: function () {
                    return this.point.tooltip;
                }
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'center',
                borderWidth: 0
            },
            series: $scope.chartsData.data
        });
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getReportData = function () {
        var loadingDfrd = $.Deferred();
        var getChartSuccess = function (data) {
            $scope.chartsData = data;
            var averageSeries = [];
            _.each($scope.chartsData.data, function(itemSeries){
                averageSeries.push({
                    name: itemSeries.name + ':trend',
                    type: 'line',
                    marker: { enabled: false },
                    visible: itemSeries.name == 'Development Time Total' || itemSeries.name == 'QA Time Total' ? true : false,
                    data: (function() {
                        return itemSeries.data.length > 1 ? fitData(itemSeries.data).data : itemSeries.data;
                    })()
                });
            });

            $scope.chartsData.data = _.union($scope.chartsData.data, averageSeries);
            loadingDfrd.resolve();
        };

        var getChartFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        velocitySeriesResource.get(getChartSuccess, getChartFail);
        return loadingDfrd.promise();
    };

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.init();
}

