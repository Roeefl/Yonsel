'use strict';

var ACTION_ADD = 'add';
var ACTION_FIRE = 'fire'
var ACTION_UNFIRE = 'unfire';

var USER_NONE = '!';

/* -- Vue Components Registration -- */

const Home = { template: '<div>Home</div>' }
const Bar = { template: '<div>bar</div>' }

const routes = [
  { path: '/', component: Home },
  { path: '/bar', component: Bar }
]

var router = new VueRouter({
  mode: 'hash',
  base: window.location.href,
  routes: routes
});


Vue.component('tab-item', {
  props: ['tab'], 

  template:
    '<a :id="fullId" :href="fullHref" @click="tabClick">' +
      '{{tab.title}}' +
    '</a>',

  computed: {
    fullId: function() {
      return this.tab.id + '-tab';
    },
    fullHref: function () {
      return '#' + this.tab.id + '-panel';
    }
  },

  methods:
    {
      tabClick: function(event) {
        this.$emit('tabclick');
      }
    }
});

Vue.component('panel-item', {
  props: ['panel'], 

  template:
    '<div :id="fullId">' +
      '<slot name="contentItems"></slot>' +
    '</div>',

    computed: {
      fullId: function() {
        return this.panel.id + '-panel';
      }
    }
});

Vue.component('chatmsg-entry', {
  props: ['item'], 

  template:
    '<div>' +
      '<div class="spacing">' +
          '<div class="avatar" :style="{ backgroundImage: item.picUrl }"></div>' +
      '</div>' +
      '<div class="entry-text">' +
        '{{item.text}}' +
      '</div>' +
      // '<div class="name">' +
      //   '{{item.name}}' +
      // '</div>' + 
    '</div>'
});

Vue.component('log-entry', {
  props: ['item'], 

  template:
    '<div>' +
      '<div class="spacing">' +
          '<div class="avatar" :style="{ backgroundImage: item.picUrl }"></div>' +
      '</div>' +
      '<div class="entry-text">' +
        '{{item.action}}' +
      '</div>' +
      '<div class="entry-sub">' +
        '{{item.datetime}}' +
      '</div>' + 
    '</div>'
});

Vue.component('content-item', {
  props: ['item'],

  template:
    '<li>' + 
      '<span class="item-title mdl-cell mdl-cell--12-col mdl-cell--6-col-tablet mdl-cell--3-col-desktop">{{item.title}}</span>' +
      '<span class="item-buttons mdl-cell mdl-cell--12-col mdl-cell--6-col-tablet mdl-cell--3-col-desktop">' + 
        '<button @click="fireClick" class="fire-button mdl-button mdl-js-button mdl-button--accent">' + 
          '<span :id="fullFireBadgeId" class="mdl-badge fire-badge" v-bind:data-badge="(item.fires ? item.fires.length : 0)">' + 
            '<i class="material-icons md-fire md-30 md-light">whatshot</i>' + 
          '</span>' + 
          '<div class="mdl-tooltip" :data-mdl-for="fullFireBadgeId">' +
            '3 People fired this' + 
          '</div>' +
        '</button>' + 
      '</span>' +
    '</li>',

    computed: {
      fullFireBadgeId: function() { 
        return "fire-badge-" + this.item.key;
      }
    },

    methods: {
        fireClick: function(event) {
          this.$emit('fireclick', this.item.key);
        }
    }
});

/* -- Initialize vue -- */
var app = new Vue({
  // Vue-Router
  router,

  // HTML Element to be mounted by the app
  el: ('#main-layout'),

  // All App Data is here
  data: {
    // Constants
    TYPE_MOVIE: 'movie',
    TYPE_TVSHOW: 'tvshow',
    TYPE_WEB: 'web',
    TYPE_MOBILEAPP: 'mobileapp',

    // Models
    chatMsg: '',
    newEntry: {
      name: '',
      note: '',
      category: ''
    },
    tabState: 'movie',

    // Content Panels
    panels: [
      { key: 0, id: 'movie', items: [], title: 'Movies' },
      { key: 1, id: 'tvshow', items: [], title: 'TV Shows' },
      { key: 2, id: 'web', items: [], title: 'Web Stuff'},
      { key: 3, id: 'mobileapp', items: [], title: 'Mobile Apps' },
    ],    

    // Data Arrays
    chatMessages: [],
    logEntries: [],
    content: []
  },
  // Called after app is fully loaded
  ready: function() {
  },

  // computed properties
  computed: {
    toTitleCase: function() {
      return this.tabState.charAt(0).toUpperCase() + this.tabState.slice(1);
    }
  },

  // methods
  methods: {
    setTabState: function(newState) {
      this.tabState = newState;
    },
    filterContent: function(typeFilter) {
      return this.content.filter( function(item) {
        return item.type == typeFilter;
      })
    },
    removeChatMessage: function (index) {
      this.chatMessages.splice(index, 1);
    },
    pushContentItem: function(key, type, title, note, fires) {
      this.content.push( {key: key, type: type, title: title, note: note, fires: fires} );
    },
    pushLogEntry: function(key, action, picUrl, datetime) {
      this.logEntries.push({ key: key, action: action, picUrl: picUrl, datetime: datetime });
    },
    pushChatMsg: function(key, name, text, picUrl, imageUri) {
      this.chatMessages.push({ key: key, name: name, text: text, picUrl: picUrl, imageUri: imageUri });
    },
    toggleFire: function(key) {
      yonsel.toggleFire(key);
    },
    updateContentItem: function(ind, updatedItem) {
      Vue.set(app.content, ind, updatedItem);
    },
    submitChatMsg: function () {
      yonsel.saveChatEntry();
    },
    submitEntry: function() {
      yonsel.saveContentEntry();
    },
    resetObjValues: function(obj) {
      for (var o in obj) {
        obj[o] =   '';
      }
    },
    isObjAllValuesTrue: function(obj) {
      for(var o in obj) {
          if(!obj[o]) return false;
      }
      return true;
    }
  }
});

/* -- Initialize App -- */

// A loading image URL.
Yonsel.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

function Yonsel() {
  this.checkSetup();

  var currentUser = USER_NONE;

  // Shortcuts to DOM Elements.
  this.messageList = document.getElementById('messages');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  this.logger = document.getElementById('logger');

  // Saves message on form submit.
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  // Events for image upload.
  this.submitImageButton.addEventListener('click', function() {
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

  // Update scrolling in chat after messages have finished loading
  $('#messages').bind('DOMNodeInserted', this.chatScrollTop.bind(this));
  $('#logger').bind('DOMNodeInserted', this.loggerScrollTop.bind(this));

  this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
Yonsel.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();

  // Initiates Firebase auth and listen to auth state changes.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));

  this.loadLogger();
  this.loadContent();
};

/* -- Content Functions -- */

// Loads main data from firebase and listens for data changes
Yonsel.prototype.loadContent = function() {
  // Reference to the // database path.
  this.contentRef = this.database.ref('content');
  // Make sure we remove all previous listeners.
  this.contentRef.off();

  // Loads all data and listens for data changes.
  var setContentEntry = function(data) {
    var val = data.val();
    this.displayContentEntry(data.key, val.type, val.title, val.note, val.fires);
  }.bind(this);

  // Updates content entry
  var updateContentEntry = function(data) {
    var val = data.val();

    var currentItem = app.content.find(x => x.key === data.key);
    // If the item exists, update all fields to the ones retrieved from FireBase
    if (currentItem) {
      var ind = app.content.indexOf(currentItem);
      var updatedItem = { key: data.key, type: val.type, title: val.title, note: val.note, fires: val.fires };
      app.updateContentItem(ind, updatedItem);
    }
  }.bind(this);

  this.contentRef.on('child_added', setContentEntry);
  this.contentRef.on('child_changed', updateContentEntry);
}

// Displays a content entry in the UI (movies, shows, etc)
Yonsel.prototype.displayContentEntry = function(key, type, title, note, fires) {
  app.pushContentItem(key, type, title, note, fires);
};

// Saves a new entry to Firebase DB
Yonsel.prototype.saveContentEntry = function() {
  // Check that the user entered a message and is signed in.
  if (app.newEntry.name && app.newEntry.note && app.newEntry.category && this.checkSignedInWithMessage()) {
    // Get the current entry typed first so the Input can be cleared before waiting on firebase push
    var entryVal = app.newEntry.name;
    var noteVal = app.newEntry.note;
    var catVal = app.newEntry.category;

    // Clear entry text field and SEND button state.
    app.resetObjValues(app.newEntry);

    // Add a new content entry to the Firebase Database.
    this.contentRef.push({
      title: entryVal,
      note: noteVal,
      type: catVal,
      fires: []
    }).then(function() {
      // emit logger action
      this.emitLog(ACTION_ADD, this.auth.currentUser.displayName, entryVal, app.tabState);
    }.bind(this)).catch(function(error) {
      console.error('Error writing new entry to Firebase Database', error);
    });
  }
}

Yonsel.prototype.toggleFire = function(entryKey) {
  var name = this.auth.currentUser.displayName;
  var firePath = '/' + entryKey;

  var currItem = app.content.find(x => x.key === entryKey);

  if (currItem) {
    var currFires = currItem.fires;
    
    var fires = [];
    if (currFires) {
      fires = currFires;
    }

    var userInFires = fires.find(y => y === name);
    if (userInFires) {
      var ind = fires.indexOf(name);
      fires.splice(ind, 1);
      this.emitLog(ACTION_UNFIRE, name, currItem.title);
    } else {
      fires.push(name);
      this.emitLog(ACTION_FIRE, name, currItem.title);
    }

    this.contentRef.child(firePath).update({ fires: fires });
  } else {
    alert("SUPER ERROR! WTF")
  }
}

/* -- Chat Functions -- */

// Loads chat messages history and listens for upcoming ones.
Yonsel.prototype.loadChat = function() {
  // Reference to the /messages/ database path.
  this.messagesRef = this.database.ref('messages');
  // Make sure we remove all previous listeners.
  this.messagesRef.off();

  // Loads the last 12 messages and listen for new ones.
  var setMessage = function(data) {
    var val = data.val();
    this.displayChatEntry(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  }.bind(this);
  var removeMessage = function(data) {
    //app.removeChatMessage(data.key);
  }.bind(this);

  this.messagesRef.limitToLast(12).on('child_added', setMessage);
  this.messagesRef.limitToLast(12).on('child_changed', setMessage);
  this.messagesRef.limitToLast(12).on('child_removed', removeMessage);
};

// Displays a Message in the UI.
Yonsel.prototype.displayChatEntry = function(key, name, text, picUrl, imageUri) {
  // IMPLEMENT LATER
  //  if (imageUri) { // If the message is an image.
  //   var image = document.createElement('img');
  //   image.addEventListener('load', function() {
  //     this.messageList.scrollTop = this.messageList.scrollHeight;
  //   }.bind(this));
  //   this.setImageUrl(imageUri, image);
  //   messageElement.innerHTML = '';
  //   messageElement.appendChild(image);
  // }

  // Replace all line breaks by <br>.
  text = text.replace(/\n/g, '<br>');

  // Full pathing for picUrl
  picUrl = this.retrieveFullPath(picUrl);

  app.pushChatMsg(key, name, text, picUrl, imageUri);

  // Timeout is commented out for now
  /* setTimeout(function() {div.classList.add('visible')}, 1); */
};

// Saves a new message on the Firebase DB.
Yonsel.prototype.saveChatEntry = function() {
  // Check that the user entered a message and is signed in.
  if (app.chatMsg && this.checkSignedInWithMessage()) {
    var currentUser = this.auth.currentUser;
    var photoUrl = currentUser.photoURL || '/images/profile_placeholder.png';

    // Get the current chatMessage first so the Input can be cleared before waiting on firebase push
    var msgValue = app.chatMsg;

    // Clear message text field and SEND button state.
    app.chatMsg = '';

    // Add a new message entry to the Firebase Database.
    this.messagesRef.push({
      name: currentUser.displayName,
      text: msgValue,
      photoUrl: photoUrl
    }).then(function() {
      // no need to emitLog on chat messages
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });
  }
};

/* -- Logger Functions -- */

// Loads main data from firebase and listens for data changes
Yonsel.prototype.loadLogger = function() {
  // Reference to the // database path.
  this.logRef = this.database.ref('logger');
  // Make sure we remove all previous listeners.
  this.logRef.off();

  // Loads all data and listens for data changes.
  var setLogEntry = function(data) {
    var val = data.val();
    this.displayLogEntry(data.key, val.action, val.picUrl, val.datetime);
  }.bind(this);

  this.logRef.on('child_added', setLogEntry);
  this.logRef.on('child_changed', setLogEntry);
}

// Displays a log entry in the UI
Yonsel.prototype.displayLogEntry = function(key, action, picUrl, datetime) {
  picUrl = this.retrieveFullPath(picUrl);
  app.pushLogEntry(key, action, picUrl, datetime);
};

// Saves a new log entry to the firebase DB
Yonsel.prototype.saveLogEntry = function(action) {
  var currentUser = this.auth.currentUser;
  
  var newDate = new Date();
  var datetime = newDate.today() + " around " + newDate.timeNow();

  this.logRef.push({
    action: action,
    picUrl: currentUser.photoURL || '/images/profile_placeholder.png',
    datetime: datetime
  }).then(function() {
    // Nothing
  }.bind(this)).catch(function(error) {
    console.error('Error writing new log entry to Firebase Database', error);
  });
}

/* -- Support Functions -- */

// For todays date;
Date.prototype.today = function () { 
    return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
}

// For the time now
Date.prototype.timeNow = function () {
     return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() ;
     // +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

/*  if exists: Find whether object exists in the array 
    otherwise: Pluck the object from the array
*/
function pluckByName(inArr, name, exists)
{
    for (i = 0; i < inArr.length; i++ )
    {
        if (inArr[i].name == name)
        {
            return (exists === true) ? true : inArr[i];
        }
    }
}

/* Save new log entry into the logger */
Yonsel.prototype.emitLog = function(actionType, username, title, contentType = '') {
  if (actionType == ACTION_ADD) {
    var action = (username + ' added ' + title + ' to ' + toTitleCase(contentType) + 's');
  }
  if (actionType == ACTION_FIRE) {
    var action = (username + ' marked ' + title + ' as #Fire');
  }
  if (actionType == ACTION_UNFIRE) {
    var action = (username + ' unmarked ' + title + ' as #Fire');
  }

  this.saveLogEntry(action);
}

/* Transforms a string into Title Case */
function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}

// Update scrolling in chat after messages have finished loading
Yonsel.prototype.chatScrollTop = function() {
  this.messageList.scrollTop = this.messageList.scrollHeight;
}
Yonsel.prototype.loggerScrollTop = function() {
  this.logger.scrollTop = this.logger.scrollHeight;
}

// returns picUrl with url attached or placeholder
Yonsel.prototype.retrieveFullPath = function(picUrl) {
  // set picUrl to full path or to placeholder
  if (picUrl) {
    return ("url('" + picUrl + "')");
  } else {
    return "url('/images/profile_placeholder.png')";
  }
}

/* -- Image-Related Functions -- */

// Sets the URL of the given img element with the URL of the image stored in Firebase Storage.
Yonsel.prototype.setImageUrl = function(imageUri, imgElement) {
  // If the image is a Firebase Storage URI we fetch the URL.
  if (imageUri.startsWith('gs://')) {
    imgElement.src = Yonsel.LOADING_IMAGE_URL; // Display a loading image first.
    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) {
      imgElement.src = metadata.downloadURLs[0];
    });
  } else {
    imgElement.src = imageUri;
  }
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
Yonsel.prototype.saveImageMessage = function(event) {
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  this.imageForm.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (this.checkSignedInWithMessage()) {
    // We add a message with a loading icon that will get updated with the shared image.
    var currentUser = this.auth.currentUser;
    this.messagesRef.push({
      name: currentUser.displayName,
      imageUrl: Yonsel.LOADING_IMAGE_URL,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function(data) {

      // Upload the image to Firebase Storage.
      this.storage.ref(currentUser.uid + '/' + Date.now() + '/' + file.name)
          .put(file, {contentType: file.type})
          .then(function(snapshot) {
            // Get the file's Storage URI and update the chat message placeholder.
            var filePath = snapshot.metadata.fullPath;
            data.update({imageUrl: this.storage.ref(filePath).toString()});
          }.bind(this)).catch(function(error) {
        console.error('There was an error uploading a file to Firebase Storage:', error);
      });
    }.bind(this));
  }
};

/* -- Sign-In Related Functions -- */

// Signs-in Friendly Chat.
Yonsel.prototype.signIn = function() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider);
};

// Signs-out of Friendly Chat.
Yonsel.prototype.signOut = function() {
  // Sign out of Firebase.
  this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
Yonsel.prototype.onAuthStateChanged = function(user) {
  if (user) { // User is signed in!
    // Get profile pic and user's name from the Firebase user object.
    var profilePicUrl = user.photoURL; // Only change these two lines!
    var userName = user.displayName;   // Only change these two lines!

    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
    this.userName.textContent = userName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true');

    // We load currently existing chat messages.
    this.loadChat();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden');
  }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
Yonsel.prototype.checkSignedInWithMessage = function() {
  // Return true if the user is signed in Firebase
  if (this.auth.currentUser) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

/* -- QA Functions -- */

// Checks that the Firebase SDK has been correctly setup and configured.
Yonsel.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !window.config) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions.');
  } else if (config.storageBucket === '') {
    window.alert('Your Firebase Storage bucket has not been enabled. Sorry about that. This is ' +
        'actually a Firebase bug that occurs rarely. ' +
        'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
        'and make sure the storageBucket attribute is not empty. ' +
        'You may also need to visit the Storage tab and paste the name of your bucket which is ' +
        'displayed there.');
  }
};

/* -- The Movie DB -- */
function tmdb_init() {
  var API_KEY = "43f6e648581011b26dbe13469943e32b";
  var API_LANG = "en-US";
  var API_ADULT = "false";
  var API_PAGE = "1";
  var API_QUERY = "rush";

  var tmdbAPI = {
    baseUrl: "https://api.themoviedb.org/3/",
    queryTypes: {
      searchMovie: "search/movie?"
    },
    queryStrings: {
      apiKey: "&api_key=",
      lang: "&language=",
      adult: "include_adult=",
      page: "&page=",
      query: "&query="
    }
  }

  var settings = {
    "async": true,
    "crossDomain": true,
    "url":  tmdbAPI["baseUrl"] +
            tmdbAPI["queryTypes"]["searchMovie"] +
            tmdbAPI["queryStrings"]["adult"] +
            API_ADULT +
            tmdbAPI["queryStrings"]["page"] +
            API_PAGE +
            tmdbAPI["queryStrings"]["query"] +
            API_QUERY +
            tmdbAPI["queryStrings"]["lang"] +
            API_LANG +
            tmdbAPI["queryStrings"]["apiKey"] + 
            API_KEY,
    "method": "GET",
    "headers": {},
    "data": "{}"
  }

  $.ajax(settings).done(function (response) {
    if (response) {
      if (response.results) {
        if (response.results[0]) {
          var movie = response.results[0];
          //alert(movie.poster_path);
        }
      }
    }
  });
}

/* -- Window -- */
window.onload = function() {
  window.yonsel = new Yonsel();
  tmdb_init();
};
 