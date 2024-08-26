const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io'); 
const ACTIONS = require('./Actions');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://codesync-uwtb.onrender.com/",  // Replace with your actual frontend URL
        methods: ["GET", "POST"],
        credentials: true,
    }
});

// app.use(express.static('build'));
// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

//-----Deployement-------

app.use(express.static(path.join(__dirname,'/client/build')));
app.get("*",(req,res)=>{
    res.sendFile(path.resolve(__dirname,"client","build","index.html"),(err)=>{
        res.status(500).send(err)
    });
})

//----Deployement------

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {   //ye event trigger ho jati hai jaise hi koi socket server ko connect ho jata hai
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, { //notify kr rhe sbko
                clients, //clients list
                username,  
                socketId: socket.id,
            });
        });
    });

    //editor me jo changes wale part
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    //disconnectiong part
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];  //to get all rooms
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

// if(process.env.NODE_ENV==="production"){
//     app.get("*",(req,res)=>{
//         app.use(express.static(staticPath));
//         const indexFile=path.join(__dirname,"dist","index.html");
//         return res.sendFile(indexFile);
//     });
// }

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
