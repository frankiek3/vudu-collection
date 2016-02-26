'use strict';

angular.module('app.services', []).
  factory('alertService', function() {
    var alerts = [];

    var clear = function() {
      alerts.splice(0, alerts.length);
    };

    var close = function(index) {
      alerts.splice(index, 1);
    };

    var push = function(msg, type){
      type = type || 'success';
      alerts.push({type: type, msg: msg});
    };

    return {
      alerts: alerts
      , clear: clear
      , close: close
      , push: push
    }
  }).

  factory('progressService', function() {
    var value = 0;
    var type = 'success';

    var reset = function() {
      this.value = 0;
      this.type = 'success';
    };

    return {
      value: value
      , type: type
      , reset: reset
    }
  }).
  factory('vuduFactory', function($http, $q, $cookieStore, $timeout) {
    var url = 'https://api.vudu.com/api2/';
    var cachedurl = "http://apicache.vudu.com/api2/";
    var appId = 'fmbb-vudu-collection';
    var count = 100;
    var user = null;
		
    var isAuthenticated = function() {
      return user && user.sessionKey && user.id;
    };
		
    var sessionKeyRequest = function(userName, password) {
      return $http.jsonp(url, { 
        params: {
          claimedAppId: appId,
          format: 'application/json',
          callback: 'JSON_CALLBACK',
          _type: 'sessionKeyRequest',
          followup: 'user',
          password: password,
          userName: userName
        }
      }).then(function(response) {
        if(response.data && response.data.status){
          if(response.data.status[0] == 'success'){
            user = {
              id: response.data.sessionKey[0].userId[0],
              expirationTime: response.data.sessionKey[0].expirationTime[0],
              sessionKey: response.data.sessionKey[0].sessionKey[0]
            }						
          } else if(response.data.status[0] == 'loginFailed'){
            console.log('loginFailed: reject it');
            response.data = { 
              error: true, 
              message: 'Login failed',
              status: response.data.status[0]
            };
            return $q.reject(response);
          }
        }
        return response || $q.when(response);
			}, function(response) {
				console.log('vuduFactory.sessionKeyRequest():failure:response');
				console.log('response: ', response);
				return response;
			}, function(response) {
				console.log('vuduFactory.sessionKeyRequest():notify');
				console.log('response: ', response);
				return response;
			});
		}
		
		var signOut = function() {
			var deferred = $q.defer();
			user = null;
			$cookieStore.remove('ffmbVuduCollection_id');
			$cookieStore.remove('ffmbVuduCollection_expirationTime');
			$cookieStore.remove('ffmbVuduCollection_sessionKey');
			
			$timeout(function() {
				deferred.resolve({status: 'success', message: 'Signed out'});
			}, 100);
			return deferred.promise;
		};

		var getTVOwned = function(page) {
			return $http.jsonp(url, { 
				params: {
					claimedAppId: appId,
					format: 'application/json',
					_type: 'contentSearch',
					count: count,
					dimensionality: 'any',
					followup: ['ratingsSummaries', 'totalCount'],
					groupBy: 'series',
					listType: 'owned',//'rentedOrOwned'
					offset: page * count,
					sessionKey: user.sessionKey,
					sortBy: '-purchaseTime',
					superType: 'tv',
					type: ['episode', 'season', 'bundle', 'series'],
					userId: user.id,
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
				return parseVuduResponse(response);
			}, function(response) {
				console.log('vuduFactory.getTVOwned():failure:');
				console.log('response: ', response);
			}, function(response) {
				console.log('vuduFactory.getTVOwned():notify:');
				console.log('response: ', response);
			});
		};

		var getTitlesOwned = function(page) {
			return $http.jsonp(url, { 
				params: {
					claimedAppId: appId,
					format: 'application/json',
					_type: 'contentSearch',
					count: count,
					dimensionality: 'any',
					followup: ['ratingsSummaries', 'totalCount'],
					listType: 'owned',//'rentedOrOwned'
					offset: page * count,
					sessionKey: user.sessionKey,
					sortBy: '-purchaseTime',
					superType: 'movies',
					type: ['program', 'bundle'],
					userId: user.id,
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
				return parseVuduResponse(response);
			}, function(response) {
				console.log('vuduFactory.getTitlesOwned():failure:');
				console.log('response: ', response);
			}, function(response) {
				console.log('vuduFactory.getTitlesOwned():notify:');
				console.log('response: ', response);
			});
		};

		var getContentVariantsOwned = function(page) {
			return $http.jsonp(url, { 
				params: {
					claimedAppId: appId,
					format: 'application/json',
					_type: 'contentVariantSearch',
					count: 1000,
					dimensionality: 'any',
					followup: ['videoQuality', 'totalCount'],
					listType: 'owned',//'rentedOrOwned'
					offset: page * 1000,
					responseSubset: 'micro',
					sessionKey: user.sessionKey,
					userId: user.id,
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
				return parseVuduResponse(response);
			}, function(response) {
				console.log('vuduFactory.getTitlesOwned():failure:');
				console.log('response: ', response);
			}, function(response) {
				console.log('vuduFactory.getTitlesOwned():notify:');
				console.log('response: ', response);
			});
		};


    var getSeriesSeasons = function(item) {
      return $http.jsonp(cachedurl, { 
        params: {
					claimedAppId: appId,
					format: 'application/json',
					_type: 'contentSearch',
					followup: ['promoTags', 'ratingsSummaries', 'totalCount'],
					includeComingSoon: true,
					listType: 'useful',
					offset: 0,
					responseSubset: 'micro',
					seriesId: item.contentId,
					sortBy: '-seasonNumber',
					type: 'season',
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
        return parseVuduResponse(response);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():failure:');
        console.log('response: ', response);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():notify:');
        console.log('response: ', response);
      });
    };

//claimedAppId=myvudu&format=application/json&_type=contentVariantSearch&count=100&dimensionality=any&listType=rented&offset=0&sessionKey=&userId=8202225


    var getSeasonEpisodes = function(item) {
      return $http.jsonp(cachedurl, { 
        params: {
					claimedAppId: appId,
					format: 'application/json',
					_type: 'contentSearch',
					count: 100,//
					followup: ['ratingsSummaries', 'usefulStreamableOffers', 'totalCount'],//
					includeComingSoon: true,
					listType: 'useful',
					seasonId: item.contentId,
					sortBy: 'episodeNumberInSeason',
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
        return parseVuduResponse(response);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():failure:');
        console.log('response: ', response);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():notify:');
        console.log('response: ', response);
      });
    };

    var getBundledTitles = function(item) {
      return $http.jsonp(cachedurl, { 
        params: {
					claimedAppId: appId,
					format: 'application/json',
					_type: 'contentSearch',
					containerId: item.contentId,
					count: 100,//
					depthMax: 1,
					followup: ['promoTags', 'ratingsSummaries', 'totalCount'],
					listType: 'useful',
					offset: 0,
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
        return parseVuduResponse(response);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():failure:');
        console.log('response: ', response);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():notify:');
        console.log('response: ', response);
      });
    };

    var parseVuduKey = function(data, key) {
      return data[key] && data[key][0];
    };

    var parseVuduType = function(data) {
      var item = {};
      
      if(data._type == 'content'){
        // if(!data.contentId || !data.contentId[0]) console.log('NOFIND: data.contentId');
        // if(!data.title || !data.title[0]) console.log('NOFIND: data.title');
        // if(!data.description || !data.description[0]) console.log('NOFIND: data.description');
        // if(!data.bestDashVideoQuality || !data.bestDashVideoQuality[0]) console.log('NOFIND: data.bestDashVideoQuality');
        // if(!data.country || !data.country[0]) console.log('NOFIND: data.country');
        // if(!data.distributionStudio || !data.distributionStudio[0]) console.log('NOFIND: data.distributionStudio');
        // if(!data.language || !data.language[0]) console.log('NOFIND: data.language');
        // if(!data.lengthSeconds || !data.lengthSeconds[0]) console.log('NOFIND: data.lengthSeconds');
        // if(!data.mpaaRating || !data.mpaaRating[0]) console.log('NOFIND: data.mpaaRating');
        // if(!data.placardUrl || !data.placardUrl[0]) console.log('NOFIND: data.placardUrl');
        // if(!data.posterCopyright || !data.posterCopyright[0]) console.log('NOFIND: data.posterCopyright');
        // if(!data.posterUrl || !data.posterUrl[0]) console.log('NOFIND: data.posterUrl');
        // if(!data.ratingsSummaries || !data.ratingsSummaries[0]) console.log('NOFIND: data.ratingsSummaries');
        // if(!data.releaseTime || !data.releaseTime[0]) console.log('NOFIND: data.releaseTime');
        // if(!data.starRating || !data.starRating[0]) console.log('NOFIND: data.starRating');
        // if(!data.studio || !data.studio[0]) console.log('NOFIND: data.studio');
        // if(!data.tomatoMeter || !data.tomatoMeter[0]) console.log('NOFIND: data.tomatoMeter');
        // if(!data.type || !data.type[0]) console.log('NOFIND: data.type');
        // if(!data.ultraVioletLogicalAssetId || !data.ultraVioletLogicalAssetId[0]) console.log('NOFIND: data.ultraVioletLogicalAssetId');
        
        item = {
          _type: data._type,
          
          contentId: data.contentId[0],
          title: data.title && data.title[0],
          description: data.description && data.description[0],
          

          videoQuality: data.videoQuality ? data.videoQuality[0] : null,
//videoQuality
          bestAvailVideoQuality: data.bestStreamableVideoQuality ? data.bestStreamableVideoQuality[0] : null,
//data.bestDashVideoQuality ? data.bestDashVideoQuality[0] : null,
//bestStreamableVideoQuality
          country: data.country ? data.country[0] : null,
          distributionStudio: data.distributionStudio ? parseVuduType(data.distributionStudio[0]) : null,
          language: data.language ? data.language[0] : null,
          lengthSeconds: data.lengthSeconds ? data.lengthSeconds[0] : null,
          mpaaRating: data.mpaaRating ? data.mpaaRating[0] : null,
          placardUrl: data.placardUrl ? data.placardUrl[0] : null,
          posterCopyright: data.posterCopyright ? data.posterCopyright[0] : null,
          posterUrl: data.posterUrl ? data.posterUrl[0] : null,
          ratingsSummaries: data.ratingsSummaries ? parseVuduType(data.ratingsSummaries[0]) : null,
          releaseTime: data.releaseTime ? data.releaseTime[0] : null,
          starRating: data.starRating ? data.starRating[0] : 0,
          studio: data.studio ? parseVuduType(data.studio[0]) : null,
          tomatoMeter: data.tomatoMeter ? +data.tomatoMeter[0] : 0,
          type: data.type ? data.type[0] : null,
          haveUV: data.ultraVioletSyncStatus && data.ultraVioletSyncStatus[0],//"imported","exported"
          hasUV: data.ultraVioletLogicalAssetId && data.ultraVioletLogicalAssetId[0],
          isDMA: data.keyChestEditionUmid && data.keyChestEditionUmid[0],
//ptoKeyChestEligible

//type == "episode"
          containerIds: data.containerId,
          seasonId: data.seasonId && data.seasonId[0],
          seasonNumber: data.seasonNumber && data.seasonNumber[0],
          seriesId: data.seriesId && data.seriesId[0],
          episodeNumberInSeason: data.episodeNumberInSeason && data.episodeNumberInSeason[0],

          
          // colorType: data.colorType ? data.colorType[0] : null,
          // 
          // containerId: data.containerId || null,
          // contentRating: parseVuduType(data.contentRating[0]),
          //           
          // bestDashVideoQuality: data.bestDashVideoQuality[0],
          // bestFlashVideoQuality: data.bestFlashVideoQuality[0],
          // bestLiveStreamVideoQuality: data.bestLiveStreamVideoQuality[0],
          // dashTrailerEditionId: data.dashTrailerEditionId[0],
          // flashTrailerEditionId: data.flashTrailerEditionId[0],
          // livestreamTrailerEditionId: data.livestreamTrailerEditionId[0],
          // streamableTrailerEditionId: data.streamableTrailerEditionId[0],
          // transportStreamTrailerEditionId: data.transportStreamTrailerEditionId[0],
          // hasSomeFlashEditions: data.hasSomeFlashEditions[0],
          // hasSomeLivestreamEditions: data.hasSomeLivestreamEditions[0],
          // hasSomeTransportStreamEditions: data.hasSomeTransportStreamEditions[0],
          // 
          // featured: data.featured[0],
          // hasAacAudioTrack: data.hasAacAudioTrack[0],
          // hasBonusWithTagExtras: data.hasBonusWithTagExtras[0],
          // hasSimilar: data.hasSimilar[0],
          // isGiftable: data.isGiftable[0],
          // 
          // tomatoCertifiedFresh: data.tomatoCertifiedFresh ? data.tomatoCertifiedFresh[0] : null,
          // tomatoIcon: data.tomatoIcon ? data.tomatoIcon[0] : null,
          // 
          // ultraVioletLogicalAssetId: data.ultraVioletLogicalAssetId ? data.ultraVioletLogicalAssetId[0] : null,
          // ultraVioletSyncStatus: data.ultraVioletSyncStatus ? data.ultraVioletSyncStatus[0] : null
        }
        item.isUV = item.haveUV || item.hasUV;
        item.titleSort = item.title.replace(/^(A|An|The)+\s+/i, '');
        if(item.mpaaRating == 'nrFamilyFriendly') item.mpaaRating = 'nrff';
        if(item.releaseTime) item.releaseYear = item.releaseTime.substr(0,4);

        if(item.type == 'bundle')
        {
          getBundledTitles(item).then(function(data) {
            item.subitems = data.content;
            item.count = data.content.length;
          });
        }
        else if(item.type == 'season')
        {
console.log(item.title);
          getSeasonEpisodes(item).then(function(data) {
            item.episodes = data.content;
          });
        }
        else if(item.type == 'series')
        {
          item.episodes = [];
          getSeriesSeasons(item).then(function(data) {
            item.seasons = data.content;
            angular.forEach(data.content, function(value, key) {
              item.episodes.push.apply(item.episodes, value.episodes);
            });
          });
        }

      } else if(data._type == 'contentVariant'){
        item = {
          _type: data._type,
          contentId: data.contentId,
          contentVariantId: data.contentVariantId,
          ultraVioletSyncStatus: data.ultraVioletSyncStatus,
          videoQuality: data.videoQuality
        }
      } else if(data._type == 'contentVariantList'){
        item = {
          _type: data._type,
          content: [],
          moreAbove: data.moreAbove[0] == 'true',
          moreBelow: data.moreBelow[0] == 'true',
          totalCount: data.totalCount[0]
          // zoom: zoomData?
        }
        angular.forEach(data.contentVariant, function(value, key) {
          item.content.push(parseVuduType(value));//[key] = parseVuduType(value);
        });
      } else if(data._type == 'contentList'){
        item = {
          _type: data._type,
          content: [],
          moreAbove: data.moreAbove[0] == 'true',
          moreBelow: data.moreBelow[0] == 'true',
          totalCount: data.totalCount[0]
          // zoom: zoomData?
        }
        angular.forEach(data.content, function(value, key) {
          item.content.push(parseVuduType(value));//[key] = parseVuduType(value);
        });
      } else if(data._type == 'contentRating'){
        item = {
          _type: data._type,
          ratingSystem: data.ratingSystem ? data.ratingSystem[0] : null,
          ratingValue: data.ratingValue ? data.ratingValue[0] : null
        }
      } else if(data._type == 'distributionStudio'){
        item = {
          _type: data._type,
          name: data.name ? data.name[0] : null,
          studioId: data.studioId ? data.studioId[0] : null
        }
      } else if(data._type == 'ratingsSummaryList'){
        item = {
          _type: data._type,
          moreAbove: data.moreAbove[0] == 'true',
          moreBelow: data.moreBelow[0] == 'true',
          ratingsSummary: data.ratingsSummary ? parseVuduType(data.ratingsSummary[0]) : null
        }
      } else if(data._type == 'ratingsSummary'){
        item = {
          _type: data._type,
          reviewedId: data.reviewedId ? data.reviewedId[0] : null,
          reviewedType: data.reviewedType ? data.reviewedType[0] : null,
          starRatingsAvg: data.starRatingsAvg ? data.starRatingsAvg[0] : null,
          starRatingsCount: data.starRatingsCount ? data.starRatingsCount[0] : null
        }
      } else if(data._type == 'studio'){
        item = {
          _type: data._type,
          name: data.name ? data.name[0] : null,
          studioId: data.studioId ? data.studioId[0] : null
        }
      } else if(data._type == 'wishList'){//wish
        item = {
          _type: data._type,
          name: data.name ? data.name[0] : null
        }
      }
      return item;
    };
    
    var parseVuduResponse = function(response) {
      var results = {};
      
      if(response.data._type == 'error'){
        if(response.data.code && response.data.code[0]){
          response.data = { 
            error: true, 
            message: 'Error retreiving titles',
            status: response.data.code[0]
          };
        } else if(response.data.status && response.data.status){
          response.data = { 
            error: true, 
            message: 'Error retreiving titles',
            status: response.data.status
          };
        } else {
          response.data = { 
            error: true, 
            message: 'Error retreiving titles',
            status: 'unknownError'
          };
        }
        return $q.reject(response);
      } else {
        results = parseVuduType(response.data);
      }
      
      return results;
    };

    return {
      getTitlesOwned: getTitlesOwned,
      getTVOwned: getTVOwned,
      isAuthenticated: isAuthenticated,
      signIn: sessionKeyRequest,
      signOut: signOut
    };
  });
