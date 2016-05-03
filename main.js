  var USER_LIKE = [];
  var USER_LOCATION = false;
  var LOCATION_INFO_ACTIVATED = false;
  var LOCATION_COUNT = 0;

  var TOTAL_COUNT = 0;
  var CAFE_COUNT = 0;
  var TOTAL_COUNT_NODE = document.getElementById('totalCount');
  var CAFE_COUNT_NODE = document.getElementById('cafeCount');

  function updateCSS(state){
    if(state === 'login'){
      document.getElementById('login').className = 'hide';
      document.getElementById('logout').className = 'show';
    }else{
      document.getElementById('login').className = 'show';
      document.getElementById('logout').className = 'hide';
    }
  }
  // This is called with the results from from FB.getLoginStatus().
  function statusChangeCallback(response) {

    console.log('statusChangeCallback');
    console.log(response);
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().

    console.log(document.getElementById('status'))
    if (response.status === 'connected') {
      // Logged into your app and Facebook.
      testAPI();
      updateCSS('login');

    } else if (response.status === 'not_authorized') {
      
      // The person is logged into Facebook, but not your app.
      document.getElementById('status').innerHTML = 'Please log ' +
        'into this app.';
    } else {
      // The person is not logged into Facebook, so we're not sure if
      // they are logged into this app or not.
      document.getElementById('status').innerHTML = 'Please log ' +
        'into Facebook.';
    }
  }

  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  function checkLoginState() {
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });
  }

  window.fbAsyncInit = function() {
    FB.init({
    appId      : '1535925030038355',
    cookie     : true,  // enable cookies to allow the server to access 
                        // the session
    xfbml      : true,  // parse social plugins on this page
    version    : 'v2.5' // use graph api version 2.5
    });

    // Now that we've initialized the JavaScript SDK, we call 
    // FB.getLoginStatus().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.
  
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });
  };

  // Load the SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/zh_TW/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

  // Here we run a very simple test of the Graph API after login is
  // successful.  See statusChangeCallback() for when this call is made.
  function testAPI() {
    console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
      console.log('Successful login for: ' + response.name);
      document.getElementById('status').innerHTML =
        'Glad to see you, ' + response.name + '!';

      console.log(response)

      if(USER_LOCATION === false){
          getUserLocation().then((updateGeo)=>{
             if(updateGeo === true){
                 getLike(response.id);
             }
          });
      }else{
          getLike(response.id);
      }

      
    });
  }


  function getLike(id){
    console.log("USER_LOCATION:")
    console.log(USER_LOCATION)
    FB.api("/"+id+"/likes", (response)=>{

        if (response && !response.error) {
          
          handleLikeCallback(response);

          var next = response.paging.next;
          if(next){
              getLikeCont(next);
          }else{
              renderResult();
          }
        }
      }
    );
  }
  function getLikeCont(page_id){
    FB.api(page_id,function(response){
        if (response && !response.error) {
          
            handleLikeCallback(response).then(()=>{
                //renderResult();//TEMP: only render the fist page data
                var next = false;
                if(response.paging){
                  next = response.paging.next;
                }
                if(next){
                    getLikeCont(next);
                }else{
                    renderResult();
                }
            });
            
           
        }
    })
  }
  function handleLikeCallback(response){
    
    return new Promise(function(resolve, reject) { 
        TOTAL_COUNT += response.data.length;
        TOTAL_COUNT_NODE.innerText = TOTAL_COUNT;
        console.log(TOTAL_COUNT);
          
        //First get geo ones
        getGeoList(response.data).then((geoList)=>{
            
            if(geoList.length===0){
              resolve(true);
            }

            //Then get distance
            var count = 0;
            geoList.map((item,i)=>{
                getShopDistance(item).then((item)=>{
                    if(isEatable(item.category)===true){
                        USER_LIKE.push(item);
                        CAFE_COUNT += 1;
                        CAFE_COUNT_NODE.innerText = CAFE_COUNT;
                    }

                    count++;
                    if(count===geoList.length){
                        resolve(true);
                    }
                });   
            });
        })
    });
  }
  function getGeoList(data){
   
    return new Promise(function(resolve, reject) {
        var geoList = [];
        var count = 0;
        if(data.length === 0){
            resolve(geoList);
        }
        data.map((item,i)=>{
            getLocation(item.id).then((place_info)=>{
                //console.log(place_info)
                if(place_info && place_info.location){
                    item.longitude = place_info.location.longitude;
                    item.latitude = place_info.location.latitude;
                    item.category = place_info.category;
                    if(item.longitude!==undefined){
                      geoList.push(item)
                    }
                }
                count++;
                if(count===Number(data.length)){
                    resolve(geoList);
                }
            });
        });
    });
  }
  function isEatable(category){
    if(category.indexOf('Food')!==-1||category.indexOf('Restaurant')!==-1||category.indexOf('Cafe')!==-1){
        return true;
    }else{
        return false;
    }
  }
  function getShopDistance(item){
    return new Promise(function(resolve, reject) {

        //console.log(item.latitude+","+item.longitude)
    
        var origin = new google.maps.LatLng(USER_LOCATION.latitude, USER_LOCATION.longitude);
        var destination = new google.maps.LatLng(item.latitude, item.longitude);
    
        var service = new google.maps.DistanceMatrixService();
        
        service.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [destination],
            travelMode: google.maps.TravelMode.TRANSIT
          }, (response, status)=>{
    
              item.distance = response.rows[0].elements[0].distance;
              item.duration = response.rows[0].elements[0].duration;
              //console.log(item)
              resolve(item);
             
          }
        )
    })
  }

  function renderResult(){
    console.log("render")
    //render
    var root = document.getElementById('cafes');
    var current = root;
    root.innerHTML = "";

    //sort
    USER_LIKE.map((item,i)=>{
       if(!item.distance){
           USER_LIKE.splice(i, 1);
       }
    })
    USER_LIKE.sort((a,b)=>{
       return a.distance.value - b.distance.value;
    })
    
    console.log(USER_LIKE)
    USER_LIKE.map((item,i)=>{

        //console.log(item)
        
        var node = document.createElement("a");
        node.className = "list";
        node.id = item.id;
        node.href="https://www.facebook.com/profile.php?id="+node.id;
        node.target="_blank";
        
        var main = document.createElement("div");
        main.className = "main";
        node.appendChild(main);

        var title = document.createElement("div");
        title.className = "title";
        title.innerHTML = item.name;
        main.appendChild(title);

        var subtitle = document.createElement("div");
        subtitle.className = "subtitle";
        subtitle.innerHTML = item.category;
        main.appendChild(subtitle);

        // var facebook = document.createElement("a");
        // var linkText = document.createTextNode("facebook");
        // facebook.appendChild(linkText);
        // facebook.href="https://www.facebook.com/profile.php?id="+node.id;

        // main.appendChild(facebook);

        if(item.distance){
            var distance = document.createElement("div");
            distance.className = "distance";
            distance.innerHTML = item.distance.text;
            node.appendChild(distance);
        }
        

        current.appendChild(node);      
    })
  }
  function getLocation(page_id){
    return new Promise(function(resolve, reject) {
      FB.api(
        `/${page_id}`,
        {fields: 'name,id,location,category'},
        
        function (response) {
          if (response && !response.error) {
              resolve(response);  
          }else{
              resolve(false);
          }
        }
      );

    });    
  }

  function getUserLocation(){
    return new Promise(function(resolve, reject) {  

      if (navigator.geolocation) {
        console.log('Geolocation is supported!');
        navigator.geolocation.getCurrentPosition((position)=>{
            USER_LOCATION = {};
            USER_LOCATION.latitude = position.coords.latitude;
            USER_LOCATION.longitude = position.coords.longitude;
            resolve(true);
        }); 
      }else {
        alert('Geolocation is not supported.');
        resolve(false)
      }
    });
  }
 

  // Logout
  function logout(){
    FB.logout(function(response) {
      // user is now logged out
      updateCSS('logout');
      document.getElementById('status').innerHTML =
        'Logged out.';

      var root = document.getElementById('cafes');
      root.innerHTML = "";
    });
  }
