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

    return { alerts: alerts, clear: clear, close: close, push: push };
  }).
/*
factory('RequestManager', function(){
    var manager = {
      limit: 50,
      queue: [],
      cache: {},
      requests: 0,
      sendRequest: function(params){
        if(manager.requests < manager.limit)
        {
          manager.runRequest(params);
        }
        else
        {
          manager.queue.push(params);
        }
      },
      runRequest: function(params){
        manager.requests++;

        $http.jsonp(url, {params: params

            manager.cache[ TODO ] = copy.deepcopy(conn) #use deepcopy to make sure the value is not overwritten in the $scope
            runNextRequest();
          }, function(error){
          runNextRequest();
        });
      },
      runNextRequest: function(){
        if(manager.requests > 0){
          manager.requests--;
          if(queue.length > 0){
            manager.runRequest(queue.shift());
          }
        }
      }
    }
    return manager;
  )}.
*/
factory('progressService', function() {
    var value = 0;
    var type = 'success';

    var reset = function() {
      this.value = 0;
      this.type = 'success';
    };

    return { value: value, type: type, reset: reset };
  }).

factory('vuduFactory', function($http, $q, $cookieStore, $timeout) {
    var url = 'https://api.vudu.com/api2/';
    var cachedurl = "https://apicache.vudu.com/api2/";
    var appId = 'vudu-collection';
    var count = 100;
    var user = null;
    var videoQualityList = {"sd": 0, "hd": 1, "hdx": 2, "uhd": 3};
		
    var isAuthenticated = function() {
      return user && user.sessionKey && user.id;
    };

  var sessionKeyRequest = function(userName, password, loginType, sensor_data, userId, sessionKey)
  {
	var params = {
		callback: 'JSON_CALLBACK'
		claimedAppId: appId,
		format: 'application/json',
		contentEncoding: "gzip",
		_type: (loginType == "wmt" ? "linkedAccountSessionKeyRequest" : 'sessionKeyRequest'),
		followup: 'user',
		//followup: 'vldfa',
		noCache: 'true',
		password: password,
		//sensorData: sensor_data,
		userName: userName,
		weakSeconds: "25920000"
	};
console.log(params);
	if(loginType == "wmt")
	{
		params.oauthClientId = "wmt";
	}
	return $http.jsonp(url, {params: params}).then(function(response) {
console.log(response.data);
	if(response.data && response.data.status)
	{
		if(response.data.status[0] == 'success')
		{
			user = {
				id: response.data.sessionKey[0].userId[0],
				expirationTime: response.data.sessionKey[0].expirationTime[0],
				sessionKey: response.data.sessionKey[0].sessionKey[0]
			};
			$cookieStore.ffmbVuduCollection_id = user.id;
			$cookieStore.ffmbVuduCollection_expirationTime = user.expirationTime;
			$cookieStore.ffmbVuduCollection_sessionKey = user.sessionKey;
			
		}
		else if(userId && sessionKey)
		{
			user = {
				id: userId,
				//expirationTime: response.data.sessionKey[0].expirationTime[0],
				sessionKey: sessionKey
			}
			return true;
		}
		else if(response.data.status[0] == 'loginFailed')
		{
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
			//$cookieStore.remove('ffmbVuduCollection_id');
			//$cookieStore.remove('ffmbVuduCollection_expirationTime');
			//$cookieStore.remove('ffmbVuduCollection_sessionKey');
			delete $cookieStore.ffmbVuduCollection_id;
			delete $cookieStore.ffmbVuduCollection_expirationTime;
			delete $cookieStore.ffmbVuduCollection_sessionKey;
			
			$timeout(function() {
				deferred.resolve({status: 'success', message: 'Signed out'});
			}, 100);
			return deferred.promise;
		};

		var getWishList = function(page, contentVariants) {
			return $http.jsonp(url, { 
				params: {
					claimedAppId: appId,
					format: 'application/json',
                    contentEncoding: "gzip",
					_type: 'contentSearch',
					count: count,
					dimensionality: 'any',
					followup: ['usefulStreamableOffers', 'ratingsSummaries', 'promoTags', 'advertEnabled', 'totalCount'],
					groupBy: 'series',
					listType: 'wished',//'rentedOrOwned'
					offset: page * count,
					sessionKey: user.sessionKey,
					sortBy: 'title',
					//superType: 'tv',
					type: ['program', 'episode', 'season', 'bundle', 'series'],
					userId: user.id,
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
				return parseVuduResponse(response, contentVariants);
			}, function(response) {
				console.log('vuduFactory.getWishList():failure:');
				console.log('response: ', response);
			}, function(response) {
				console.log('vuduFactory.getWishList():notify:');
				console.log('response: ', response);
			});
		};

		var getTVOwned = function(page, contentVariants) {
			return $http.jsonp(url, { 
				params: {
					claimedAppId: appId,
					format: 'application/json',
					contentEncoding: "gzip",
					_type: 'contentSearch',
					count: count,
					dimensionality: 'any',
					followup: ['usefulStreamableOffers', 'ratingsSummaries', 'totalCount'],
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
				return parseVuduResponse(response, contentVariants);
			}, function(response) {
				console.log('vuduFactory.getTVOwned():failure:');
				console.log('response: ', response);
			}, function(response) {
				console.log('vuduFactory.getTVOwned():notify:');
				console.log('response: ', response);
			});
		};

		var getTitlesOwned = function(page, contentVariants) {
			return $http.jsonp(url, { 
				params: {
					claimedAppId: appId,
					format: 'application/json',
					contentEncoding: "gzip",
					_type: 'contentSearch',
					count: count,
					dimensionality: 'any',
					followup: ['usefulStreamableOffers', 'ratingsSummaries', 'totalCount'],
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
				return parseVuduResponse(response, contentVariants);
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
					contentEncoding: "gzip",
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
				return parseVuduResponse(response, null);
			}, function(response) {
				console.log('vuduFactory.getContentVariantsOwned():failure:');
				console.log('response: ', response);
			}, function(response) {
				console.log('vuduFactory.getContentVariantsOwned():notify:');
				console.log('response: ', response);
			});
		};


    var getSeriesSeasons = function(item, offset, contentVariants) {
      return $http.jsonp(cachedurl, { 
        params: {
					claimedAppId: appId,
					format: 'application/json',
					contentEncoding: "gzip",
					_type: 'contentSearch',
					followup: ['promoTags', 'ratingsSummaries', 'totalCount'],
					includeComingSoon: true,
					listType: 'useful',
					offset: offset,
					//responseSubset: 'micro',
					seriesId: item.contentId,
					sortBy: 'seasonNumber',
					type: 'season',
					callback: 'JSON_CALLBACK'
				}
			}).then(function(response) {
        return parseVuduResponse(response, contentVariants);
			}, function(response) {
        console.log('vuduFactory.getSeriesSeasons():failure:');
        console.log('response: ', response);
			}, function(response) {
        console.log('vuduFactory.getSeriesSeasons():notify:');
        console.log('response: ', response);
      });
    };

//contentEncoding/gzip/

    var getSeasonEpisodes = function(item, contentVariants) {
      return $http.jsonp(cachedurl, {
        params: {
					claimedAppId: appId,
					format: 'application/json',
					contentEncoding: "gzip",
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
        return parseVuduResponse(response, contentVariants);
			}, function(response) {
        console.log('vuduFactory.getSeasonEpisodes():failure:');
        console.log('response: ', response);
			}, function(response) {
        console.log('vuduFactory.getSeasonEpisodes():notify:');
        console.log('response: ', response);
      });
    };

    var getBundledTitles = function(item, contentVariants) {
      return $http.jsonp(cachedurl, { 
        params: {
					claimedAppId: appId,
					format: 'application/json',
					contentEncoding: "gzip",
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
        return parseVuduResponse(response, contentVariants);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():failure:');
        console.log('response: ', response);
			}, function(response) {
        console.log('vuduFactory.getBundledTitles():notify:');
        console.log('response: ', response);
      });
    };

    var parseFirstVuduKey = function(data, key) {
      return data[key] && data[key][0];
    };

    var parseVuduType = function(data, contentVariants) {
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
        var contentId = data.contentId[0];

        item = {
          _type: data._type,
          
          contentId: contentId,
          title: data.title && data.title[0],
          description: data.description && data.description[0],

          bestAvailVideoQuality: data.bestStreamableVideoQuality ? data.bestStreamableVideoQuality[0] : null,
//data.bestDashVideoQuality ? data.bestDashVideoQuality[0] : null,
//bestStreamableVideoQuality
          country: data.country ? data.country[0] : null,
          language: data.language ? data.language[0] : null,
          lengthSeconds: data.lengthSeconds ? data.lengthSeconds[0] : null,
          mpaaRating: data.mpaaRating ? data.mpaaRating[0] : null,
          placardUrl: data.placardUrl ? data.placardUrl[0] : null,
          posterCopyright: data.posterCopyright ? data.posterCopyright[0] : null,
          posterUrl: data.posterUrl ? data.posterUrl[0] : null,
          releaseTime: data.releaseTime ? data.releaseTime[0] : null,
          starRating: data.starRating ? data.starRating[0] : 0,
          studio: data.studio ? parseVuduType(data.studio[0], null) : null,
          tomatoMeter: data.tomatoMeter ? +data.tomatoMeter[0] : 0,
          type: data.type ? data.type[0] : null,
          haveUV: data.ultraVioletSyncStatus && data.ultraVioletSyncStatus[0],//"imported","exported"
          hasUV: data.ultraVioletLogicalAssetId && data.ultraVioletLogicalAssetId[0],
          isMA: data.keyChestMaEditionUmid && data.keyChestMaEditionUmid[0] ? "MA" : null,
//ptoKeyChestEligible//ptoKeyChestMaEligible//keyChestEditionUmid

          distributionStudio: data.distributionStudio ? parseVuduType(data.distributionStudio[0], null) : null,
          ratingsSummaries: data.ratingsSummaries ? parseVuduType(data.ratingsSummaries[0], null) : null,

          containerIds: data.containerId,
          // containerId: data.containerId || null,
          seasonId: data.seasonId && data.seasonId[0],
          seasonNumber: data.seasonNumber && data.seasonNumber[0],
          seriesId: data.seriesId && data.seriesId[0],
          episodeNumberInSeason: data.episodeNumberInSeason ? data.episodeNumberInSeason[0] : null,

          price: "-",

          // colorType: data.colorType ? data.colorType[0] : null,
          // contentRating: parseVuduType(data.contentRating[0], null),
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
        };
        item.titleSort = item.title.replace(/^(A|An|The)\s+/i, '');
        if(item.mpaaRating == 'nrFamilyFriendly') item.mpaaRating = 'nrff';
        if(item.releaseTime) item.releaseYear = item.releaseTime.substr(0,4);

        if(contentVariants && contentVariants[contentId])
        {
          var contentVariant = contentVariants[contentId];
          item.videoQuality = contentVariant.videoQuality;
          item.ultraVioletSyncStatus = contentVariant.ultraVioletSyncStatus;
        }
        if(item.haveUV || item.hasUV || item.ultraVioletSyncStatus)
        {
          item.isUV = "UV";
        }
        if(data.contentVariants)
        {
          var cV = parseVuduType(data.contentVariants[0], null);
          if(cV.price!=0)
          {
            item.price = cV.price;
          }
          if(!item.bestAvailVideoQuality)
          {
            cV = cV.content[item.contentId];
            if(cV && cV.videoQuality) item.bestAvailVideoQuality = cV.videoQuality;
          }
        }

        if(item.type == 'bundle')
        {
          item.subitems = [];
          getBundledTitles(item, contentVariants).then(function(data) {
            item.subitems = data.content;
            item.count = item.subitems.length;
            angular.forEach(item.subitems, function(value, key) {
              value.parent = item;
              if(!value.videoQuality)
              {
                if(item.videoQuality)// && value.bestAvailVideoQuality)
                {
                  value.videoQuality = item.videoQuality;
                  //value.videoQuality = videoQualityList[item.videoQuality] > videoQualityList[value.bestAvailVideoQuality] ? value.bestAvailVideoQuality : item.videoQuality;
                }
              }
            });
          });
        }
        else if(item.type == 'episode')
        {
          if(item.episodeNumberInSeason)
          {
            item.title = item.episodeNumberInSeason + ": " + item.title;
          }
        }
        else if(item.type == 'season')
        {
          item.subitems = [];
          var haveSome = contentVariants[contentId] || (item.parent && contentVariants[item.parent.contentId]);
          if(item.parent && item.parent.isUV)
          {
            item.isUV = "UVbundle";
          }
          getSeasonEpisodes(item, contentVariants).then(function(data) {
            //http(s) Errors data.content
            angular.forEach(data.content, function(value, key) {
              if(item.isUV && value.episodeNumberInSeason!="0" && !value.isUV)//TODO: remove ' && !value.isUV'
              {
                value.isUV = "UVseason";
              }
              if(!value.videoQuality)
              {
                if(item.videoQuality)// && value.bestAvailVideoQuality)
                {
                  value.videoQuality = item.videoQuality;
                  //value.videoQuality = videoQualityList[item.videoQuality] > videoQualityList[value.bestAvailVideoQuality] ? value.bestAvailVideoQuality : item.videoQuality;
                }
                //else if(!item.videoQuality && value.bestAvailVideoQuality)
                //{
                //  value.videoQuality = value.bestAvailVideoQuality;
                //}
                //else if(item.videoQuality && !value.bestAvailVideoQuality)
                //{
                //  value.videoQuality = item.videoQuality;
                //}
              }
              if(haveSome || contentVariants[value.contentId])
              {
                item.subitems.push(value);
              }
            });
            if(item.parent && !item.subitems.length && item.parent.subitems)
            {
//try{
              item.parent.subitems.splice(item.parent.subitems.indexOf(item), 1);
//}catch(e){push();}
            }
          });
        }
        else if(item.type == 'series')
        {
          item.subitems = [];
          var offset = 0;
          var getTVSeasons = function()
          {
            getSeriesSeasons(item, offset, contentVariants).then(function(data) {
              //Errors data.content
              var oneSeason = data.content[0];
              oneSeason.parent = item;
              item.subitems.push(oneSeason);

              if(data.moreBelow)
              {
                offset++;
                getTVSeasons();
              }
            });
          };
          getTVSeasons();
        }

      } else if(data._type == 'contentVariant'){
        item = {
          _type: data._type,
          contentId: data.contentId[0],
          contentVariantId: data.contentVariantId[0],
          ultraVioletSyncStatus: data.ultraVioletSyncStatus && data.ultraVioletSyncStatus[0],
          videoQuality: data.videoQuality[0],
          price: 0,
          //date: data.date[0],
        };
        angular.forEach(data.offers, function(value, key) {
          var offer = parseVuduType(value, null);
          if(item.price < offer.price)
          {
            item.price = offer.price;
          }
        });
      } else if(data._type == 'contentVariantList'){
        item = {
          _type: data._type,
          content: {},
          moreAbove: data.moreAbove[0] == 'true',
          moreBelow: data.moreBelow[0] == 'true',
          totalCount: data.totalCount ? data.totalCount[0] : null,
          price: 0,
          // zoom: zoomData
        };
        angular.forEach(data.contentVariant, function(value, key) {
          var contentVariant = parseVuduType(value, null);
          var cId = contentVariant.contentId;
          if(item.content[cId])
          {
            //item.content[cId].push(contentVariant);
//TODO            console.log("Duplicate contentId: "+cId);
            ////console.log(contentVariant.videoQuality+" "+item.content[cId].videoQuality);
            if(videoQualityList[contentVariant.videoQuality] > videoQualityList[item.content[cId].videoQuality])
            {
              item.content[cId] = contentVariant;
            }
          }
          else
          {
            item.content[cId] = contentVariant;
          }
          if(item.price < contentVariant.price)
          {
            item.price = contentVariant.price;
          }
        });
      } else if(data._type == 'contentList'){
        item = {
          _type: data._type,
          content: [],
          moreAbove: data.moreAbove[0] == 'true',
          moreBelow: data.moreBelow[0] == 'true',
          totalCount: data.totalCount[0]
          // zoom: zoomData
        };
        angular.forEach(data.content, function(value, key) {
          item.content.push(parseVuduType(value, contentVariants));//[key] = parseVuduType(value);
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
          ratingsSummary: data.ratingsSummary ? parseVuduType(data.ratingsSummary[0], null) : null
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
      } else if(data._type == 'offer'){
        item = {
          _type: data._type,
          //contentId: data.contentId[0],
          //contentVariantId: data.contentVariantId[0],
          //isGiftable: data.isGiftable[0],
          offerId: data.offerId[0],
          offerType: data.offerType[0],
          price: parseFloat(data.price[0]),
        }
      } else if(data._type == 'offerList'){
        item = {
          _type: data._type,
          price: 0,
        };
        angular.forEach(data.offer, function(value, key) {
          var offer = parseVuduType(value, contentVariants);
          if(offer.offerType == 'pto' && item.price < offer.price)
          {
            item.price = offer.price;
          }
        });
      //} else if(data._type == 'wishList'){//wish
      //  item = {
      //    _type: data._type,
      //    name: data.name ? data.name[0] : null
      //  }
      }
      return item;
    };
    
    var parseVuduResponse = function(response, contentVariants) {
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
      }
      
      return parseVuduType(response.data, contentVariants);
    };

    return {
      getTitlesOwned: getTitlesOwned,
      getTVOwned: getTVOwned,
      getContentVariantsOwned: getContentVariantsOwned,
      getWishList: getWishList,
      isAuthenticated: isAuthenticated,
      signIn: sessionKeyRequest,
      signOut: signOut
    };
  });
