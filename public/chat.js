document.addEventListener('DOMContentLoaded', function() {
  const socket = io();

  // Function to request permission for notifications
  function requestNotificationPermission() {
      if (Notification.permission !== 'granted') {
          Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                  console.log('Notification permission granted');
              }
          });
      }
  }

  // Call the function to request notification permission
  requestNotificationPermission();

  // Function to display a notification
  function displayNotification(title, body) {
      if (Notification.permission === 'granted') {
          new Notification(title, { body: body });
      }
  }

  const setupForm = document.getElementById('setup-form');
  const setupContainer = document.getElementById('setup-container');
  const chatContainer = document.getElementById('chat-container');
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const messages = document.getElementById('messages');
  const pfpFileInput = document.getElementById('pfp-file');
  const pfpPreview = document.getElementById('pfp-preview');
  const cropButton = document.getElementById('crop-button');
  const joinButton = document.getElementById('join-button');
  const changeUsernameButton = document.getElementById('change-username-button');
  const changePfpButton = document.getElementById('change-pfp-button');

  let username = '';
  let pfpUrl = '';
  let cropper;
  let lastUser = '';

  // Function to retrieve user information from local storage
  function retrieveUserInfo() {
      const storedUsername = localStorage.getItem('username');
      const storedPfpUrl = localStorage.getItem('pfpUrl');
      if (storedUsername && storedPfpUrl) {
          username = storedUsername;
          pfpUrl = storedPfpUrl;
          setupContainer.classList.add('hidden');
          chatContainer.classList.remove('hidden');
          socket.emit('user joined', username);
      }
  }

  // Call the function to retrieve user information
  retrieveUserInfo();

  pfpFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = function(event) {
              pfpPreview.src = event.target.result;
              pfpPreview.classList.remove('hidden');
              cropButton.classList.remove('hidden');
              joinButton.classList.add('hidden');
              if (cropper) {
                  cropper.destroy();
              }
              cropper = new Cropper(pfpPreview, {
                  aspectRatio: 1,
                  viewMode: 2,
                  movable: true,
                  zoomable: true,
                  rotatable: false,
                  scalable: false,
                  crop(event) {
                      // Can handle cropping events here if needed
                  }
              });
          };
          reader.readAsDataURL(file);
      }
  });

  cropButton.addEventListener('click', function() {
      const canvas = cropper.getCroppedCanvas({
          width: 100,
          height: 100,
      });
      pfpPreview.src = canvas.toDataURL();
      cropper.destroy();
      cropButton.classList.add('hidden');
      joinButton.classList.remove('hidden');
  });

  setupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      username = document.getElementById('username').value;

      if (username && pfpPreview.src) {
          const blob = await fetch(pfpPreview.src).then(res => res.blob());
          const formData = new FormData();
          formData.append('pfp', blob, 'pfp.png');

          const response = await fetch('/upload', {
              method: 'POST',
              body: formData
          });

          const result = await response.json();
          if (result.success) {
              pfpUrl = result.url;
              // Save username and pfpUrl in local storage
              localStorage.setItem('username', username);
              localStorage.setItem('pfpUrl', pfpUrl);
              setupContainer.classList.add('hidden');
              chatContainer.classList.remove('hidden');
              socket.emit('user joined', username);
          } else {
              alert('Failed to upload profile picture');
          }
      }
  });

  form.addEventListener('submit', function(e) {
      e.preventDefault();
      const messageText = input.value.trim();
      if (messageText) {
          const messageData = {
              username: username,
              pfpUrl: pfpUrl,
              message: messageText
          };
          socket.emit('chat message', messageData);
          input.value = '';
      }
  });

  socket.on('chat message', function(data) {
      const lastMessage = messages.lastElementChild;
      if (lastMessage && lastMessage.dataset.username === data.username) {
          // Append to the last message block
          const text = document.createElement('div');
          text.classList.add('text');
          text.textContent = data.message;
          lastMessage.querySelector('.content').appendChild(text);
      } else {
          // Create a new message block
          const item = document.createElement('div');
          item.classList.add('message');
          item.dataset.username = data.username;

          if (data.pfpUrl) {
              const img = document.createElement('img');
              img.src = data.pfpUrl;
              item.appendChild(img);
          }

          const content = document.createElement('div');
          content.classList.add('content');

          const user = document.createElement('div');
          user.classList.add('username');
          user.textContent = data.username;

          const text = document.createElement('div');
          text.classList.add('text');
          text.textContent = data.message;

          content.appendChild(user);
          content.appendChild(text);
          item.appendChild(content);
          messages.appendChild(item);
      }

      messages.scrollTop = messages.scrollHeight;
      lastUser = data.username;

      // Display a notification when a new message is received
      displayNotification('New Message', `${data.username}: ${data.message}`);
  });

  socket.on('user joined', function(username) {
      const item = document.createElement('div');
      item.classList.add('message');

      const content = document.createElement('div');
      content.classList.add('content');

      const user = document.createElement('div');
      user.classList.add('username');
      user.textContent = 'System';

      const text = document.createElement('div');
      text.classList.add('text');
      text.textContent = `${username} joined the chat!`;

      content.appendChild(user);
      content.appendChild(text);
      item.appendChild(content);
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;

      // Display a notification when a user joins the chat
      displayNotification('User Joined', `${username} joined the chat.`);
  });

  socket.on('user left', function(username) {
      const item = document.createElement('div');
      item.classList.add('message');

      const content = document.createElement('div');
      content.classList.add('content');

      const user = document.createElement('div');
      user.classList.add('username');
      user.textContent = 'System';

      const text = document.createElement('div');
      text.classList.add('text');
      text.textContent = `${username} left the chat.`;

      content.appendChild(user);
      content.appendChild(text);
      item.appendChild(content);
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;

      // Display a notification when a user leaves the chat
      displayNotification('User Left', `${username} left the chat.`);
  });

  function updatePfp(newPfpUrl) {
      pfpUrl = newPfpUrl;
      localStorage.setItem('pfpUrl', pfpUrl);
      socket.emit('pfp updated', { username: username, pfpUrl: pfpUrl });
      const userImages = document.querySelectorAll('img[data-username="' + username + '"]');
      userImages.forEach(function(img) {
          img.src = pfpUrl;
      });
  }

  changeUsernameButton.addEventListener('click', function() {
      const newUsername = prompt('Enter new username:', username);
      if (newUsername && newUsername.trim() !== '') {
          username = newUsername.trim();
          localStorage.setItem('username', username);
          socket.emit('user joined', username);
      }
  });

  changePfpButton.addEventListener('click', function() {
      pfpFileInput.click();
  });

  pfpFileInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = async function(event) {
              const blob = await fetch(event.target.result).then(res => res.blob());
              const formData = new FormData();
              formData.append('pfp', blob, 'pfp.png');

              const response = await fetch('/upload', {
                  method: 'POST',
                  body: formData
              });

              const result = await response.json();
              if (result.success) {
                  updatePfp(result.url);
              } else {
                  alert('Failed to upload profile picture');
              }
          };
          reader.readAsDataURL(file);
      }
  });

  socket.on('pfp updated', function(data) {
      const userImages = document.querySelectorAll('img[data-username="' + data.username + '"]');
      userImages.forEach(function(img) {
          img.src = data.pfpUrl;
      });
  });
});

