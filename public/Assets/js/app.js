var AppProcess = (function() {
  //42.) create an array to store my connection id (socketId) as key value pair where key is also my connection id
  var peers_connection_ids = [];

  //44.) create an array to store my connection as key value pair where key is also my connection id
  var peers_connection = [];

  //50.) Create a new Array to store my video stream in reference to my connection id
  var remote_vid_stream = [];

  //52.) Create a new Array to store my audio stream in reference to my connection id
  var remote_aud_stream = [];
  var local_div;

  // 78.) declare audio in global
  var audio;

  //79.) declare isAudioMute in global and true is defualt means in starting audio is mute
  var isAudioMute = true;

  // 38.) declare serverProcess globally to send information realted to webRTC connection to server via SDP function
  var serverProcess;

  // 81.) declare rtp_aud_senders in global space and they have source object of all socket id
  var rtp_aud_senders = [];
  var rtp_vid_senders = [];

  //83.) declare to check the status of video
  var video_states = {
    None: 0,
    Camera: 1,
    ScreenShare: 2,
  };

  //95.) declare videoCamTrack to stream MediaStreamTrack object
  var videoCamTrack;

  //83.) store none state in new variable called video_st
  var video_st = video_states.None;

  // 36.) create an _init function
  async function _init(SDP_function, my_connid) {
    //37.) store SDP function inside serverProcess variable
    serverProcess = SDP_function;
    my_connection_id = my_connid;

    //73.) after establishing connection and getting source of video and audio , its time to show it on screen hence we call eventProcess function
    eventProcess();
    local_div = document.getElementById("localVideoPlayer");
  }

  //74.) create eventProcess function
  function eventProcess() {
    //75.) ge mic icon and if we click on it
    $("#micMuteUnmute").on("click", async function() {
      //76.) if their is no audio then load Audio
      console.log("clik on mic button");
      if (!audio) {
        await loadAudio();
      }
      //77.) After loading audio if there is no audio then give him an alert
      if (!audio) {
        alert("Audio permission not granted");
        return;
      }

      //80.) see if audio is mute or not , if yes then store {enabled : true} in audio otherwise false , also change icon and update media senders
      if (isAudioMute) {
        audio.enabled = true;
        $(
          $("#micMuteUnmute").html(
            "<span class='material-icons' style = 'width:100%' >mic</span>"
          )
        );
        updateMediaSenders(audio, rtp_aud_senders);
      } else {
        audio.enabled = false;
        $(
          $("#micMuteUnmute").html(
            "<span class='material-icons' style = 'width:100%'>mic_off</span>"
          )
        );
        removeMediaSenders(rtp_aud_senders);
        audio.stop()
      }
      isAudioMute = !isAudioMute;
    });

    //81.) do same thing with video as of audio but to load audio we use videoProcess
    $("#videoCamOnOff").on("click", async function() {
      //84.) check if there is camera then stop camera
      if (video_st == video_states.Camera) {
        await videoProcess(video_states.None);
      }
      //85.) if there is no camera then start camera using videoProcess
      else {
        await videoProcess(video_states.Camera);
      }
    });

    //86.) do similar thing with screenshae as of camera
    $("#btnScreenShareOnOff").on("click", async function() {
      if (video_st == video_states.ScreenShare) {
        await videoProcess(video_states.None);
      } else {
        await videoProcess(video_states.ScreenShare);
      }
    });
  }

  //106.) create loadAudio function to get permission for audio and store AudioTrack in audio variable , here audio variable is similar to VideoCamTrack
  async function loadAudio() {
    try {
      var astream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      audio = astream.getAudioTracks()[0];
      //mute means audio.enabled is false because in 80th step , it check if it is mute then make it audio.enabled = true
      audio.enabled = false;
    } catch (e) {
      console.log(e);
    }
  }

  // 100.) check the status of connection , is it new , connecting or connected , if connection and connection.connectionState is there then return true
  function connection_status(connection) {
    if (
      connection &&
      (connection.connectionState === "new" ||
        connection.connectionState == "connecting" ||
        connection.connectionState == "connected")
    ) {
      return true;
    } else {
      return false;
    }
  }

  //98.) create updateMediaSenders function , run a loop for number of connection id and stire it inside con_id
  async function updateMediaSenders(track, rtp_senders) {
    for (var con_id in peers_connection_ids) {
      //99.) firstly check the connection status for this connection_id , send connection as an argument to connection_status with reference to connection id
      if (connection_status(peers_connection[con_id])) {
        //101.) if there is any sourceObj related to my connection id in rtp_senders array then replace that srcObject with srcObject that i have send to this function asa n argument
        if (rtp_senders[con_id] && rtp_senders[con_id].track) {
          rtp_senders[con_id].replaceTrack(track);
        }

        //102.) if there is no sourceObj related to my connection id in rtp_senders array  , then add my srcObj in this
        else {
          rtp_senders[con_id] = peers_connection[con_id].addTrack(track);
        }
      }
    }
  }

  //105.) create  removeMediaSenders function which remove srcObject associated with my connection from rtp_senders array
  function removeMediaSenders(rtp_senders) {
    for (var con_id in peers_connection_ids) {
      if (rtp_senders[con_id] && connection_status(peers_connection[con_id])) {
        peers_connection[con_id].removeTrack(rtp_senders[con_id]);
        rtp_senders[con_id] = null;
      }
    }
  }

  //104.) create removeVideoStream function and send it the array of srcObj and if i have srcObj then remove it from my UI and call a function which help me to remove the video stream from other users
  function removeVideoStream(rtp_vid_senders) {
    if (videoCamTrack) {
      videoCamTrack.stop();
      videoCamTrack = null;
      local_div.srcObject = null;
      removeMediaSenders(rtp_vid_senders);
    }
  }

  //87.) create evideoProcess function , take state of video (none , camera , screenshare ) as argument
  async function videoProcess(newVideoState) {
    //103.) if  videoState is none then remove icon and removeVideStream
    if (newVideoState == video_states.None) {
      $("#videoCamOnOff").html(
        "<span class='material-icons' style = 'width:100%'>videocam_off</span>"
      );

      $("btnScreenShareOnOff").html(
        '<span class="material-icons">present_to_all</span><div>Present Now</div>'
      );

      video_st = newVideoState;

      removeVideoStream(rtp_vid_senders);
    }
    if (newVideoState == video_states.Camera) {
      $("#videoCamOnOff").html(
        "<span class='material-icons' style = 'width:100%'>videocam_on</span>"
      );
    }

    //88.) declare a vstream variable and then state of video
    try {
      var vstream = null;
      if (newVideoState == video_states.Camera) {
        //89.) if state of video is camera then take permission to user to get video from his camera and store the video in vstream
        vstream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      }

      //90.) if state of video is screenshare then get permissin for screen and store in vsream
      else if (newVideoState == video_states.ScreenShare) {
        vstream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      }

      //108.) if screenshare is not happening then do that

      vstream.oninactive = (e) => {
        removeVideoStream(rtp_vid_senders);

        $("#btnScreenShareOnOff").html(
          '<span class="material-icons">present_to_all</span><div>Present Now</div>'
        );
      };

      //92.) firstly we need to play video in our local video player , thenn we send it to other user so they can play it
      //93.) check whether vstram is not empty and it has a video stream or not
      if (vstream && vstream.getVideoTracks().length > 0) {
        //94.) vstream.getVideoTracks()[0] returns " MediaStreamTrack {kind: 'video', id: '95f06da5-905f-46a9-b7c4-d1d62a5e446c', label: 'FaceTime HD Camera', enabled: true, muted: false, …} " => store all these information in videoCamTrack
        videoCamTrack = vstream.getVideoTracks()[0];
        console.log("videoCamtrack : ", videoCamTrack);
        if (videoCamTrack) {
          //96.) give local video player , new MediaStreamTrack obj similar to videoCamTrack
          local_div.srcObject = new MediaStream([videoCamTrack]);

          updateMediaSenders(videoCamTrack, rtp_vid_senders);
        }
      }
    } catch (e) {
      console.log(e);
      return;
    }

    // 91.) now at last change the state of the video
    video_st = newVideoState;

    // 107.) if newVideoState is .ScreenShare , means screenShare is running , then change present now to stop present now ans do similar stuff fir camera also , here i am making realtion between screenshare and camera means if i on screenshare , then what are the efeects on camera icon and vice versa
    if (newVideoState == video_states.Camera) {
      $("#videoCamOnOff").html(
        '<span class="material-icons" style="width: 100%">videocam</span>'
      );

      $("#btnScreenShareOnOff").html(
        '<span class="material-icons">present_to_all</span><div>Present Now</div>'
      );
    } else if (newVideoState == video_states.ScreenShare) {
      $("#videoCamOnOff").html(
        '<span class="material-icons" style="width: 100%">videocam_off</span>'
      );

      $("#btnScreenShareOnOff").html(
        '<span class="material-icons text-success">present_to_all</span><div class="text-success">Stop Present Now</div>'
      );
    }
  }

  // 27.) Create an ice / stun server to get my information like public ip address etc and store them into a iceConfiguration variable
  var iceConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
    ],
  };

  //26.) getting my connectionId (socketId) from the server via MyApp function
  function setConnection(connid) {
    //27.) create an RTCPeerConnection using my information from iceConfiguration
    var connection = new RTCPeerConnection(iceConfiguration);
    // ( RTCPeerconnection => a built in javascript object use for real time communication between browsers , help in  data transfer and it has lots of properties to use like onnegotiationneeded , onicecandidate etc)

    //28.) create connection.onnegotiationneeded which is an event handler when a new user came and he want to exchange local description to others , in simple words start negotiation to other user that i want to make a connection with you so this is my info send me yours
    connection.onnegotiationneeded = async function() {
      //29.) create an setOffer function to create an offer , so i can send my local description to server via SDP function
      await setOffer(connid);
    };

    //30.) create connection.onicecandidate ,  suppose if negotiaition done , means we exchange our information now it's time make a connection , before making connection we need to find how to find the path to make connection so this can be done by connection.onicecandidate
    connection.onicecandidate = async function(e) {
      //31.) if i get info (like ip address) then run the code inside if statement
      if (e.candidate) {
        //32.) send the information (ip address) and connection id to the serverProcess function (SDP function) , we need to send this information to the my server via myapp function
        serverProcess(JSON.stringify({ icecandidate: e.candidate }), connid);
      }
    };

    //39.) create connection.ontrack , which fired when a user able to send media , its event provide me the information (video or audio , resolution) about the media
    connection.ontrack = function(event) {
      //49.) if i haave no video stream associated with my connection id in remote_vid_stream array then start a new MediaStream for that connection id , here everyhting is about me , i am working with everything that is associated with my id
      if (!remote_vid_stream[connid]) {
        // means if there is connection with this connid then make a connection and share each information
        remote_vid_stream[connid] = new MediaStream();
      }

      //51.) if i have no audio stream associated with my connection id in remote_aud_stream array then start a new MediaStream for that connection id
      if (!remote_aud_stream[connid]) {
        remote_aud_stream[connid] = new MediaStream();
      }

      //53.) if i am to send a media of kind video then run the code inside this statement
      if (event.track.kind == "video") {
        //54.) if i recieving a track , firstly i need to remove the track from mediaStream, MediaStream..getVideoTracks() returns an array of video Tracks contained in media stream , then remove all these tracks fromm mediastream
        remote_vid_stream[connid]
          .getVideoTracks()
          .forEach((t) => remote_vid_stream[connid].removeTrack(t));

        console.log("remote_vid_stream : ", remote_vid_stream[connid]);

        //55.) now store track i am recieving in mediaStream (remote_vid_stream[connid]) , i can use this " remote_vid_stream[connid] " as a source for my video tag
        remote_vid_stream[connid].addTrack(event.track);

        //56.) add source of object in my video tag
        var remoteVideoPlayer = document.getElementById("v_" + connid);
        remoteVideoPlayer.srcObject = null;
        remoteVideoPlayer.srcObject = remote_vid_stream[connid];
        remoteVideoPlayer.load();
      }

      //57.) suppose if i am sending a audio track
      else if ((event.track.kind = "audio")) {
        remote_aud_stream[connid]
          .getAudioTracks()
          .forEach((t) => remote_aud_stream[connid].removeTrack(t));
        remote_aud_stream[connid].addTrack(event.track);
        var remoteAudioPlayer = document.getElementById("a_" + connid);
        remoteAudioPlayer.srcObject = null;
        remoteAudioPlayer.srcObject = remote_aud_stream[connid];
        remoteAudioPlayer.load();
      }
    };

    // 41.) store my connection_id inside Array with a key and value are my connection id
    peers_connection_ids[connid] = connid;

    // 43.) store connection object (webRTC connection) inside Array with a key as my connection id
    peers_connection[connid] = connection;

    //97.) now if state is update then updatemedia secders for all other user also , it takes 2 argument one is my srcObject (videoCamTrack) and array of other user srcObject
    if (
      video_st === video_states.Camera ||
      video_st === video_states.ScreenShare
    ) {
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack, rtp_vid_senders);
      }
    }

    // 58.) return the connection , everything we have done so far is based on sender percpective after this we see reciever percpective
    return connection;
  }

  //40.) create setOffer function which have my socket.id
  async function setOffer(connid) {
    //45.) accessing my connection (webRTC connection) object from peers_connection array using  my connection_id
    var connection = peers_connection[connid];

    //46.) create an offer using my connection object , createOffer() => means create offer in which tell other user that i am ready to give these information then i send this offer to other user and he send me his offer if we both accept then our webRTC communication start
    var offer = await connection.createOffer();

    //47.) i store my offer inside localDescription
    await connection.setLocalDescription(offer);

    //48.) Sending my connid and  my offer from local description to server via SDP function
    serverProcess(
      JSON.stringify({
        offer: connection.localDescription,
      }),
      connid
    );
  }

  //61.) creatinng SDPProcess function having data (user information) and socket.id
  async function SDPProcess(message, from_connid) {
    //62.) parse the message
    message = JSON.parse(message);

    //63.) if it is answer to my offer , then store RTCSessionDescription(message.answer) in remoteDescription
    if (message.answer) {
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    }

    //64.) if message have an offer
    else if (message.offer) {
      //65.) firstly i check the user sending me message , is this guy is in my peer_connection array or not , if it is not then i add it
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }

      // 67.) store RTCSessionDescription(message.offer) in remote description
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );

      //66.) if it is in array , then i give him a answer ,so create an answer and store answwer in localdescription and send it to server and also send the connection id who send me offer
      var answer = await peers_connection[from_connid].createAnswer();
      await peers_connection[from_connid].setLocalDescription(answer);
      serverProcess(
        JSON.stringify({
          // sending offer to other user so they can find my pc
          answer: answer,
        }),
        from_connid
      );
    }

    //68.) if the message contain icecandidate information
    else if (message.icecandidate) {
      //69.) declare a connection id variable in peers_connection array
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }

      //70.) store it ice candidate informaion reference to its connection id in peers_connection
      try {
        await peers_connection[from_connid].addIceCandidate(
          message.icecandidate
        );
      } catch (e) {
        console.log(e);
      }
    }
  }

  //115.) created a closeConnection function , firstly remove him from  peers_connection_id array and close connection for that connID and also remove him from peers_connection array , stop video and audio track associated with this connection and also remove those track from arrays remote_aud_stream and remote_video_stream
  async function closeConnection(connid) {
    console.log("user disconnected : ", connid);
    peers_connection_ids[connid] = null;

    if (peers_connection[connid]) {
      peers_connection[connid].close();
      peers_connection[connid] = null;
    }

    if (remote_aud_stream[connid]) {
      remote_aud_stream[connid].getTracks().forEach((t) => {
        if (t.stop) t.stop();
      });
      remote_aud_stream[connid] = null;
    }
    if (remote_vid_stream[connid]) {
      remote_vid_stream[connid].getTracks().forEach((t) => {
        if (t.stop) t.stop();
      });
      remote_vid_stream[connid] = null;
    }
  }

  console.log("peer connection id: ", peers_connection_ids);

  return {
    //25.) sending my connection_id (socket_id) from setNewConnection to setConnection , it is just basically like a gateway (important) , i can't use setNewConnection directly
    setNewConnection: async function(connid) {
      await setConnection(connid);
    },

    //33.) creating a init function which get 2 parameters (my connection id and SDP_function (server Process)) from myapp function
    init: async function(SDP_function, my_connid) {
      await _init(SDP_function, my_connid);
    },

    //61.) recieving other users detail from SDP function from server to appProcess via myApp and send to SDPProcess function
    processClientFunc: async function(data, from_connid) {
      await SDPProcess(data, from_connid);
    },

    //  114.) recieving data from MyApp of user whose connection need to be disconnect with other user
    closeConnectionCall: async function(connid) {
      await closeConnection(connid);
    },
  };
})();

var MyApp = (function() {
  // 16.) declare these 2 variable to store uid and mid globally
  var user_id = "";
  var meetingid = "";

  // 5.) passing userid (username) and meeting id from _init to init
  function init(uid, mid) {
    // 6.) inside init , we store userid (username) and meeting id to global variable => user_id and meetingid

    user_id = uid;
    meetingid = mid;
    $("#meetingContainer").show();
    $("#me h2").text(user_id + "(Me)");
    document.title = user_id;

    // 11.) calling a function which stores client socket

    event_process_for_signaling_server();

    //117.) callng a function to handle message processing

    eventHandeling();

    // to write url in meetig details
    var url = window.location.href;
    $(".meeting_url").text(url);
  }

  // 14.) create a global variable to store socket-client so i can use it anywhere
  var socket = null;

  // 12.) creating a function which store a client socket inside it

  function event_process_for_signaling_server() {
    // 13.) start the client side socket
    socket = io.connect("https://video-discussion.netlify.app");

    // 35.) Create an sdp function to send data (my public ip address) and my connection to server via "SDP Process" event
    var SDP_function = function(data, to_connid) {
      socket.emit("SDPProcess", {
        message: data,
        to_connid: to_connid,
      });
      console.log("connection :", to_connid);
    };

    // 15.)  socket.on, on the other hand, is used to listen to events sent from a specific client to the server. create a socket.on event
    socket.on("connect", () => {
      if (socket.connected) {
        // 34.) sending SDP function (made to get info related to webRTC from AppProcess via serverProcess ) and my socket id to the appProcess via init function
        AppProcess.init(SDP_function, socket.id);

        // 17.)  if user_id and meeting_id is not empty then send displayName(user_id) and meetingId to server using "userconnect" event
        if (user_id != "" && meetingid != "") {
          // emit is send method for socket
          socket.emit("userconnect", {
            displayName: user_id,
            meetingid: meetingid,
          });
        }
      }
    });
    // 21.) other_user recieve my user_id and connection id from the event "inform_others_about_me" and Now they can use my data to do whatever they want to do
    socket.on("inform_others_about_me", (data) => {
      // 22.) They send my information addUser function to make a new layout of web conferencing because i have joined

      //123.) sending userNumber to addUser to add number of participant on ui
      addUser(data.other_user_id, data.connId, data.userNumber);

      // 24.) sending my connection_id to AppProcess.setNewConnection to make a webRTC connection between me and other User
      AppProcess.setNewConnection(data.connId);
    });

    socket.on("HandRaise_info_for_others",(data)=>{
      console.log("hands : ", data.handRaise )
           if(data.handRaise){
            $("#hand_"+data.connId).show()
           }
           else{
            $("#hand_"+data.connId).hide()
           }
    })

    //113.) all other user getting connection_id of user who disconnected call , firstly remove this user video div from other user ui
    socket.on("inform_other_about_diconnected_user", (data) => {
      $("#" + data.connId).remove();

      //128.) change ui of number of participant and list of participant after user disconnect
      $(".participant-count").text(data.uNumber);
      $("#participant_" + data.connId + "").remove();

      console.log("user disconnected : ", data.connId);

      // agter updating ui , we cloase webRTC connection with this user and here we are sending ddetails to AppProcess function to disconnect connection
      AppProcess.closeConnectionCall(data.connId);
    });

    socket.on("ShowFileMessage", (data) => {
      var time = new Date();
      var ltime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
      var attachFileAreaForOther = document.querySelector(".show-attach-file");

      attachFileAreaForOther.innerHTML +=
        "<div class='left-align' style='display: flex; align-items:center;'> <img src='public/Assets/images/other.jpg' style='height: 40px; width: 40px;' class='caller-image circle' /> <div style='font-weight: 600; margin:0 5px;'>" +
        data.username +
        "</div>:<div>><a style='color: #007bff;' href='" +
        data.filePath +
        "' download>" +
        data.fileName +
        "</a></div> </div><br />";
    });

    //72.) receving  other_usrs array from the event "inform_others_about_me" , i made webRTC connection with all of them and create UI using addUser
    socket.on("inform_me_about_other_user", (other_users) => {
      //124.) adding number of users , i have already send it to addUser in inform_others_about_me but in this , other users ui changed , but to change my ui i also need to send to addUser in inform_me_about_other_user
      var userNumber = other_users.length;
      var userNumb = userNumber + 1; // i add myself in this counting

      if (other_users) {
        for (var i = 0; i < other_users.length; i++) {
          addUser(
            other_users[i].user_id,
            other_users[i].connectionId,
            userNumb
          );
          AppProcess.setNewConnection(other_users[i].connectionId);
        }
      }
    });

    // 60.) recieving every user data and user socket id coming from server and sending it to webRTC
    socket.on("SDPProcess", async function(data) {
      await AppProcess.processClientFunc(data.message, data.from_connid);
    });

    // 121.) when other user send message to server , server send this message to all other users in the chat , now after receiving message from server , what will we do? => we see this here

    socket.on("ShowChatMessage", (data) => {
      var time = new Date();
      var lTime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      var div = $("<div>").html(
        "<span class='font-weight-bold mr-3' style='color:black'>" +
          data.from +
          "</span>" +
          lTime +
          "</br>" +
          data.message
      );

      $("#messages").append(div);
    });
  }

  //118.) creating eventHandeling() function , getting input and btnsend from html

  function eventHandeling() {

    var handRaise = false ;

    $("#handRaiseAction").on("click",function(){
      if(!handRaise){
        // to show handRaise to me
          $("img.handRaise").show();
          handRaise = true;

          // telling other user that i have raise my hand
          socket.emit("sendHandRaise",handRaise);
      }
      else{
        $("img.handRaise").hide();
        handRaise = false;
        socket.emit("sendHandRaise",handRaise);
      }
    })

    //119.) when we click on send button , w send message to server via sendMessage amd after sending value to server , make input box null
    $("#btnsend").on("click", function() {
      var msgData = $("#msgBox").val();

      socket.emit("sendMessage", msgData);

      var time = new Date();
      var lTime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      var div = $("<div>").html(
        "<span class='font-weight-bold mr-3' style='color:black'>" +
          user_id +
          "</span>" +
          lTime +
          "</br>" +
          msgData
      );

      $("#messages").append(div);

      $("#msgBox").val("");
    });

    $("#divUsers video").dblclick(function() {
      console.log("hello");
      this.requestFullscreen(); // take complete screen
    });
  }

  // 23.) my addUser function takes my UserId and connectionId (socketId) to change layout of their web conferencing
  function addUser(other_user_id, connId, userNum) {
    var newDivId = $("#otherTemplate").clone();
    newDivId = newDivId.attr("id", connId).addClass("other");
    newDivId.find("h2").text(other_user_id);
    newDivId.find("video").attr("id", "v_" + connId);
    newDivId.find("audio").attr("id", "a_" + connId);
    newDivId.find("img").attr("id", "hand_" + connId);
    newDivId.show();
    $("#divUsers").append(newDivId);

    //125.) make user tmeplate to add in participant list (use textfixer ro remove spaces)

    $(".in-call-wrap-up").append(
      ' <div class="in-call-wrap d-flex justify-content-between align-items-center mb-3" id="participant_' +
        connId +
        '"> <div class="participant-img-name-wrap display-center cursor-pointer"> <div class="participant-img"> <img src="public/Assets/images/other.jpg" alt="participant_image" class="border border-secondary" style="height: 40px; width:40px; border-radius:50%;"/> </div> <div class="participant-name ml-2">' +
        other_user_id +
        '</div> </div> <div class="participant-action-wrap display-center"> <div class="participant-action-dot display-center mr-2 cursor-pointer"> <span class="material-icons">more_vert</span> </div> <div class="participant-action-dot display-center mr-2 cursor-pointer"> <span class="material-icons">push_pin</span> </div> </div> </div>'
    );

    //126.) to add number of participant in ui
    $(".participant-count").text(userNum);
  }

  // 122.) adding functionality of seeing participant or chat on clicking button
  $(document).on("click", ".people-heading", function() {
    $(".in-call-wrap-up").show(300);
    $(".chat-show-wrap").hide(300);
    $(this).addClass("active");
    $(".chat-heading").removeClass("active");
  });
  $(document).on("click", ".chat-heading", function() {
    $(".in-call-wrap-up").hide(300);
    $(".chat-show-wrap").show(300);
    $(this).addClass("active");
    $(".people-heading").removeClass("active");
  });
  $(document).on("click", ".meeting-heading-cross", function() {
    $(".g-right-details-wrap").hide(300);
  });
  $(document).on("click", ".top-left-participant-wrap", function() {
    $(".g-right-details-wrap").show(300);
    $(".in-call-wrap-up").show(300);
    $(".chat-show-wrap").hide(300);
    $(".people-heading").addClass("active");
    $(".chat-heading").removeClass("active");
  });
  $(document).on("click", ".top-left-chat-wrap", function() {
    $(".g-right-details-wrap").show(300);
    $(".in-call-wrap-up").hide(300);
    $(".chat-show-wrap").show(300);
    $(".chat-heading").addClass("active");
    $(".people-heading").removeClass("active");
  });
  $(document).on("click", ".end-call-wrap", function() {
    $(".top-box-show")
      .css({
        display: "block",
      })
      .html(
        '<div class="top-box align-vertical-miidle profile-dialogue-show"> <h4 class="mt-2" style="text-align:center; color:white;">Leave Meeting</h4><hr> <div class="call-leave-cancel-action d-flex justify-content-center align-items-center w-100"> <a href= "/action.html"> <button class="call-leave-action btn-danger mr-5 "> Leave </button> </a> <button class="call-cancel-action btn-secondary btn"> Cancel </button> </div> </div>'
      );
  });
  $(document).on("click", ".call-cancel-action", function() {
    $(".top-box-show").html("");
  });

  // if we click outside leave container , it need to desappeared
  $(document).mouseup(function(e) {
    var container = new Array();

    container.push(".top-box-show");

    // e.target returns me element on which i click
    // value is .top-box-show and i check if element on which i click , is inside top-box-show or not

    $.each(container, function(key, value) {
      // this means the element i have clicked is not inside top-box-show and is not top-box-show then disappeear leave container
      if (!$(value).is(e.target) && $(value).has(e.target).length == 0) {
        $(value).empty();
      }
    });
  });

  $(document).on("click", ".meeting-details-button", function() {
    $(".g-details").toggle(300);
  });

  $(document).on("click", ".copy_info", function() {
    // here we create a temporary inpt element in which we store url vlaue
    var $temp = $("<input>");
    $("body").append($temp);

    // select the input is omportant otherwise execCommand doent able to know what to copy
    $temp.val($(".meeting_url").text()).select();

    // this command usee to copy text that i have selected
    document.execCommand("copy");
    $temp.remove();

    $(".link-conf").show();
    setTimeout(() => {
      $(".link-conf").hide();
    }, 2000);
  });

  $(document).on("click", ".g-details-heading-attachment", function() {
    $(".g-details-heading-show").hide(200);
    $(".g-details-heading-show-attachment").show(200);
    $(this).addClass("active");
    $(".g-details-heading-detail").removeClass("active");
  });
  $(document).on("click", ".g-details-heading-detail", function() {
    $(".g-details-heading-show").show(200);
    $(".g-details-heading-show-attachment").hide(200);
    $(this).addClass("active");
    $(".g-details-heading-attachment").removeClass("active");
  });

  // if we click outside meeting-detail , it need to desappeared
  $(document).mouseup(function(e) {
    var container = new Array();

    container.push(".g-details");

    $.each(container, function(key, value) {
      if (
        !$(value).is(e.target) &&
        $(value).has(e.target).length == 0 &&
        !$(".bottom-left").is(e.target) &&
        $(".bottom-left").has(e.target).length == 0
      ) {
        $(value).hide(300);
      }
    });
  });
  // for meeting container
  $(document).mouseup(function(e) {
    var container = new Array();

    container.push(".g-right-details-wrap");

    $.each(container, function(key, value) {
      if (!$(value).is(e.target) && $(value).has(e.target).length == 0 &&
          !$(".handRaiseAction").is(e.target) && $(".handRaiseAction").has(e.target).length == 0 ) {
        $(value).hide(300);
      }
    });
  });

  // file sharing
  var base_url = window.location.origin; //window.location is a built-in JavaScript object that represents the current URL of the web page.

  // i used this to get name of file on input ehwn i uplaoad a file
  $(document).on("change", ".custom-file-input", function() {
    var fileName = $(this)
      .val()
      .split("//")
      .pop();
    $(this)
      .siblings(".custom-file-label")
      .addClass("selected")
      .html(fileName);
    console.log(fileName);
  });
  $(document).on("click", ".share-attach", function(e) {
    //   e.preventDefault();
    //  var att_img = $("#customFile").prop("files")[0];
    // input type file have a property named 'files' , and it is an array and we access its first value

    //FormData is a built-in JavaScript object that provides a way to construct key/value pairs that represent form fields and their values, which can be sent with an HTTP request.
    //you might use formData.append('username', 'john') to add a new key/value pair to the form data where the key is username and the value is john.
    //with the help of formData , i am sending my file , isername and meeting id to server

    //  console.log("attached_image : ",att_img)

    //  const data = {
    //   zipfile:att_img,
    //   meeting_id:meetingid,
    //   username:user_id,
    //  }

    // const formData =new FormData();
    // formData.append("zipfile",att_img)
    // formData.append("meeting_id",meetingid)
    // formData.append("username",user_id)

    //  console.log("data : ",formData)

    e.preventDefault();
    var att_img = $("#customFile").prop("files")[0];
    var formData = new FormData();
    formData.append("zipfile", att_img);
    formData.append("meeting_id", meetingid);
    formData.append("username", user_id);
    console.log(formData.get("username"));
    console.log(formData.get("meeting_id"));
    console.log(formData.get("zipfile"));

    //The $ajax() method in jQuery is used to make an AJAX (Asynchronous JavaScript and XML) request to a server. AJAX requests are used to send and receive data asynchronously between a web page and a server without having to reload the entire page.

    //  $.ajax({
    //   url: base_url+"/attachimg",
    //   type:"POST",
    //   data: formData,
    //   contentType: false,
    //   processData: false,
    //   success: function(res){
    //     console.log(res)
    //   },
    //   error:function(){
    //     console.log("error")
    //   }
    //  })

    console.log(base_url + "/attachimg");

    fetch(base_url + "/attachimg", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log(error);
      });

    // $.ajax({
    //   url: base_url + "/attachimg",
    //   type: "POST",
    //   data: formData,
    //   processData: false,
    //   contentType: false,
    //   success: function (response) {
    //     console.log(response);
    //   },
    //   error: function () {
    //     console.log("error");
    //   },
    //  //now i go to server to import it
    // });

    var attachFileArea = document.querySelector(".show-attach-file");
    var attachFileName = $("#customFile")
      .val()
      .split("//")
      .pop();
    var attachFilePath =
      "public/attachment/" + meetingid + "/" + attachFileName;
    attachFileArea.innerHTML +=
      " <div class='left-align' style='display: flex; align-items:center;'> <img src='public/Assets/images/other.jpg' style='height: 40px; width: 40px;' class='caller-image circle' /> <div style='font-weight: 600; margin:0 5px;'>" +
      user_id +
      "</div>:<div>><a style='color: #007bff;' href='" +
      attachFilePath +
      "' download>" +
      attachFileName +
      "</a></div> </div><br/>";
    $("label.custom-file-label").text("");

    // sending file details to server so other user can take it from here

    socket.emit("fileTransferToOther", {
      username: user_id,
      meetingid: meetingid,
      filePath: attachFilePath,
      fileName: attachFileName,
    });
  });

$(document).on("click",".option-icon",function(){
  $(".recording-show").toggle(300)
})
var mediaRecorder ;
var chunks = [];
$(document).on("click",".start-record",function(){
  console.log("hello recording starts")
  $(".start-record").removeClass().addClass("stop-record btn-danger text-dark").text("Stop recording")

  startRecording();
})
$(document).on("click",".stop-record",function(){
  $(".stop-record").removeClass().addClass("start-record btn-dark text-danger").text("Start recording")
   
  mediaRecorder.stop(); // by this mediaRecorder.onstop will trigger
})




async function captureScreen(mediaConstraints ={
  video:true
}){
   const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints)
   return screenStream ;
}
async function captureAudio(mediaConstraints ={
  video:false,
  audio:true
}){
   const audioStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
   return audioStream ;
}

async function startRecording(){

  // with these 2 , we take permission to get user audio and video
  const screenStream = await captureScreen();
  const audioStream = await captureAudio();

 // when our request accepted , we createda mediaStream using tracks recieving from user 
 const stream =  new MediaStream([...screenStream.getTracks(), ...audioStream.getTracks()])

 // store that mediaStream in a new variable called MediaRecorder

 mediaRecorder = new MediaRecorder(stream);
 mediaRecorder.start()
 mediaRecorder.onstop = function(e){

  var clipName = prompt("Enter name of your recording")

  // when we stop recieving data (stop recording) , we create a downloadable link here to download recording 
  stream.getTracks().forEach(track => track.stop);

  //The Blob object in JavaScript represents an immutable, raw data blob. It can store binary data, such as images or audio, and text data in various formats. 
  const blob = new Blob(chunks , {
    type: 'video/webm',

  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = clipName + ".webm";
  document.body.appendChild(a)
  a.click();
  setTimeout(()=>{
   document.body.removeChild(a)
   window.URL.revokeObjectURL(url)
  },100)

 }

// when we start recieving data we can store those data in an array called chunks 
 mediaRecorder.ondataavailable = function(e){
  chunks.push(e.data);
 }

}


  return {
    _init: function(uid, mid) {
      // 4.) recieve userid (username) and meetingid from index.html
      init(uid, mid);
    },
  };
})();

// MyApp function is just for connection between server and client
// appProcess function is used for webRTC connection
// if i need information from approcess , send it a function
