'use strict';

angular.module('app', ['ngRoute', 'ngCookies', 'app.controllers', 'app.services', 'mm.foundation']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.
    when('/titles', {
      templateUrl: 'partials/titles.html',
      controller: 'TitleListCtrl'
    }).
    when('/titles/:id', {
      templateUrl: 'partials/title-detail.html',
      controller: 'TitleDetailCtrl'
    }).
    when('/login', {
      templateUrl: 'partials/login.html',
      controller: 'UserCtrl'
    }).
    otherwise({
      redirectTo: '/titles'
    });
  }]).
  config(['$compileProvider', function($compileProvider){
    //$compileProvider.debugInfoEnabled(false);
    if (angular.isDefined($compileProvider.urlSanitizationWhitelist)) {
      $compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|data):/);
    } else {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|data):/);
    }
  }]).
  directive('clearWithEsc', function() {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function(scope, element, attrs, controller) {
        element.on('keydown', function(ev) {
          if (ev.keyCode != 27) return;
        
          scope.$apply(function() {
            controller.$setViewValue("");
            controller.$render();
          });
        });
      },
    };
  }).
  directive('ngFileModel', ['$parse', function ($parse, $sce) {
     return {
         restrict: 'A',
         link: function(scope, element, attrs) {
             var rows = [];
             element.bind('change', function(event) {
               var files = event.target.files;
               var reader = new FileReader();
               reader.onload = function(e){
                 rows = reader.result.split('\r\n');
                 rows[0] = rows[0].split(',');
                 rows[0][9] = "studio";
                 for(var i = 1; i < rows.length; i++){
                   var title = rows[i].split('"')[1];
                   rows[i] = rows[i].split(',').reduce(function(obj, str, ind) {
                     if(ind==3)
                     {
                       str = title;
                     }
                     else if(ind==9)
                     {
                       str = {name: str};
                     }
                     obj[rows[0][ind]] = str;
                     return obj;
                   }, {});
                 }
                 rows.shift();
                 console.log(scope.importTitles);
                 scope.$apply(function(){
                   //$parse(attrs.ngFileModel).assign(scope, '');
                   scope[attrs.ngFileModel] = rows;
                   alert(attrs.ngFileModel);
                 });
               };
               reader.readAsText(files[0]);
             });
         }
     };
  }]).
  filter('conditional', function() {
    return function(b, t, f) {
      return b ? t : f;
    };
  }).
  filter('pageSlice', function() {
    return function(input, page, count) {
      // force int
      count = +count;
      input
      return input.slice(page * count, (page * count) + count);
    };
  }).
  run(function($rootScope, $location, $window, vuduFactory) {
    $rootScope.$on('$locationChangeStart', function(event, next, current) {
      if(vuduFactory.isAuthenticated()){
        if($location.path() == '/login') $location.url('/');
      } else if($location.path() != '/login'){
        $location.url('/login');
      }
    });
    $rootScope.$on('$locationChangeSuccess', function(event) {
      $window.ga('send', 'pageview', { page: $location.path() });
    });
  });
