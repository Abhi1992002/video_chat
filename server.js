//  7.) build a express basic server

const express = require("express");
const fs = require("fs");
const fileUpload = require("express-fileupload")
const path = require("path");
require("dotenv").config()
const app = express();

app.use(cors({
  origin: 'https://video-discussion.netlify.app'
}));
const port = process.env.PORT || 3005
var server = app.listen(port, () => {
    console.log(`listening to port ${port}`);
  });



//  8.) create a socket server on express
const { Server } = require("socket.io");

const io = new Server(server, {
    allowEIO3: true, // false by default
  });


// 9.) create a app.use to allow my server to use static files like image , html css and javascript , he needs the directory path from where you want to run static file
app.use(express.static(path.join(__dirname, "")));

var userConnection = [];

// 10.)  create a io.on connection => io.on is used to listen to events sent from all connected clients to the server.
io.on("connection", (socket) => {
  console.log("socket id is", socket.id);

  // 17.) recieving user_id and meeting_id from user using "userconnect event"
  socket.on("userconnect", (data) => {

    console.log("userconnect", data.displayName, data.meetingid);
  
  // 19.) I stored all user data in userConnection , now i need to seperate all those user who want to join a particular meeting , suppose i came to join a meeting and i give a meeting id , firstly it store all the users in userConnection including me , after storing it check my meeting_id and check other users meeting_id , suppose there are 10 users more whose meeting_id is same as of me then he store all of us in other_user container  
    var other_users = userConnection.filter(
      (p) => p.meetingid === data.meetingid
    );

  // 18.) storing user_id , meeting_id and socket_id inside a globally created array "userConnection" 
    userConnection.push({
      connectionId: socket.id,
      user_id: data.displayName,
      meetingid: data.meetingid,
    });

//123.) created a userCount variable to add number of participant in my ui and send it to MyApp via inform_others_about_me socket    
var userCount = userConnection.length;
console.log("Number of user : " , userCount);

  // 19.) Now it is time to tell other users that i have joined a your room
    other_users.forEach((v) => {
      // 20.) to is used to send information to a specific id , in this case special id is connection id of all user in that room and give them my other_user_id ( my user_id) and connection id (socket.id)
      socket.to(v.connectionId).emit("inform_others_about_me", {
        other_user_id: data.displayName,
        connId: socket.id,
        // these are the information i have to all user
        userNumber:userCount
      });
    });

    // 71.) other user know that i have come to meet and  they changed thier UI but now i inform myself about other user so ica change my ui so i send otherusers array to inform_me_about_other_user event , if other user enter meet i know it by this event
    socket.emit("inform_me_about_other_user", other_users);
  });

// 59.) recieving SDP function and socket id from client side and send message and socketId to .to_connid (these are all user who send me data)
  socket.on("SDPProcess", (data) => {
 

     socket.to(data.to_connid).emit("SDPProcess", {
      message: data.message,
      from_connid: socket.id
     
    });

    console.log("socketID : " ,socket.id , "connection _id " , data.to_connid )
    // suppose their are 10 users so thier are 10 socket ids
  });

  ///120.) receive message from myApp , firstly find user who send message by matching the socket.id with userConnection array's connectionId , list have only those users who is in current meeting (by checking their meeting id) and then sending messaage to all other user
  
  socket.on("sendMessage",(msg)=>{
        console.log(msg)

      var mUser = userConnection.find((p)=> p.connectionId == socket.id)

      if(mUser){
        var meetingid = mUser.meeting_id
        var from = mUser.user_id;
        var list = userConnection.filter((p)=> p.meeting_id == meetingid )

        list.forEach((v)=>{
          socket.to(v.connectionId).emit("ShowChatMessage",{
            from : from,
            message:msg
          })
        })
      }
  })

  // recieving file sharing data from user
  socket.on("fileTransferToOther",(msg)=>{
    console.log("message : " , msg)

    var mUser = userConnection.find((p)=> p.connectionId == socket.id)

    if(mUser){
      var meetingid = mUser.meeting_id
      var from = mUser.user_id;
      var list = userConnection.filter((p)=> p.meeting_id == meetingid )

      list.forEach((v)=>{
        socket.to(v.connectionId).emit("ShowFileMessage",{
         username : msg.username ,
         meetingid :  msg.meetingid, 
         filePath : msg.filePath,  
         fileName : msg.fileName  
        })
      })
    }
  })
  socket.on("sendHandRaise",(data)=>{

    console.log("hand : ", data)
    var sendInfo = userConnection.find((p)=> p.connectionId == socket.id)

    if(sendInfo){
      var meetingid = sendInfo.meeting_id
      var list = userConnection.filter((p)=> p.meeting_id == meetingid )

      list.forEach((v)=>{
        socket.to(v.connectionId).emit("HandRaise_info_for_others",{
          connId : socket.id,
          handRaise : data
        })
      })
    }
  })


  //109.) suppose if a user diconnect from website , then other user user should know that he leaves it and he change his iser inteface 

  socket.on("disconnect", () =>{
    console.log("Disconnected")

  //110.) when user disconnected , we see all users in userConnection array and check when all user join , they have their socket id and we check if user socket id is equal to socket id at the time of disconnect , then we store all details of that user in disuser  
    var disuser = userConnection.find((p) => p.connectionId === socket.id)
    if(disuser){
      var meetingid = disuser.meeting_id;

     //111.) we correct userConnection array by storing only all those users whose socket id is not equal to disconnect user id
     userConnection = userConnection.filter(p => p.connectionId != socket.id)

     ///112.) now time to tell all other user then this user disconnected , so we created a list in which their are user who leaves meeting and innform all the user who has connectionId equal to disconnected user (means they are in the same connection)

     var list = userConnection.filter(p => p.meeting_id === meetingid)

     list.forEach(v => {
      //127.) we have added number of users in participation but if if we disconnect , our number of paricipant doesn't change in ui , so we send him number of user in list

     var userNumberAfUserLeave =  userConnection.length; // user after leaving connection
      socket.to(v.connectionId).emit("inform_other_about_diconnected_user",{
        connId : socket.id,
        uNumber : userNumberAfUserLeave
      })
     })
    }
  })

});

// when we load index.html => express tells the server that a connection is established => then socket fires connection event on server side => in mean time client side socket also run (app.js)

//getting formData

app.use(fileUpload());

app.post("/attachimg", function(req, res){
  var data = req.body;
  var imageFile = req.files.zipfile
  console.log("image-file",imageFile)

  // here we save all attached files, we add file in a folder named public and inside it we create a folder with meeting id and inside that we store image , for different meeting => different folder
  var dir = "public/attachment/"+data.meeting_id+"/";

  // if this folfer , doesnot exist then create one
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir)
  }

// now sending data from user to server , mv=>move , The mv method is used to move the uploaded file to a specified directory on the server.
  imageFile.mv("public/attachment/"+data.meeting_id+"/"+imageFile.name,function(err){
    if(err){
      console.log("couldn't upload the image file : error ", err)
    }
   else{
    console.log("'image succesfully uploaded")
   }
  })

  
})