var potatoNews = angular.module('potatoNews', ['ui.router'])

potatoNews.config([
'$stateProvider',
'$urlRouterProvider',
'$locationProvider',
function($stateProvider, $urlRouterProvider, $locationProvider) {
//resolve ensures that any time home is entered, we always load all of the posts
//before the state finishes loading.  a blocking preload?
//more info at
//https://github.com/angular-ui/ui-router/wiki
  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: '/home.html',
      controller: 'MainCtrl',
      resolve: {
        postPromise: ['posts', function(posts) {
          return posts.getAll();
        }]
      }
    })
    .state('posts', {
        url: '/posts/:id',
        templateUrl: '/posts.html',
        controller: 'PostsCtrl',
        resolve: {
          post: ['$stateParams', 'posts', function($stateParams, posts) {
            return posts.get($stateParams.id);
          }]
        }
    })

    .state('login', {
      url: '/login',
      templateUrl: '/login.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth) {
        if (auth.isLoggedIn()) {
          alert('you are logged in')
          $state.go('home');
        }
      }]
    })

    .state('register', {
      url: '/register',
      templateUrl: '/register.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth) {
        if (auth.isLoggedIn()) {
          alert('you are logged in')
          $state.go('home');
        }
      }]
    })

  $urlRouterProvider.otherwise('home');

  //$locationProvider.html5Mode(true);

}]);


potatoNews.factory('auth', ['$http', '$window', function($http, $window) {
  var auth = {};

  auth.saveToken = function(token) {
    $window.localStorage['flapper-news-token'] = token;
  }

  auth.getToken = function() {
    return $window.localStorage['flapper-news-token'];
  }

  auth.isLoggedIn = function() {
    var token = auth.getToken();
    if (token) {
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  }

  auth.currentUser = function() {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      return payload.username;
    }
  }

  auth.register = function(user) {
    return $http.post('/register', user).success(function(data) {
      auth.saveToken(data.token);
    })
  }

  auth.logIn = function(user) {
    return $http.post('/login', user).success(function(data) {
      auth.saveToken(data.token);
    })
  }

  auth.logOut = function() {
    $window.localStorage.removeItem('flapper-news-token');
  }

  return auth;
}])


potatoNews.controller('NavCtrl', function($scope, auth) {
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = auth.logOut;
});

potatoNews.controller('AuthCtrl', function($scope, $state, auth) {
  $scope.user = {};

  $scope.register = function() {
    auth.register($scope.user)
    .error(function(error) {
      $scope.error = error;
    }).then(function() {
      $state.go('home');
    });
  }

  $scope.logIn = function() {
    auth.logIn($scope.user)
    .error(function(error) {
      $scope.error = error;
    }).then(function() {
      $state.go('home');
    });
  }

});


potatoNews.factory('posts', function ($http, auth){
    var o = {
        posts: []
    };

    o.getAll = function() {
      return $http.get('/posts').success(function(data) {
        angular.copy(data, o.posts);
      });
    }

    o.create = function(post) {
      return $http.post('/posts', post, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }
      }).success(function(data) {
        o.posts.push(data);
      })
    }

    o.get = function(id) {
      return $http.get('/posts/' + id).then(function(res) {
        return res.data;
      });
    }

    o.upvote = function(post) {
      return $http.put('/posts/' + post._id + '/upvote', null, { headers: { Authorization: 'Bearer ' + auth.getToken() }})
      .success(function(data) {
        post.upvotes ++;
      })
    }

    o.downvote = function(post) {
      return $http.put('/posts/' + post._id + '/downvote', null, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }})
      .success(function(data) {
        post.upvotes --;
      })
    }

    o.addComment = function(id, comment) {
      return $http.post('/posts/' + id + '/comments', comment, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }});
    }

    o.upvoteComment = function(post, comment) {
      return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }})
      .success(function(data) {
        comment.upvotes += 1;
      })
    }

    o.downvoteComment = function(post, comment) {
      return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/downvote', null, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }})
      .success(function(data) {
        comment.upvotes -= 1;
      })
    }

    return o;
});


potatoNews.controller('MainCtrl', [
'$scope',
'posts',
function($scope, posts){

    $scope.posts = posts.posts;
    //setting title to blank here to prevent empty posts
    $scope.title = '';

    $scope.addPost = function(){
        if($scope.title.length === 0) {
            alert('Title is required!');
            return;
        }

        //regex from https://gist.github.com/jpillora/7885636

        var isValidUrl = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.‌​\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[‌​6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1‌​,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00‌​a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u‌​00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i;

        var url = $scope.link;

        //link is not required, but if present it must be valid

        if($scope.link && !isValidUrl.test(url)) {
            alert('You must include a full valid url! (ex: http://www.example.com)');
            return;
        }

        posts.create({
            title: $scope.title,
            link: $scope.link,
        });
        //clear the values
        $scope.title = '';
        $scope.link = '';
    };

    $scope.upvote = function(post) {
        //our post factory has an upvote() function in it
        //we're just calling this using the post we have
        posts.upvote(post);
    }
    $scope.downvote = function (post) {
        posts.downvote(post);
    };

}]);

potatoNews.controller('PostsCtrl', [
'$scope',
'posts',
'post',
function ($scope, posts, post){
    //used to need $stateRouterProvider to figure out what
    //specific post we're grabbing.  Since we used the resolve object to
    //refer to the posts.get() function and assigned it to the post value
    //then injected that here, we now have the specific post from the db
    //we also inject 'posts' so we can screw with the comments
    $scope.post = post;

    $scope.addComment = function () {
        if ($scope.body === '') { return; }
        posts.addComment(post._id, {
            body: $scope.body,
            author: 'user',
        }).success(function (comment) {
            $scope.post.comments.push(comment);
        });
        $scope.body = '';
    };

    $scope.upvote = function(comment) {
        posts.upvoteComment(post, comment);
    };

    $scope.downvote = function (comment) {
        posts.downvoteComment(post, comment);
    };

}]);
