'use strict';

angular.module('app.controllers', []).
  controller('AppCtrl', ['$scope', '$location', '$timeout', 'alertService', 'progressService', 'vuduFactory',
    function ($scope, $location, $timeout, alertService, progressService, vuduFactory) {
      // console.log('');
      // console.group('AppCtrl');
      
      // alertService.push('AppCtrl to da rescue');
      
      $scope.alerts = alertService.alerts;
      $scope.closeAlert = alertService.close;
      
      $scope.progress = progressService;
      
      $scope.isLoggedIn = vuduFactory.isAuthenticated;
      
      $scope.logOut = function() {
        // console.log('');
        // console.group('UserCtrl.logOut()');
        
        vuduFactory.signOut().then(function(response) {
          // console.log('logOut():success:');
          // console.log('response: ', response);
          
          alertService.push('You have signed off');
          
          $location.url('/login');
        }, function(response) {
          // console.log('logOut():failure:');
          // console.log('response: ', response);
        });
        
        // console.groupEnd();
      }
      
      // console.groupEnd();
    }
  ]).
  filter('toExport', function() {
    return function(input) {
      var r = [];
      var i = 0;
      
      r.push([
        'contentId','title','country','language','lengthSeconds','mpaaRating','releaseTime','studioName','tomatoMeter','type','isUV','isDMA'
      ]);
      
      for(i = 0; i < input.length; i++){
        r.push([
          input[i].contentId,
          '"' + input[i].title.replace(/"/g, '""') + '"',
          input[i].country,
          input[i].language,
          input[i].lengthSeconds,
          input[i].mpaaRating,
          input[i].releaseTime,
          input[i].studio.name,
          input[i].tomatoMeter,
          input[i].type,
          input[i].isUV,
          input[i].isDMA
        ]);
      }
      
      return r;
    };
  }).
  filter('toCsv', function() {
    return function(input) {
      var rows = [];
      var r = '';
      var i = 0;
      
      for(i = 0; i < input.length; i++){
          rows.push(input[i].join(','));
      }
      
      // r = 'data:attachment/csv,' + encodeURI(rows.join('\r\n'));
      r = rows.join('\r\n');
      
      return r;
    };
  }).
  filter('toDownload', function() {
    return function(input) {
      return 'data:attachment/csv,' + encodeURI(input);
    };
  }).
  controller('TitleListCtrl', ['$scope', '$filter', '$http', '$location', '$timeout', '$window', 'alertService', 'progressService', 'vuduFactory', 
    function ($scope, $filter, $http, $location, $timeout, $window, alertService, progressService, vuduFactory) {
      // console.log('');
      // console.group('TitleListCtrl');
      
      progressService.reset();
      
      $scope.displayAs = 'list';
      $scope.$watch('displayAs', function() {
        $window.ga('send', 'pageview', { page: $location.path() + '-as-' + $scope.displayAs });
      });
      
      $scope.query = '';
      $scope.orderProp = '';
      
      $scope.thumbs = {
        pageNum: 0,
        pageInationRange: [],
        pageSize: 36,
        pageTotal: function(){
          if($scope.filtered.titles.length && $scope.thumbs.pageSize > 0){
            return Math.ceil($scope.filtered.titles.length / $scope.thumbs.pageSize);
          } else {
            return 1;
          }
        }
      };
      
      $scope.$watch('thumbs.pageNum', function() {
        if($scope.thumbs.pageNum > $scope.thumbs.pageTotal() - 1){
          $scope.thumbs.pageNum = 0;
        } else if($scope.thumbs.pageNum < 0){
          $scope.thumbs.pageNum = $scope.thumbs.pageTotal() - 1;
        }
      });
      $scope.$watch('thumbs.pageTotal()', function() {
        if($scope.thumbs.pageNum > $scope.thumbs.pageTotal() - 1) $scope.thumbs.pageNum = $scope.thumbs.pageTotal() - 1;
      });
      $scope.$watch('thumbs.pageNum + thumbs.pageTotal()', function() {
        var page = +$scope.thumbs.pageNum; // force int
        var total = +$scope.thumbs.pageTotal();
        var pad = Math.min(Math.floor(total / 2), 3);
        
        if(total){
          $scope.thumbs.pageInationRange.length = 0;
          for(var i = page - pad; i <= page + pad; i++){
            if(i < 0){
              $scope.thumbs.pageInationRange.push(Math.abs(total + i) % total);
            } else {
              $scope.thumbs.pageInationRange.push(Math.abs(i) % total);
            }
          }
        }
      });


      $scope.sum = function (items, prop) {
          if (items == null) {
              return 0;
          }
          return items.reduce(function (a, b) {
              return b[prop] == null ? a + 1 : a + b[prop];
          }, 0);
      };
      
      
      $scope.movieProgress = 0;
      $scope.titles = [];
      $scope.filtered = { titles: [] };
      $scope.totalCount = 0;
      $scope.allCount = 0;
      var cnt = 0;
      var batchLimit = 100;
      
      var getTitles = function() {
        vuduFactory.getTitlesOwned(cnt).then(function(data) {
          $scope.totalCount = data.totalCount;
          
          angular.forEach(data.content, function(value, key) {
            //if(value.subitems)vuduFactory.getBundledTitles(item).then(function(data) {});
            $scope.titles.push(value);
          });

          $scope.allCount = $scope.sum($scope.titles,'count');
          
          if(data.moreBelow && cnt < batchLimit - 1){
            cnt++;
            
            $scope.movieProgress = Math.ceil($scope.titles.length * 100 / $scope.totalCount);
            
            getTitles();
          } else {
            // progressService.reset();
            $scope.movieProgress = 100;
          }
          progressService.value = ($scope.movieProgress + $scope.tvProgress) / 2;
          progressService.type = progressService.value==100 ? 'success' : '';
          
        }, function(response) {
          
          if(response.data.error == true && response.data.status == 'authenticationExpired'){
            alertService.push('Authentication expired. Please sign off and sign in again.', 'warning');
          } else if(response.data.error == true && response.data.status){
            alertService.push('Error occurred. (' + response.data.status + ')', 'warning');
          } else {
            alertService.push('Unknown error occured. Please sign off and try again. If the problem persists, please wait an hour and/or let FattyMoBookyButt know in the vudu forums.', 'warning');
          }
          
        }, function(response) {
          // console.log('getTitlesOwned:notify:');
          // console.log('data: ', data);
        });
      }
      getTitles();



      $scope.tvProgress = 0;
      $scope.tv = [];
      $scope.filtered.tv = [];
      $scope.totalTV = 0;
      $scope.allTV = 0;

      var cntTV = 0;
      
      var getTV = function() {
        vuduFactory.getTVOwned(cntTV).then(function(data) {
          $scope.totalTV = data.totalCount;
          
          angular.forEach(data.content, function(value, key) {
            //if(value.subitems)vuduFactory.getBundledTitles(item).then(function(data) {});
            $scope.tv.push(value);
          });

          $scope.allTV = $scope.sum($scope.tv,'count');
          
          if(data.moreBelow && cntTV < batchLimit - 1){
            cntTV++;
            
            $scope.tvProgress = Math.ceil($scope.tv.length * 100 / $scope.totalTV);
            
            getTV();
          } else {
            // progressService.reset();
            $scope.tvProgress = 100;
          }
          progressService.value = ($scope.movieProgress + $scope.tvProgress) / 2;
          progressService.type = progressService.value==100 ? 'success' : '';
          
        }, function(response) {
          
          if(response.data.error == true && response.data.status == 'authenticationExpired'){
            alertService.push('Authentication expired. Please sign off and sign in again.', 'warning');
          } else if(response.data.error == true && response.data.status){
            alertService.push('Error occurred. (' + response.data.status + ')', 'warning');
          } else {
            alertService.push('Unknown error occured. Please sign off and try again. If the problem persists, please wait an hour and/or let FattyMoBookyButt know in the vudu forums.', 'warning');
          }
          
        }, function(response) {
          // console.log('getTitlesOwned:notify:');
          // console.log('data: ', data);
        });
      }
      getTV();


      // $scope.uvvuLink = function(id) {
      //   window.open('https://www.uvvu.com/en/us/library/' + slug); // need access to uvvu (have urn)
      // }
      
      $scope.vuduLink = function(id) {
        window.open('http://www.vudu.com/movies/#!content/' + id);
      }
    }
  ]).
  controller('TitleDetailCtrl', ['$scope', '$routeParams',
    function ($scope, $routeParams) {
      // console.log('TitleDetailCtrl: $routeParams: ', $routeParams);
      $scope.id = $routeParams.id;
    }]).
  controller('UserCtrl', ['$scope', '$location', 'alertService', 'vuduFactory',
    function ($scope, $location, alertService, vuduFactory) {
      
      $scope.error = null;
      $scope.user = null;
      
      $scope.logIn = function() {
        alertService.clear();
        $scope.error = null;
        
        vuduFactory.signIn($scope.user.userName, $scope.user.password).then(function(response) {
          
          $location.url('/titles');
        }, function(response) {
          if(response.data && response.data.error){
            $scope.error = {
              message: response.data.message,
              status: response.data.status
            }
          } else {
            $scope.error = {
              message: 'Error occurred',
              status: 'unknownError'
            }
          }
        });
      }
    }]);
