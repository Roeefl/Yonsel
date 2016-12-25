'use strict';

/* -- Vue Components Registration -- */

Vue.component('yonsel-item', {
  props: ['item'],
  template:
    '<li>{{item.title}} <button class="heart-button mdl-button mdl-js-button mdl-js-ripple-effect mdl-color-text--black">Heart</button> <div v-for="heart in item.hearts">{{heart.user}}</div></li>'
});


/* -- Initialize vue with dummy values -- */

var app = new Vue({
  el: '#main-layout',
  chatMsg: '...',
  newEntry: '...',
  data: {
    tabState: TYPE_MOVIE,
    chatMessages: [
      // { key: '1', name: 'a', text: 't', picUrl: 'null', imageUri: 'null' }
    ],
    logEntries: [
    ],
    movies: [
    ],
    tvshows: [
    ],
    webstuff: [
    ],
    apps: [
    ]
  },

  // filters: {
  //   reverse: function(array) {
  //     return array.slice().reverse();
  //   }
  // },

  methods: {
    setTabState: function(newState) {
      this.tabState = newState;
    },
    removeChatMessage: function (index) {
      this.chatMessages.splice(index, 1);
    },
    pushYonselItem: function(type, key, title, hearts) {
      if (type == TYPE_MOVIE) {
        this.movies.push({ key: key, title: title, hearts: hearts });
      } else if (type == TYPE_TVSHOW) {
        this.tvshows.push({ key: key, title: title, hearts: hearts });
      } else if (type == TYPE_WEB) {
        this.webstuff.push({ key: key, title: title, hearts: hearts });
      } else if (type == TYPE_APP) {
        this.apps.push({ key: key, title: title, hearts: hearts });
      }
    },
    pushLogEntry: function(key, action, picUrl, datetime) {
      this.logEntries.push({ key: key, action: action, picUrl: picUrl, datetime: datetime });
    }
  }
});

/* -- Initialize App -- */

// A loading image URL.
Yonsel.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

function Yonsel() {
  this.checkSetup();

  // Shortcuts to DOM Elements.
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  this.logger = document.getElementById('logger');

  this.entryForm = document.getElementById('content-entry-form');
  this.entryInput = document.getElementById('content-entry');
  this.submitEntry = document.getElementById('submit-entry');

  $(".heart-button").click(function() {
    alert(this.id);
  });

  // Saves message on form submit.
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  // Save Entries to Firebase
  this.entryForm.addEventListener('submit', this.saveContentEntry.bind(this));

  // Toggle for the button.
  var buttonTogglingHandler = this.toggleButton.bind(this);
  this.messageInput.addEventListener('keyup', buttonTogglingHandler);
  this.messageInput.addEventListener('change', buttonTogglingHandler);

  // Toggle for the entry button.
  var entryButtonTogglingHandler = this.toggleEntryButton.bind(this);
  this.entryInput.addEventListener('keyup', entryButtonTogglingHandler);
  this.entryInput.addEventListener('change', entryButtonTogglingHandler);

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

  this.loadLog();
  this.loadContent();
};

/* -- Load Functions -- */

// Loads main data from firebase and listens for data changes
Yonsel.prototype.loadContent = function() {
  // Reference to the // database path.
  this.contentRef = this.database.ref('content');
  // Make sure we remove all previous listeners.
  this.contentRef.off();

  // Loads all data and listens for data changes.
  var setContentEntry = function(data) {
    var val = data.val();
    this.displayContentEntry(data.key, val.type, val.title, val.hearts);
  }.bind(this);

  this.contentRef.on('child_added', setContentEntry);
  this.contentRef.on('child_changed', setContentEntry);
}

// Loads main data from firebase and listens for data changes
Yonsel.prototype.loadLog = function() {
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

// Loads chat messages history and listens for upcoming ones.
Yonsel.prototype.loadMessages = function() {
  // Reference to the /messages/ database path.
  this.messagesRef = this.database.ref('messages');
  // Make sure we remove all previous listeners.
  this.messagesRef.off();

  // Loads the last 12 messages and listen for new ones.
  var setMessage = function(data) {
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  }.bind(this);
  var removeMessage = function(data) {
    //app.removeChatMessage(data.key);
  }.bind(this);

  this.messagesRef.limitToLast(12).on('child_added', setMessage);
  this.messagesRef.limitToLast(12).on('child_changed', setMessage);
  this.messagesRef.limitToLast(12).on('child_removed', removeMessage);
};

/* -- Display Functions -- */

// Displays a Message in the UI.
Yonsel.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
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

  app.chatMessages.push({ key: key, name: name, text: text, picUrl: picUrl, imageUri: imageUri });

  // Timeout is commented out for now
  /* setTimeout(function() {div.classList.add('visible')}, 1); */
};

// Displays a content entry in the UI (movies, shows, etc)
Yonsel.prototype.displayContentEntry = function(key, dataType, title, hearts) {
  app.pushYonselItem(dataType, key, title, hearts);
};

// Displays a log entry in the UI
Yonsel.prototype.displayLogEntry = function(key, action, picUrl, datetime) {
  picUrl = this.retrieveFullPath(picUrl);
  app.pushLogEntry(key, action, picUrl, datetime);
};

/* -- Save Functions -- */

// Saves a new message on the Firebase DB.
Yonsel.prototype.saveMessage = function(e) {
  e.preventDefault();

  // Check that the user entered a message and is signed in.
  if (app.chatMsg && this.checkSignedInWithMessage()) {
    var currentUser = this.auth.currentUser;
    var photoUrl = currentUser.photoURL || '/images/profile_placeholder.png';

    // Get the current chatMessage first so the Input can be cleared before waiting on firebase push
    var msgValue = app.chatMsg;

    // Clear message text field and SEND button state.
    app.chatMsg = '';
    this.toggleButton();

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

// Saves a new entry to the firebase DB
Yonsel.prototype.saveContentEntry = function(e) {
  e.preventDefault();

  // Check that the user entered a message and is signed in.
  if (app.newEntry && this.checkSignedInWithMessage()) {
    var currentUser = this.auth.currentUser;

    // Get the current entry typed first so the Input can be cleared before waiting on firebase push
    var entryValue = app.newEntry;

    // Clear entry text field and SEND button state.
    app.newEntry = '';
    this.toggleEntryButton();

    // Add a new content entry to the Firebase Database.
    this.contentRef.push({
      title: entryValue,
      type: app.tabState,
      hearts: []
    }).then(function() {
      // emitLog
      this.emitLog(ACTION_ADD, currentUser.displayName, app.tabState, entryValue);
    }.bind(this)).catch(function(error) {
      console.error('Error writing new entry to Firebase Database', error);
    });
  }
}

Yonsel.prototype.emitLog = function(actionType, username, contentType, title) {
  if (actionType == ACTION_ADD) {
    var action = (username + ' added ' + title + ' to ' + toTitleCase(contentType) + 's');
  }

  this.saveLogEntry(action);
}

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

/* -- Helper Functions -- */

/* Transforms a string into Title Case */
function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}

// Enables or disables the submit button depending on the values of the input
// fields.
Yonsel.prototype.toggleButton = function() {
  if (app.chatMsg) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

// Enables or disables the submit button depending on the values of the input fields
Yonsel.prototype.toggleEntryButton = function() {
  if (app.newEntry) {
    this.submitEntry.removeAttribute('disabled');
  } else {
    this.submitEntry.setAttribute('disabled', 'true');
  }
};

// Update scrolling in chat after messages have finished loading
Yonsel.prototype.chatScrollTop = function() {
  this.messageList.scrollTop = this.messageList.scrollHeight;
  // this.messageInput.focus();
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
    this.loadMessages();
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

/* -- Window -- */

window.onload = function() {
  window.yonsel = new Yonsel();
};
 