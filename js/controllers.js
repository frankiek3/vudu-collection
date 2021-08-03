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
      var r = [[ 'videoQuality','bestAvailVideoQuality','contentId','title','country','language',
        'lengthSeconds','mpaaRating','releaseTime','studioName','tomatoMeter','type','isUV','isMA'
      ]];
      for(var i = 0; i < input.length; i++){
        r.push([
          input[i].videoQuality,
          input[i].bestAvailVideoQuality,
          input[i].contentId,
          '"' + input[i].title.replace(/"/g, "'") + '"',
          input[i].country,
          input[i].language,
          input[i].lengthSeconds,
          input[i].mpaaRating,
          input[i].releaseTime,
          input[i].studio.name,
          input[i].tomatoMeter,
          input[i].type,
          input[i].isUV,
          input[i].isMA
        ]);
      }
      return r;
    };
  }).
filter('toTVExport', function() {
    return function(input) {
      var r = [[ 'videoQuality','bestAvailVideoQuality','contentId','title','country','language',
        'lengthSeconds','mpaaRating','releaseTime','studioName','tomatoMeter','type','isUV'
      ]];
      for(var i = 0; i < input.length; i++){
        r.push([
          input[i].videoQuality,
          input[i].bestAvailVideoQuality,
          input[i].contentId,
          '"' + input[i].title.replace(/"/g, "'") + '"',
          input[i].country,
          input[i].language,
          input[i].lengthSeconds,
          input[i].mpaaRating,
          input[i].releaseTime,
          input[i].studio.name,
          input[i].tomatoMeter,
          input[i].type,
          input[i].isUV
        ]);
        if(input[i].subitems)
        {
          var subitem = input[i].subitems;
          for(var j = 0; j < subitem.length; j++){
            if(subitem[j].type == 'episode') break;
            r.push([
              subitem[j].videoQuality,
              subitem[j].bestAvailVideoQuality,
              subitem[j].contentId,
              '"' + subitem[j].title.replace(/"/g, "'") + '"',
              subitem[j].country,
              subitem[j].language,
              subitem[j].lengthSeconds,
              subitem[j].mpaaRating,
              subitem[j].releaseTime,
              subitem[j].studio.name,
              subitem[j].tomatoMeter,
              subitem[j].type,
              subitem[j].isUV
            ]);
          }
        }
      }
      return r;
    };
  }).
filter('toCsv', function() {
    return function(input) {
      var rows = [];
      for(var i = 0; i < input.length; i++){
          rows.push(input[i].join(','));
      }
      return rows.join('\r\n');
    };
  }).
filter('toDownload', function() {
    return function(input) {
      return 'data:attachment/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(input);
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
        //if($scope.displayAs=='tv') getTV();
      });

      var videoQualityList = {"sd": 0, "hd": 1, "hdx": 2, "uhd": 3};//Temp
      $scope.contentVariants = {};
      $scope.movieProgress = 0;
      $scope.titles = [];
      $scope.filtered = { titles: [], tv: [], importTitles: [], importTv: [], wishlist: []};
      $scope.totalCount = 0;
      $scope.allCount = 0;
      $scope.importTitles = [];
      $scope.importTv = [];
      $scope.changes = {missingtitles: {}, downgradedtitles: {}, missingtv: {}, downgradedtv: {}, addedtitles: {}, upgradedtitles: {}, }, addedtv: {}, upgradedtv: {}};
      //$scope.objectkeys = Object.keys;
      $scope.compareFile = function(importName) {
        progressService.reset();
        var exportName = importName.replace('importT', 't');
        var compared = {};
        $scope.changes = {missingtitles: {}, downgradedtitles: {}, missingtv: {}, downgradedtv: {}, addedtitles: {}, upgradedtitles: {}, }, addedtv: {}, upgradedtv: {}};
        //$scope.changes["missing"+exportName] = {};
        //$scope.changes["downgraded"+exportName] = {};

        for(var i = $scope.filtered[exportName].length-1; i>=0; i--)
        {
          var value = $scope.filtered[exportName][i];
          if(!compared[value.contentId] || (compared[value.contentId] && videoQualityList[compared[value.contentId]] < videoQualityList[value.videoQuality]))
          {
            compared[value.contentId] = value.videoQuality;
          }
          if(value.subitems)
          {
            for(var j = value.subitems.length-1; j>=0; j--)
            {
              var subvalue = value.subitems[j];
              //if(subvalue.type == 'episode') break;
              if(!compared[subvalue.contentId] || (compared[subvalue.contentId] && videoQualityList[compared[subvalue.contentId]] < videoQualityList[subvalue.videoQuality]))
              {
                compared[subvalue.contentId] = subvalue.videoQuality;
              }
            }
          }
        }

        for(var i = $scope.filtered[importName].length-1; i>=0; i--)
        {
          var value = $scope.filtered[importName][i];
          if(value.videoQuality != '')
          {
            //Missing
            if(compared[value.contentId] === undefined)
            {
              $scope.changes["missing"+exportName][value.contentId] = value.videoQuality;
            }
            //Exists
            else
            {
              //Downgraded
              if(videoQualityList[compared[value.contentId]] < videoQualityList[value.videoQuality])
              {
                $scope.changes["downgraded"+exportName][value.contentId] = value.videoQuality;
              }
              //Upgraded
              else if(videoQualityList[compared[value.contentId]] > videoQualityList[value.videoQuality])
              {
                $scope.changes["upgraded"+exportName][value.contentId] = value.videoQuality;
              }
              //delete $scope.changes["missing"+exportName][value.contentId];
              delete compared[value.contentId];
            }
          }
          progressService.value = 100 * Math.ceil(1 - (i / $scope.filtered[importName].length));
        }
        //Added
        $scope.changes["added"+exportName] = compared;
        progressService.type = progressService.value==100 ? 'success' : '';
      };

      $scope.findids = function(ids){
        return function(item){
          return ids.find(k=> item.contentId == k)
        }
      };

      $scope.exportDate = (new Date()).toISOString().slice(0,10).replace(/-/g,"");
      $scope.query = '';
      $scope.orderProp = '';
      $scope.orderList = [ { value: "", text: "Date Acquired"},
        { value: "titleSort", text: "Alphabetical"},
        { value: ["-bestAvailVideoQuality","-videoQuality"], text: "Video Quality"},
        { value: "mpaaRating", text: "MPAA"},
        { value: "-releaseTime", text: "Release Date"},
        { value: "studio.name", text: "Studio"},
        { value: "-tomatoMeter", text: "Tomato Rating"},
        { value: "-isUV", text: "UltraVioletness"},
        { value: "price", text: "Price"} ];
      
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

      $scope.TVthumbs = {
        pageNum: 0,
        pageInationRange: [],
        pageSize: 36,
        pageTotal: function(){
          if($scope.filtered.tv.length && $scope.TVthumbs.pageSize > 0){
            return Math.ceil($scope.filtered.tv.length / $scope.TVthumbs.pageSize);
          } else {
            return 1;
          }
        }
      };

      $scope.Wishthumbs = {
        pageNum: 0,
        pageInationRange: [],
        pageSize: 36,
        pageTotal: function(){
          if($scope.filtered.wishlist.length && $scope.Wishthumbs.pageSize > 0){
            return Math.ceil($scope.filtered.wishlist.length / $scope.Wishthumbs.pageSize);
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

      $scope.$watch('TVthumbs.pageNum', function() {
        if($scope.TVthumbs.pageNum > $scope.TVthumbs.pageTotal() - 1){
          $scope.TVthumbs.pageNum = 0;
        } else if($scope.TVthumbs.pageNum < 0){
          $scope.TVthumbs.pageNum = $scope.TVthumbs.pageTotal() - 1;
        }
      });

      $scope.$watch('Wishthumbs.pageNum', function() {
        if($scope.Wishthumbs.pageNum > $scope.Wishthumbs.pageTotal() - 1){
          $scope.Wishthumbs.pageNum = 0;
        } else if($scope.Wishthumbs.pageNum < 0){
          $scope.Wishthumbs.pageNum = $scope.Wishthumbs.pageTotal() - 1;
        }
      });

      $scope.$watch('thumbs.pageTotal()', function() {
        if($scope.thumbs.pageNum > $scope.thumbs.pageTotal() - 1) $scope.thumbs.pageNum = $scope.thumbs.pageTotal() - 1;
      });

      $scope.$watch('TVthumbs.pageTotal()', function() {
        if($scope.TVthumbs.pageNum > $scope.TVthumbs.pageTotal() - 1) $scope.TVthumbs.pageNum = $scope.TVthumbs.pageTotal() - 1;
      });

      $scope.$watch('Wishthumbs.pageTotal()', function() {
        if($scope.Wishthumbs.pageNum > $scope.Wishthumbs.pageTotal() - 1) $scope.Wishthumbs.pageNum = $scope.Wishthumbs.pageTotal() - 1;
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

      $scope.$watch('TVthumbs.pageNum + TVthumbs.pageTotal()', function() {
        var page = +$scope.TVthumbs.pageNum; // force int
        var total = +$scope.TVthumbs.pageTotal();
        var pad = Math.min(Math.floor(total / 2), 3);
        
        if(total){
          $scope.TVthumbs.pageInationRange.length = 0;
          for(var i = page - pad; i <= page + pad; i++){
            if(i < 0){
              $scope.TVthumbs.pageInationRange.push(Math.abs(total + i) % total);
            } else {
              $scope.TVthumbs.pageInationRange.push(Math.abs(i) % total);
            }
          }
        }
      });

      $scope.$watch('Wishthumbs.pageNum + Wishthumbs.pageTotal()', function() {
        var page = +$scope.Wishthumbs.pageNum; // force int
        var total = +$scope.Wishthumbs.pageTotal();
        var pad = Math.min(Math.floor(total / 2), 3);
        
        if(total){
          $scope.Wishthumbs.pageInationRange.length = 0;
          for(var i = page - pad; i <= page + pad; i++){
            if(i < 0){
              $scope.Wishthumbs.pageInationRange.push(Math.abs(total + i) % total);
            } else {
              $scope.Wishthumbs.pageInationRange.push(Math.abs(i) % total);
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
      
      var batchLimit = 1000;
      var cnt = 0;
      
      var getTitles = function() {
        vuduFactory.getTitlesOwned(cnt, $scope.contentVariants).then(function(data) {
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

            getTV();
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
      };


      $scope.tvProgress = 0;
      $scope.tv = [];
      $scope.totalTV = 0;
      $scope.allTV = 0;

      var cntTV = 0;

/*
      var initTV = function() {
        vuduFactory.getTVOwned(cntTV, $scope.contentVariants).then(function(data) {
          $scope.totalTV = data.totalCount;
          
          angular.forEach(data.content, function(value, key) {
            //if(value.subitems)vuduFactory.getBundledTitles(item).then(function(data) {});
            $scope.tv.push(value);
          });

          $scope.allTV = $scope.sum($scope.tv,'count');
          
          if(data.moreBelow && cntTV < batchLimit - 1){
            cntTV++;
            $scope.tvProgress = Math.ceil($scope.tv.length * 100 / $scope.totalTV);
          } else {
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
      };
*/

      var getTV = function() {
        vuduFactory.getTVOwned(cntTV, $scope.contentVariants).then(function(data) {
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
            $scope.tvProgress = 100;
            getWished();
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
      };


      var allCnt = 0;

      var getContent = function() {
        vuduFactory.getContentVariantsOwned(allCnt).then(function(data) {
          //$scope.totalCount = data.totalCount;
          
          angular.forEach(data.content, function(value, key) {
            if($scope.contentVariants[key])
            {
              //console.log("Duplicate contentId: "+key);
              if(videoQualityList[value.videoQuality] > videoQualityList[$scope.contentVariants[key].videoQuality])
              {
                $scope.contentVariants[key] = value;
              }
            }
            else
            {
              $scope.contentVariants[key] = value;
            }
          });

          //$scope.allCount = $scope.sum($scope.titles,'count');
          
          if(data.moreBelow && allCnt < batchLimit - 1){
            allCnt++;
            
            //$scope.movieProgress = Math.ceil($scope.titles.length * 100 / $scope.totalCount);
            
            getContent();
          } else {
            // progressService.reset();
          //  $scope.movieProgress = 100;
            
            getTitles();
          }
          //progressService.value = ($scope.movieProgress + $scope.tvProgress) / 2;
          //progressService.type = progressService.value==100 ? 'success' : '';
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
      };

      $scope.wishlistProgress = 0;
      $scope.wishlist = [];
      //$scope.filtered.wishlist = [];
      //$scope.totalWish = 0;
      //$scope.allWish = 0;

      var cntWish = 0;

      var getWished = function() {
        vuduFactory.getWishList(cntWish, {}).then(function(data) {
          //$scope.totalCount = data.totalCount;
          
          angular.forEach(data.content, function(value, key) {
            //if(value.subitems)vuduFactory.getBundledTitles(item).then(function(data) {});
            $scope.wishlist.push(value);
          });

          //$scope.allCount = $scope.sum($scope.titles,'count');
          
          if(data.moreBelow && cntWish < batchLimit - 1){
            cntWish++;
            
            $scope.wishlistProgress = Math.ceil($scope.wishlist.length / cntWish);
            
            getWished();
          } else {
            // progressService.reset();
            $scope.wishlistProgress = 100;
          }
          progressService.value = ($scope.movieProgress + $scope.tvProgress + $scope.wishlistProgress) / 3;
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
          // console.log('getWishList:notify:');
          // console.log('data: ', data);
        });
      };

      getContent();

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

	  if(window.cf && window.cf.cfsubmit)
	  {
		  window.cf.cfsubmit();
	  }

	  vuduFactory.signIn($scope.user.userName, $scope.user.password, $scope.user.logintype, document.getElementById('sensor_data').value, $scope.user.userId, $scope.user.sessionKey).then(function(response){
			  $location.url('/titles');
		  }, function(response) {
			  if(response.data && response.data.error){
				$scope.error = {
					message: response.data.message,
					status: response.data.status
				};
			  } else {
				  $scope.error = {
					  message: 'Error occurred',
					  status: 'unknownError'
			  };
			}
		});
	}
}]);
